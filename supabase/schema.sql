-- À coller dans Supabase : SQL Editor → New query → Run

create extension if not exists "pgcrypto";

create table if not exists formulas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_hours integer not null default 4,
  price_cents integer not null,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists options (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null,
  formula_id uuid references formulas(id) on delete cascade,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  unique (slot_date, start_time)
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  event_type text,
  event_location text,
  notes text,
  formula_id uuid references formulas(id),
  formula_name text not null,
  formula_price_cents integer not null,
  selected_options jsonb not null default '[]'::jsonb,
  travel_distance_km numeric,
  travel_fee_cents integer not null default 0,
  total_cents integer not null,
  status text not null default 'nouveau',
  created_at timestamptz not null default now()
);

alter table quotes add column if not exists travel_distance_km numeric;
alter table quotes add column if not exists travel_fee_cents integer not null default 0;

create table if not exists custom_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  event_date date,
  event_location text not null,
  notes text,
  status text not null default 'nouveau',
  created_at timestamptz not null default now()
);

alter table custom_requests enable row level security;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id) on delete set null,
  slot_id uuid not null references slots(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  status text not null default 'reserve',
  created_at timestamptz not null default now()
);

create unique index if not exists bookings_slot_active_unique
  on bookings (slot_id)
  where status <> 'annule';

alter table formulas enable row level security;
alter table options enable row level security;
alter table slots enable row level security;
alter table quotes enable row level security;
alter table bookings enable row level security;

drop policy if exists "public read formulas" on formulas;
create policy "public read formulas"
  on formulas for select
  using (is_active = true);

drop policy if exists "public read options" on options;
create policy "public read options"
  on options for select
  using (is_active = true);

drop policy if exists "public read open slots" on slots;
create policy "public read open slots"
  on slots for select
  using (is_open = true);

insert into formulas (name, description, duration_hours, price_cents, sort_order)
select * from (values
  ('Soirée privée', 'Anniversaire, soirée entre amis — DJ + sono, 4 heures.', 4, 60000, 1),
  ('Mariage', 'Cérémonie optionnelle + soirée dansante, 6 heures.', 6, 120000, 2),
  ('Club / bar', 'Prestation club avec set dancefloor, 5 heures.', 5, 80000, 3),
  ('Afterwork', 'Ambiance lounge puis dance, 3 heures.', 3, 45000, 4)
) as v(name, description, duration_hours, price_cents, sort_order)
where not exists (select 1 from formulas);

insert into options (name, description, price_cents, formula_id, sort_order)
select 'Heure supplémentaire', 'Prolonge la prestation d’une heure.', 12000, null, 1
where not exists (select 1 from options where name = 'Heure supplémentaire');

insert into options (name, description, price_cents, formula_id, sort_order)
select 'Jeu de lumières', 'Pack lumières LED + lyres.', 15000, null, 2
where not exists (select 1 from options where name = 'Jeu de lumières');

insert into options (name, description, price_cents, formula_id, sort_order)
select 'Machine à fumée', 'Effet scène pour le dancefloor.', 8000, null, 3
where not exists (select 1 from options where name = 'Machine à fumée');

insert into options (name, description, price_cents, formula_id, sort_order)
select 'Micro / animation', 'Micro sans fil pour prises de parole.', 5000, null, 4
where not exists (select 1 from options where name = 'Micro / animation');

insert into options (name, description, price_cents, formula_id, sort_order)
select v.name, v.description, v.price_cents, f.id, v.sort_order
from formulas f
cross join (values
  ('Cérémonie (sono + playlist)', 'Sono discrète pour l’échange des vœux.', 20000, 10)
) as v(name, description, price_cents, sort_order)
where f.name = 'Mariage'
  and not exists (select 1 from options where name = 'Cérémonie (sono + playlist)');

insert into slots (slot_date, start_time, end_time)
select d::date, '18:00'::time, '23:00'::time
from generate_series(current_date + 1, current_date + interval '60 days', interval '1 day') as d
where extract(dow from d) in (5, 6)
on conflict (slot_date, start_time) do nothing;
