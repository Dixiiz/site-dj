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

-- Extraits audio + pochettes (API iTunes)
alter table playlist_tracks add column if not exists preview_url text;
alter table playlist_tracks add column if not exists artwork_url text;

-- Espace client : options en attente de validation admin + pastille nouveautés
alter table quotes add column if not exists pending_options jsonb;
alter table quotes add column if not exists has_unread_updates boolean not null default false;

-- Fichiers envoyés par les clients (MP3, MP4, documents…)
create table if not exists quote_files (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

-- Rattachement d'un fichier à un temps fort (null = divers)
alter table quote_files add column if not exists moment text;

-- Fichiers envoyés par l'admin (contrat, devis signé, documents officiels)
alter table quote_files add column if not exists from_admin boolean not null default false;

-- Nom personnalisé donné au devis par le client
alter table quotes add column if not exists client_label text;

-- Signature en ligne des documents par le client
alter table quote_files add column if not exists signed_name text;
alter table quote_files add column if not exists signed_at timestamptz;
alter table quote_files add column if not exists signed_ip text;
alter table quote_files add column if not exists signed_consent boolean not null default false;

create index if not exists quote_files_quote_idx on quote_files (quote_id, created_at);

alter table quote_files enable row level security;

