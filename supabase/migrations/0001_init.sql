-- =============================================================================
-- MK Studios Dashboard – initial schema
--
-- Shared, public business data:  businesses, website_audits
--   -> readable by every signed-in user, written ONLY by the server
--      (service role key), so users can't tamper with shared data.
-- Personal CRM data:             profiles, leads, lead_notes, lead_contacts,
--                                follow_ups, searches
--   -> Row Level Security: a user only sees and changes their own rows.
-- =============================================================================

create extension if not exists pgcrypto;

-- Keeps updated_at current on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- users (profile per auth user)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 100),
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- businesses (public business profiles from a data provider)
-- -----------------------------------------------------------------------------
create table public.businesses (
  id                  uuid primary key default gen_random_uuid(),
  source              text not null check (source in ('demo', 'google_places', 'manual')),
  external_id         text not null check (char_length(external_id) <= 300),
  name                text not null check (char_length(name) <= 300),
  industry            text not null default 'Other',
  description         text,
  address             text not null default '',
  city                text not null default '',
  region              text not null default '',
  country             text not null default '',
  country_code        text not null default '',
  phone               text,
  phone_normalized    text,
  email               text,
  website             text,
  website_domain      text,
  rating              numeric(2, 1) check (rating between 0 and 5),
  review_count        integer not null default 0 check (review_count >= 0),
  lat                 double precision not null check (lat between -90 and 90),
  lng                 double precision not null check (lng between -180 and 180),
  opening_hours       text[] not null default '{}',
  services            text[] not null default '{}',
  socials             jsonb not null default '{}'::jsonb,
  size                text not null default 'small' check (size in ('small', 'medium', 'large')),
  spending_potential  text not null default 'low' check (spending_potential in ('low', 'medium', 'high')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Duplicate detection #1: one row per provider place ID.
  constraint businesses_source_external_id_key unique (source, external_id)
);

-- Duplicate detection #2 and #3: fast lookups by domain and phone.
create index businesses_website_domain_idx on public.businesses (website_domain) where website_domain is not null;
create index businesses_phone_normalized_idx on public.businesses (phone_normalized) where phone_normalized is not null;
create index businesses_city_idx on public.businesses (lower(city));
create index businesses_industry_idx on public.businesses (industry);

create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- website_audits (history of website analyses per business)
-- -----------------------------------------------------------------------------
create table public.website_audits (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  url             text not null,
  source          text not null check (source in ('demo', 'live')),
  score           smallint not null check (score between 0 and 100),
  categories      jsonb not null default '[]'::jsonb,
  issues          text[] not null default '{}',
  problems        text[] not null default '{}',
  opportunities   text[] not null default '{}',
  screenshot_url  text,
  enrichment      jsonb,
  sources         text[] not null default '{}',
  analyzed_at     timestamptz not null default now()
);

create index website_audits_business_latest_idx on public.website_audits (business_id, analyzed_at desc);

-- -----------------------------------------------------------------------------
-- leads (a business in a user's personal CRM)
-- -----------------------------------------------------------------------------
create table public.leads (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id  uuid not null references public.businesses (id) on delete cascade,
  status       text not null default 'new'
               check (status in ('new', 'researching', 'saved', 'contacted', 'follow_up', 'meeting', 'proposal', 'won', 'lost')),
  starred      boolean not null default false,
  ai_analysis  jsonb,
  saved_at     timestamptz,
  won_at       timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- A business can only be one lead per user.
  constraint leads_user_business_key unique (user_id, business_id)
);

create index leads_user_status_idx on public.leads (user_id, status);
create index leads_user_starred_idx on public.leads (user_id) where starred;
create index leads_business_idx on public.leads (business_id);

create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- lead_notes
-- -----------------------------------------------------------------------------
create table public.lead_notes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 5000),
  created_at  timestamptz not null default now()
);

create index lead_notes_lead_idx on public.lead_notes (lead_id, created_at desc);
create index lead_notes_user_idx on public.lead_notes (user_id);

-- -----------------------------------------------------------------------------
-- lead_contacts (contact moments)
-- -----------------------------------------------------------------------------
create table public.lead_contacts (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references public.leads (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  channel       text not null check (channel in ('email', 'phone', 'instagram', 'facebook', 'linkedin', 'other')),
  contacted_at  timestamptz not null default now(),
  note          text not null default '' check (char_length(note) <= 2000)
);

create index lead_contacts_lead_idx on public.lead_contacts (lead_id, contacted_at desc);
create index lead_contacts_user_idx on public.lead_contacts (user_id, contacted_at desc);

-- -----------------------------------------------------------------------------
-- follow_ups
-- -----------------------------------------------------------------------------
create table public.follow_ups (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references public.leads (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type          text not null check (type in ('call', 'email', 'follow_up', 'meeting')),
  due_at        timestamptz not null,
  done          boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index follow_ups_user_open_idx on public.follow_ups (user_id, due_at) where not done;
create index follow_ups_lead_idx on public.follow_ups (lead_id);

-- -----------------------------------------------------------------------------
-- searches (search history)
-- -----------------------------------------------------------------------------
create table public.searches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  filters       jsonb not null,
  result_count  integer not null default 0 check (result_count >= 0),
  provider      text not null,
  created_at    timestamptz not null default now()
);

create index searches_user_created_idx on public.searches (user_id, created_at desc);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles       enable row level security;
alter table public.businesses     enable row level security;
alter table public.website_audits enable row level security;
alter table public.leads          enable row level security;
alter table public.lead_notes     enable row level security;
alter table public.lead_contacts  enable row level security;
alter table public.follow_ups     enable row level security;
alter table public.searches       enable row level security;

-- Profiles: only your own.
create policy "profiles: read own"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Shared public data: read-only for signed-in users. (No insert/update policy:
-- only the server, using the service role key, can write.)
create policy "businesses: read" on public.businesses for select to authenticated using (true);
create policy "website_audits: read" on public.website_audits for select to authenticated using (true);

-- Leads: only your own.
create policy "leads: all own" on public.leads for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Child tables: only your own rows, and only attached to your own leads.
create policy "lead_notes: all own" on public.lead_notes for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.leads l where l.id = lead_id and l.user_id = (select auth.uid()))
  );

create policy "lead_contacts: all own" on public.lead_contacts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.leads l where l.id = lead_id and l.user_id = (select auth.uid()))
  );

create policy "follow_ups: all own" on public.follow_ups for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.leads l where l.id = lead_id and l.user_id = (select auth.uid()))
  );

create policy "searches: all own" on public.searches for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
