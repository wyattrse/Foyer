-- Free-text description field, editable by the agent directly or via the AI
-- assistant. Nullable -- most listings won't set one right away.
alter table public.listings add column description text;
