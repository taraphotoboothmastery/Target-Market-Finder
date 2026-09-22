-- Run this once in the Supabase SQL Editor.

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  segment text not null check (segment in ('wedding', 'corporate')),
  category text not null,             -- e.g. 'holiday_party', 'luxury_wedding'
  price numeric,
  profit numeric,
  event_length_hours numeric,
  decision_maker text,                -- e.g. 'bride', 'hr_person'
  lead_source text,                   -- e.g. 'instagram', 'referral'
  would_do_again boolean,
  never_again boolean,
  event_date date,
  notes text,
  created_at timestamptz default now()
);

alter table events enable row level security;

create policy "Users can manage their own events"
  on events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists target_market_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  segment text not null check (segment in ('wedding', 'corporate')),
  top_categories text,     -- the "brought in the most revenue were ___" blank
  client_type text,        -- "the client who booked me were mostly ___"
  lead_sources text,       -- "the method they found me was ___"
  vendor_search_habit text,-- "when looking for vendors, my ideal client goes to ___"
  is_finalized boolean default false,
  updated_at timestamptz default now(),
  unique (user_id, segment)
);

alter table target_market_profiles enable row level security;

create policy "Users can manage their own profiles"
  on target_market_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Membership gate (New Thrive + SCALE only).
-- Populated by /api/cron/sync-memberships from Kajabi; never written to
-- directly by the app, and never readable by logged-in users' browsers
-- (no policy grants anon/authenticated access — only the service role,
-- used server-side, bypasses RLS here).
create table if not exists memberships (
  email text primary key,
  kajabi_contact_id text,
  offer_ids text[] not null default '{}',
  status text not null default 'inactive' check (status in ('active', 'inactive')),
  synced_at timestamptz default now()
);

alter table memberships enable row level security;
-- Deliberately no policies: only the service-role key (server-side only)
-- can read or write this table.
