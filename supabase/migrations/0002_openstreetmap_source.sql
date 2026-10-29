-- Allow OpenStreetMap as a business source (no Google Places key).
alter table public.businesses drop constraint if exists businesses_source_check;
alter table public.businesses
  add constraint businesses_source_check
  check (source in ('demo', 'google_places', 'openstreetmap', 'manual'));
