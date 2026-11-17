create table public.guest_registrations (
  id uuid primary key default gen_random_uuid(),
  primary_guest_name text not null check (
    char_length(btrim(primary_guest_name)) between 1 and 120
  ),
  email text not null,
  whatsapp text not null,
  companion_name text check (
    companion_name is null or char_length(btrim(companion_name)) between 1 and 120
  ),
  children_names text[] not null default '{}'::text[] check (
    coalesce(array_length(children_names, 1), 0) <= 12
  ),
  consented_at timestamptz not null,
  qr_token_hash text not null unique,
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.guest_registrations enable row level security;
revoke all on table public.guest_registrations from anon, authenticated;