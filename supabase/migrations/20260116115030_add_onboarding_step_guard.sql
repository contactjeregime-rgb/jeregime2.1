alter table public.jr_user_profile
add column if not exists onboarding_step smallint not null default 1;

create index if not exists jr_user_profile_onboarding_step_idx
on public.jr_user_profile (onboarding_step);
