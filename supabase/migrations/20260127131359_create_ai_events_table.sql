-- JeRegime — AI Events Log (admin / audit)
-- Objectif: tracer les interactions IA de façon légère (RGPD-safe)

create table if not exists public.jr_ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'ai_coach',
      'coach_note',
      'ai_opinion',
      'vision_body',
      'vision_analyze'
    )
  ),
  input_summary text,
  output_summary text,
  created_at timestamptz not null default now()
);

create index if not exists jr_ai_events_user_created_idx
on public.jr_ai_events(user_id, created_at desc);

alter table public.jr_ai_events enable row level security;

-- User can read own events
drop policy if exists "jr_ai_events_select_own" on public.jr_ai_events;
create policy "jr_ai_events_select_own"
on public.jr_ai_events for select
using (auth.uid() = user_id);

-- Only service_role inserts (API)
drop policy if exists "jr_ai_events_insert_service" on public.jr_ai_events;
create policy "jr_ai_events_insert_service"
on public.jr_ai_events for insert
to service_role
with check (true);

comment on table public.jr_ai_events is
'Journal des événements IA (résumés) pour suivi admin et qualité.';
