-- jr_user_coach_opinion: avis diététicien (IA) versionné, lié au dernier rapport
create table if not exists public.jr_user_coach_opinion (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid null references public.jr_user_report(id) on delete set null,
  opinion_version int not null default 1,
  opinion_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists jr_user_coach_opinion_user_id_idx on public.jr_user_coach_opinion(user_id);
create index if not exists jr_user_coach_opinion_report_id_idx on public.jr_user_coach_opinion(report_id);

alter table public.jr_user_coach_opinion enable row level security;

-- Policies: user can read own opinions
drop policy if exists "jr_user_coach_opinion_select_own" on public.jr_user_coach_opinion;
create policy "jr_user_coach_opinion_select_own"
on public.jr_user_coach_opinion
for select
to authenticated
using (auth.uid() = user_id);

-- user can insert own opinions
drop policy if exists "jr_user_coach_opinion_insert_own" on public.jr_user_coach_opinion;
create policy "jr_user_coach_opinion_insert_own"
on public.jr_user_coach_opinion
for insert
to authenticated
with check (auth.uid() = user_id);
