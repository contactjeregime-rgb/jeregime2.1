-- Admin view: users lisibles (prénom/nom/email + last_sign_in_at)
-- NOTE: la vue joint jr_user_profile (public) avec auth.users (schema auth)

create or replace view public.jr_admin_users as
select
  p.user_id,
  p.first_name,
  p.last_name,
  u.email,
  u.created_at as auth_created_at,
  u.last_sign_in_at,
  p.created_at as profile_created_at,
  p.onboarding_completed,
  p.onboarding_completed_at,
  p.is_premium
from public.jr_user_profile p
left join auth.users u on u.id = p.user_id;

comment on view public.jr_admin_users is
'Vue admin: index des utilisateurs (nom/prénom/email + last_sign_in_at).';
