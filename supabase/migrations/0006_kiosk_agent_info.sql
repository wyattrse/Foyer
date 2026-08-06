-- Narrow, explicitly-public view so the kiosk sign-in can show whose open
-- house this is. Same pattern as kiosk_listings: bypasses agents' RLS on
-- purpose, but only exposes name/brokerage -- nothing else.
create view public.kiosk_agent_info as
select id, name, brokerage
from public.agents;

grant select on public.kiosk_agent_info to anon;
