-- JeRegime — Carnet de suivi V1 (robuste / idempotent)
-- Objectif:
-- 1) garantir l'existence de jr_user_checkins sur le remote
-- 2) ajouter coach_note (avis IA quotidien)

-- Extension UUID (si absent)
create extension if not exists pgcrypto;

-- Table checkins (si absente)
create table if not exists public.jr_user_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  weight_kg numeric(5,2),
  status text not null default 'ok' check (status in ('ok','ecart','craquage','malade','voyage')),
  appetite text null check (appetite in ('faible','normal','fort')),
  sleep_quality text null check (sleep_quality in ('mauvais','moyen','bon')),
  activity text null check (activity in ('none','light','moderate','intense')),
  alcohol boolean,
  smoking boolean,
  notes_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- 1 checkin / jour / user (si absent)
create unique index if not exists jr_user_checkins_user_day_unique
on public.jr_user_checkins(user_id, day);

-- Index lecture timeline (si absent)
create index if not exists jr_user_checkins_user_day_idx
on public.jr_user_checkins(user_id, day desc);

-- Ajouter la note IA (si absente)
alter table public.jr_user_checkins
add column if not exists coach_note text;

comment on column public.jr_user_checkins.coach_note
is 'Avis quotidien généré par l’IA après le check-in (1 phrase max).';

-- RLS + policies (si absentes)
alter table public.jr_user_checkins enable row level security;

drop policy if exists "jr_user_checkins_select_own" on public.jr_user_checkins;
create policy "jr_user_checkins_select_own"
on public.jr_user_checkins for select
using (auth.uid() = user_id);

drop policy if exists "jr_user_checkins_insert_own" on public.jr_user_checkins;
create policy "jr_user_checkins_insert_own"
on public.jr_user_checkins for insert
with check (auth.uid() = user_id);

drop policy if exists "jr_user_checkins_update_own" on public.jr_user_checkins;
create policy "jr_user_checkins_update_own"
on public.jr_user_checkins for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "jr_user_checkins_delete_own" on public.jr_user_checkins;
create policy "jr_user_checkins_delete_own"
on public.jr_user_checkins for delete
using (auth.uid() = user_id);
