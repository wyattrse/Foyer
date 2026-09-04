-- Agent headshot + brokerage logo for the public digital business card
-- (/card/[agentId]). Unlike the private `lead-files` bucket, this one is
-- public -- the card page is unauthenticated, so images need to be
-- fetchable by plain URL with no signed-URL dance.

alter table public.agents add column photo_url text;
alter table public.agents add column logo_url text;

-- Same public-info view used by the kiosk QR -- add the two new fields.
create or replace view public.kiosk_agent_info as
select id, name, brokerage, phone, email, photo_url, logo_url
from public.agents;

grant select on public.kiosk_agent_info to anon;

insert into storage.buckets (id, name, public)
values ('agent-public', 'agent-public', true)
on conflict (id) do nothing;

-- Objects are stored as "<agent_id>/photo" / "<agent_id>/logo" -- anyone
-- can read (the bucket is public), but only the owning agent can write.
create policy "anyone can view agent public assets" on storage.objects
  for select to public
  using (bucket_id = 'agent-public');

create policy "agents manage own public assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'agent-public' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "agents update own public assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'agent-public' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'agent-public' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "agents delete own public assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'agent-public' and (storage.foldername(name))[1] = auth.uid()::text);
