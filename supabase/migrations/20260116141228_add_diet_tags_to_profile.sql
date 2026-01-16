-- JeRegime: add diet_tags (multi) without breaking diet_type (single)
begin;

alter table public.jr_user_profile
  add column if not exists diet_tags text[] not null default '{}';

comment on column public.jr_user_profile.diet_tags is
  'Diet constraints/preferenes (multi), e.g. halal+vegetarian. diet_type remains the primary single choice.';

commit;
