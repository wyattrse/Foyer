-- Public-facing contact info for the agent's "scan to save my contact
-- card" QR on the kiosk page. Deliberately separate from the agent's
-- login email in auth.users -- that's never exposed to anon, and the
-- agent may want a different phone/email shown to clients than the one
-- they sign in with.

alter table public.agents add column phone text;
alter table public.agents add column email text;

-- Recreate to add the two new columns; CREATE OR REPLACE VIEW keeps the
-- view's existing grants (below is just a defensive re-grant).
create or replace view public.kiosk_agent_info as
select id, name, brokerage, phone, email
from public.agents;

grant select on public.kiosk_agent_info to anon;
