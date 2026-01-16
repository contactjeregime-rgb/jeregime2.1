-- Onboarding profile V1 (JeRegime) - one row per user
create table if not exists public.jr_user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,

  first_name text not null,
  last_name text not null,

  age smallint not null check (age >= 18 and age <= 70),
  sex text not null check (sex in ('female','male','na')),

  height_cm smallint not null check (height_cm >= 120 and height_cm <= 230),
  weight_kg numeric(5,2) not null check (weight_kg >= 30 and weight_kg <= 300),
  target_weight_kg numeric(5,2) not null check (target_weight_kg >= 30 and target_weight_kg <= 300),

  goal_primary text not null check (goal_primary in ('lose_weight','rebalance','tone','habits_energy')),

  activity_level text not null check (activity_level in ('sedentary','normal','active','very_active')),
  work_type text not null check (work_type in ('sitting','standing','mixed','shift')),
  eating_out_freq text not null check (eating_out_freq in ('rare','1_2_week','3plus_week')),

  diet_type text not null check (diet_type in ('balanced','lowcarb','vegetarian','halal','no_pork')),
  allergies text[] not null default '{}'::text[],
  meal_style text[] not null default '{}'::text[],

  grocery_budget text not null check (grocery_budget in ('small','medium','large')),
  cook_time text not null check (cook_time in ('10','20','30plus')),
  kitchen_tools text[] not null default '{}'::text[],
  cooking_level text not null check (cooking_level in ('beginner','intermediate','confident')),

  sleep_bedtime time not null,
  sleep_wakeup time not null,
  sleep_quality text not null check (sleep_quality in ('good','medium','bad')),

  alcohol_freq text not null check (alcohol_freq in ('never','1_2_week','3plus_week')),
  smoking_status text not null check (smoking_status in ('no','occasional','daily')),
  vaping_status text not null check (vaping_status in ('no','yes')),

  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger function (shared)
create or replace function public.jr_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_jr_user_profile_updated_at on public.jr_user_profile;
create trigger trg_jr_user_profile_updated_at
before update on public.jr_user_profile
for each row execute function public.jr_set_updated_at();

-- RLS
alter table public.jr_user_profile enable row level security;

drop policy if exists "jr_user_profile_select_own" on public.jr_user_profile;
create policy "jr_user_profile_select_own"
on public.jr_user_profile
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "jr_user_profile_insert_own" on public.jr_user_profile;
create policy "jr_user_profile_insert_own"
on public.jr_user_profile
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "jr_user_profile_update_own" on public.jr_user_profile;
create policy "jr_user_profile_update_own"
on public.jr_user_profile
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
