-- Allow Geoapify as a business source.
alter table public.businesses drop constraint if exists businesses_source_check;
alter table public.businesses
  add constraint businesses_source_check
  check (source in ('demo', 'google_places', 'geoapify', 'openstreetmap', 'manual'));
