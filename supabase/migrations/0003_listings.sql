-- Listings: properties an agent is selling or renting out, each optionally
-- linked to leads. Kiosk sign-in will let a visitor pick which listing they're
-- at, so a narrow, explicitly-public view is carved out for that purpose --
-- the base table itself stays fully agent-only, same security posture as
-- everything else in this schema.

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  address text not null,
  price numeric,                    -- sale price, or monthly rent if agreement_type = 'rental'
  agreement_type text not null default 'sale' check (agreement_type in ('sale', 'rental')),
  lat double precision,             -- geocoded later, nullable until then
  lng double precision,
  created_at timestamptz not null default now()
);

create index listings_agent_id_idx on public.listings(agent_id);

alter table public.leads add column listing_id uuid references public.listings(id) on delete set null;

alter table public.listings enable row level security;

create policy "agents manage own listings" on public.listings
  for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- Kiosk-only view: id/address/agreement_type so a sign-in visitor can pick a
-- listing from a dropdown. Deliberately NOT security_invoker -- it bypasses
-- listings' agent-only RLS on purpose, but only exposes these four columns
-- (no price, no agent contact info) to the anon role.
create view public.kiosk_listings as
select id, agent_id, address, agreement_type
from public.listings;

grant select on public.kiosk_listings to anon;

-- Re-create the kiosk insert policy so a visitor can tag their lead with a
-- listing, but only one that actually belongs to the same agent_id -- closes
-- off tagging a lead with some other agent's listing.
drop policy "kiosk insert-only new leads" on public.leads;

create policy "kiosk insert-only new leads" on public.leads
  for insert to anon
  with check (
    exists (select 1 from public.agents a where a.id = agent_id)
    and stage = 'New'
    and manual_score is null
    and deal_value is null
    and deleted_at is null
    and (
      listing_id is null
      or exists (select 1 from public.listings l where l.id = listing_id and l.agent_id = agent_id)
    )
  );
