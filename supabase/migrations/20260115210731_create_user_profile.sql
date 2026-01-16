create table if not exists public.user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding_done boolean not null default false,

  goal text,
  sex text,
  age_range text,
  height_cm integer,
  weight_kg integer,

  lifestyle text,
  diet_constraints text[],

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profile enable row level security;

create policy "Users can view their own profile"
on public.user_profile
for select
using (auth.uid() = user_id);

create policy "Users can insert their own profile"
on public.user_profile
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own profile"
on public.user_profile
for update
using (auth.uid() = user_id);
