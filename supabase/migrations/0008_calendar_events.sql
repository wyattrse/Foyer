-- Calendar events, optionally linked to a lead and/or listing so the
-- Calendar can show "what this appointment is about" without duplicating
-- data. Same per-agent ownership pattern as tasks (0001_init.sql).

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  title text not null,
  notes text,
  start_at timestamptz not null,
  end_at timestamptz,
  lead_id uuid references public.leads(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  created_at timestamptz not null default now()
);

create index calendar_events_agent_start_idx on public.calendar_events(agent_id, start_at);

alter table public.calendar_events enable row level security;

create policy "agents manage own calendar events" on public.calendar_events
  for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());
