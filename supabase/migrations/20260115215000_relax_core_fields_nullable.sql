alter table public.jr_user_profile
  alter column age drop not null,
  alter column sex drop not null,
  alter column height_cm drop not null,
  alter column weight_kg drop not null,
  alter column goal_primary drop not null;
