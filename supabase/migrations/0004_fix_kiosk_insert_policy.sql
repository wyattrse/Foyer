-- Fix: the anon kiosk-insert policy's WITH CHECK referenced `agents` and
-- `listings` via raw correlated subqueries. Two problems:
--   1. The listings subquery had a copy-paste bug: `l.agent_id = agent_id`
--      resolved to `l.agent_id = l.agent_id` (self-referential, always true)
--      because the bare `agent_id` inside `FROM listings l` resolved to
--      listings' own column instead of the outer leads row's column.
--   2. More fundamentally, subqueries inside an RLS policy are themselves
--      subject to the referenced table's RLS for the CURRENT role -- and
--      `anon` has zero visibility into `agents` or `listings`, so these
--      EXISTS checks could never reliably pass for the anon role.
--
-- Fix: a SECURITY DEFINER helper function that checks both conditions with
-- elevated privileges (bypassing agents/listings RLS) but only ever returns
-- a boolean -- no row data is exposed either way.

create or replace function public.kiosk_lead_target_valid(p_agent_id uuid, p_listing_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.agents a where a.id = p_agent_id)
    and (
      p_listing_id is null
      or exists (select 1 from public.listings l where l.id = p_listing_id and l.agent_id = p_agent_id)
    );
$$;

grant execute on function public.kiosk_lead_target_valid(uuid, uuid) to anon, authenticated;

drop policy "kiosk insert-only new leads" on public.leads;

create policy "kiosk insert-only new leads" on public.leads
  for insert to anon
  with check (
    public.kiosk_lead_target_valid(agent_id, listing_id)
    and stage = 'New'
    and manual_score is null
    and deal_value is null
    and deleted_at is null
  );
