-- Fix: leads.sort_order was `int` (4-byte, max ~2.1 billion), but the
-- before-insert trigger seeds it with an epoch-milliseconds value (~1.7
-- trillion) to mirror the prototype's `order: Date.now()`. That overflows
-- int4 immediately on every insert. Widen to bigint.
--
-- leads_with_status depends on the column's type (it does `select l.*`), so
-- it has to be dropped before the ALTER and recreated after.

drop view public.leads_with_status;

alter table public.leads alter column sort_order type bigint;

create or replace function public.leads_before_insert_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.auto_score := public.compute_auto_score(new.timeline, new.has_agent, new.source);

  if new.sort_order is null then
    new.sort_order := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  end if;

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
