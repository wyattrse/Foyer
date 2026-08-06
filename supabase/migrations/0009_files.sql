-- File metadata + a private Storage bucket for the actual bytes. Files can
-- optionally be attached to a lead (contracts, disclosures, etc.).

create table public.files (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index files_agent_idx on public.files(agent_id);
create index files_lead_idx on public.files(lead_id);

alter table public.files enable row level security;

create policy "agents manage own files" on public.files
  for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- Private bucket -- access is mediated entirely by the `files` table above
-- plus the Storage RLS policy below, never a public URL.
insert into storage.buckets (id, name, public)
values ('lead-files', 'lead-files', false)
on conflict (id) do nothing;

-- Objects are stored as "<agent_id>/<uuid>-<filename>"; the policy checks
-- that the first path segment matches the requesting agent, mirroring the
-- per-agent ownership pattern used everywhere else in this schema.
create policy "agents manage own storage objects" on storage.objects
  for all to authenticated
  using (bucket_id = 'lead-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'lead-files' and (storage.foldername(name))[1] = auth.uid()::text);
