-- JeRegime: jr_user_report (V1)
-- Objectif: stocker un rapport généré (snapshot) par utilisateur, accessible uniquement par son propriétaire.

begin;

-- Table: 1 rapport courant par utilisateur (V1)
create table if not exists public.jr_user_report (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Versionnage simple (V1). Si on change le format plus tard, on incrémente.
  report_version int not null default 1,

  -- Contenu rapport (snapshot) + calculs (IMC, etc.)
  report_json jsonb not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint jr_user_report_one_per_user unique (user_id)
);

create index if not exists jr_user_report_user_id_idx on public.jr_user_report (user_id);

-- Trigger updated_at
create or replace function public.jr_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_jr_user_report_updated_at on public.jr_user_report;

create trigger trg_jr_user_report_updated_at
before update on public.jr_user_report
for each row
execute function public.jr_set_updated_at();

-- RLS
alter table public.jr_user_report enable row level security;

drop policy if exists "jr_user_report_select_own" on public.jr_user_report;
create policy "jr_user_report_select_own"
on public.jr_user_report
for select
using (auth.uid() = user_id);

drop policy if exists "jr_user_report_insert_own" on public.jr_user_report;
create policy "jr_user_report_insert_own"
on public.jr_user_report
for insert
with check (auth.uid() = user_id);

drop policy if exists "jr_user_report_update_own" on public.jr_user_report;
create policy "jr_user_report_update_own"
on public.jr_user_report
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

commit;
