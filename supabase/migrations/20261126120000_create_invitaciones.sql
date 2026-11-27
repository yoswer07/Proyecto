create table public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default gen_random_uuid()::text,
  nombre_mostrar text not null check (
    char_length(btrim(nombre_mostrar)) between 1 and 120
  ),
  estado_rsvp text not null default 'pendiente' check (
    estado_rsvp in ('pendiente', 'confirmado', 'no_asiste')
  ),
  email text check (email is null or char_length(email) <= 254),
  telefono text check (telefono is null or char_length(telefono) <= 32),
  acompanantes text[] not null default '{}'::text[] check (
    coalesce(array_length(acompanantes, 1), 0) <= 20
  ),
  fecha_limite_rsvp timestamptz not null,
  consentimiento_at timestamptz,
  respondido_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invitaciones enable row level security;
revoke all on table public.invitaciones from anon, authenticated;
grant all on table public.invitaciones to service_role;

drop table if exists public.guest_registrations;