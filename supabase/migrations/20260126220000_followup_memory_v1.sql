-- JeRegime — Follow-up memory V1
-- Tables:
-- 1) jr_user_program: 1 ligne par user (début, objectif, poids initial)
-- 2) jr_user_checkins: 1 ligne par jour (poids, statut, tags)

-- 1) PROGRAM (mémoire longue)
create table if not exists public.jr_user_program (
  user_id uuid primary key references auth.users(id) on delete cascade,
  start_at timestamptz not null default now(),
  start_weight_kg numeric(5,2),
  goal_weight_kg numeric(5,2),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.jr_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jr_user_program_set_updated_at on public.jr_user_program;
create trigger jr_user_program_set_updated_at
before update on public.jr_user_program
for each row
execute function public.jr_set_updated_at();

-- 2) CHECKINS (mémoire courte + historique)
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

-- 1 checkin / jour / user
create unique index if not exists jr_user_checkins_user_day_unique
on public.jr_user_checkins(user_id, day);

-- RLS
alter table public.jr_user_program enable row level security;
alter table public.jr_user_checkins enable row level security;

-- Policies: user can CRUD own rows
drop policy if exists "jr_user_program_select_own" on public.jr_user_program;
create policy "jr_user_program_select_own"
on public.jr_user_program for select
using (auth.uid() = user_id);

drop policy if exists "jr_user_program_insert_own" on public.jr_user_program;
create policy "jr_user_program_insert_own"
on public.jr_user_program for insert
with check (auth.uid() = user_id);

drop policy if exists "jr_user_program_update_own" on public.jr_user_program;
create policy "jr_user_program_update_own"
on public.jr_user_program for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "jr_user_program_delete_own" on public.jr_user_program;
create policy "jr_user_program_delete_own"
on public.jr_user_program for delete
using (auth.uid() = user_id);

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

-- Helpful index
create index if not exists jr_user_checkins_user_day_idx
on public.jr_user_checkins(user_id, day desc);
