-- Foyer schema + RLS + server-side scoring/duplicate logic
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).

create extension if not exists pgcrypto;

-- ============================================================================
-- TABLES
-- ============================================================================

create table public.agents (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  brokerage text,
  brokerage_id uuid,               -- FK added once a `brokerages` table exists
  role text not null default 'agent' check (role in ('agent', 'admin')),
  commission_split numeric not null default 70,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  source text not null check (source in ('Open House', 'Referral', 'Inquiry', 'Business Card', 'Other')),
  timeline text not null check (timeline in ('immediate', '1-3', '3-6', '6plus', 'browsing')),
  has_agent text not null check (has_agent in ('no', 'unsure', 'yes')),
  notes text,
  stage text not null default 'New' check (stage in ('New', 'Contacted', 'Nurturing', 'Showing', 'Under Contract', 'Closed', 'Lost')),
  auto_score int not null default 10,
  manual_score int check (manual_score is null or (manual_score between 0 and 100)),
  deal_value numeric,
  sort_order int,
  deleted_at timestamptz,
  possible_duplicate_of uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now()
);

create index leads_agent_active_idx on public.leads(agent_id) where deleted_at is null;
create index leads_agent_stage_idx on public.leads(agent_id, stage) where deleted_at is null;
create index leads_agent_source_idx on public.leads(agent_id, source) where deleted_at is null;

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index interactions_lead_id_idx on public.interactions(lead_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,  -- null = shared/system default
  title text not null,
  body text not null
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.agents enable row level security;
alter table public.leads enable row level security;
alter table public.interactions enable row level security;
alter table public.tasks enable row level security;
alter table public.templates enable row level security;

-- agents: an agent can only ever see/edit their own row
create policy "agents select own row" on public.agents
  for select to authenticated using (id = auth.uid());
create policy "agents update own row" on public.agents
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "agents insert own row" on public.agents
  for insert to authenticated with check (id = auth.uid());

-- leads: normal agent-facing access
create policy "agents select own leads" on public.leads
  for select to authenticated using (agent_id = auth.uid());
create policy "agents insert own leads" on public.leads
  for insert to authenticated with check (agent_id = auth.uid());
create policy "agents update own leads" on public.leads
  for update to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());
-- deliberately no DELETE policy for anyone: leads can only ever be soft-deleted
-- (deleted_at set via UPDATE), never hard-deleted through the API.

-- leads: kiosk (anonymous) insert-only path. Zero read access, zero access to
-- any other agent's data, and can't set stage/score/deal fields beyond defaults --
-- the row is created bare and picked up by an agent later.
create policy "kiosk insert-only new leads" on public.leads
  for insert to anon
  with check (
    exists (select 1 from public.agents a where a.id = agent_id)
    and stage = 'New'
    and manual_score is null
    and deal_value is null
    and deleted_at is null
  );

-- interactions: ownership derives from the parent lead's agent_id
create policy "agents select own lead interactions" on public.interactions
  for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id and l.agent_id = auth.uid()));
create policy "agents insert own lead interactions" on public.interactions
  for insert to authenticated
  with check (exists (select 1 from public.leads l where l.id = lead_id and l.agent_id = auth.uid()));

-- tasks: simple per-agent ownership, full CRUD
create policy "agents manage own tasks" on public.tasks
  for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- templates: agent sees their own + shared (agent_id is null) templates;
-- can only write their own
create policy "agents select own or shared templates" on public.templates
  for select to authenticated using (agent_id = auth.uid() or agent_id is null);
create policy "agents insert own templates" on public.templates
  for insert to authenticated with check (agent_id = auth.uid());
create policy "agents update own templates" on public.templates
  for update to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());
create policy "agents delete own templates" on public.templates
  for delete to authenticated using (agent_id = auth.uid());

-- ============================================================================
-- SCORING + DUPLICATE DETECTION (server-side, can't drift from client)
-- ============================================================================

create or replace function public.compute_auto_score(
  p_timeline text, p_has_agent text, p_source text
) returns int
language sql
immutable
as $$
  select least(100,
    10
    + case p_timeline
        when 'immediate' then 40 when '1-3' then 30 when '3-6' then 15 when '6plus' then 5 when 'browsing' then 0
        else 10 end
    + case p_has_agent
        when 'no' then 20 when 'unsure' then 10 when 'yes' then 0
        else 10 end
    + case p_source
        when 'Open House' then 15 when 'Referral' then 20 when 'Inquiry' then 15 when 'Business Card' then 5 when 'Other' then 5
        else 5 end
  );
$$;

create or replace function public.leads_before_insert_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.auto_score := public.compute_auto_score(new.timeline, new.has_agent, new.source);

  if new.sort_order is null then
    new.sort_order := (extract(epoch from clock_timestamp()) * 1000)::int;
  end if;

  -- Duplicate check runs server-side on every insert (kiosk AND quick-add),
  -- and always overwrites whatever the client sent -- the client can't forge it.
  -- Quick Add still does its own client-side check first to show the blocking
  -- "View existing / Add as new anyway" prompt; this is the backstop for kiosk
  -- inserts, which skip that prompt entirely per the spec.
  if tg_op = 'INSERT' then
    select l.id into new.possible_duplicate_of
    from public.leads l
    where l.agent_id = new.agent_id
      and l.deleted_at is null
      and (
        (nullif(trim(lower(new.phone)), '') is not null and trim(lower(l.phone)) = trim(lower(new.phone)))
        or (nullif(trim(lower(new.email)), '') is not null and trim(lower(l.email)) = trim(lower(new.email)))
      )
    order by l.created_at asc
    limit 1;
  end if;

  return new;
end;
$$;

create trigger leads_before_insert_update
  before insert or update on public.leads
  for each row execute function public.leads_before_insert_update();

-- ============================================================================
-- NEW AGENT SIGNUP: seed agents row + default templates
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agents (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));

  insert into public.templates (agent_id, title, body) values
    (new.id, 'First touch (hot lead)', 'Hi {name}, great meeting you! Wanted to follow up while it''s fresh — happy to answer any questions about what we saw.'),
    (new.id, 'Weekly check-in', 'Hi {name}, just checking in — any new must-haves or deal-breakers since we last talked? Happy to pull fresh listings.'),
    (new.id, 'Re-engage a cold lead', 'Hi {name}, it''s been a bit — still keeping an eye out for you. Let me know if your timeline or plans have changed.');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- READ VIEW: effective score, bucket, and follow-up cadence computed live
-- (never stored, so it can't go stale -- see spec §4)
-- ============================================================================

create or replace view public.leads_with_status
with (security_invoker = true) as
select
  l.*,
  coalesce(l.manual_score, l.auto_score) as effective_score,
  case
    when coalesce(l.manual_score, l.auto_score) >= 65 then 'hot'
    when coalesce(l.manual_score, l.auto_score) >= 35 then 'warm'
    else 'cold'
  end as bucket,
  coalesce(li.last_interaction_at, l.created_at) as last_touch_at,
  coalesce(li.last_interaction_at, l.created_at) + (
    case
      when coalesce(l.manual_score, l.auto_score) >= 65 then 1
      when coalesce(l.manual_score, l.auto_score) >= 35 then 7
      else 30
    end * interval '1 day'
  ) as next_touch_due,
  (l.stage not in ('Closed', 'Lost')) as is_active
from public.leads l
left join lateral (
  select max(i.created_at) as last_interaction_at
  from public.interactions i
  where i.lead_id = l.id
) li on true
where l.deleted_at is null;
