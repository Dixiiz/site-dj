-- ============================================================
-- Espace client : messagerie + playlist (souhaits / blacklist)
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- Messagerie liée à un devis
create table if not exists quote_messages (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender text not null check (sender in ('client', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);

-- Musiques : souhaits par temps fort + blacklist
create table if not exists playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  moment text not null,
  title text not null,
  artist text,
  kind text not null default 'souhait' check (kind in ('souhait', 'blacklist')),
  created_at timestamptz not null default now()
);

create index if not exists quote_messages_quote_idx on quote_messages (quote_id, created_at);
create index if not exists playlist_tracks_quote_idx on playlist_tracks (quote_id, created_at);

-- RLS activé : les clients passent par le serveur Next (service role),
-- aucune table n'est accessible directement depuis le navigateur.
alter table quote_messages enable row level security;
alter table playlist_tracks enable row level security;
