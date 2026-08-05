-- Enable realtime broadcasts for leads so the dashboard updates live when a
-- kiosk sign-in (or another device) creates/changes a lead. Postgres Changes
-- respects the existing RLS SELECT policy (agent_id = auth.uid()), so each
-- agent only ever receives events for their own leads -- no new policy needed.

alter publication supabase_realtime add table public.leads;
