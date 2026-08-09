-- Timer de horas por ticket (Iniciar/Pausar/Parar) — ya aplicado en Supabase vía MCP.
-- Un solo timer activo por consultor (PK = consultant_id): si ya tiene uno en otro
-- ticket, la UI bloquea el "Iniciar" antes de llegar acá; el unique de la PK es el
-- backstop a nivel de base ante una carrera entre dos pestañas.

create table public.time_entry_timers (
  consultant_id uuid primary key references public.profiles(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  status text not null default 'running' check (status in ('running','paused')),
  started_at timestamptz,              -- null si status='paused'
  accumulated_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

alter table time_entry_timers enable row level security;

-- Reusa public.is_ops() de la migración de roles/RLS del 2026-08-09.
create policy time_entry_timers_own on time_entry_timers for all
  to authenticated using (public.is_ops() and consultant_id = auth.uid())
  with check (public.is_ops() and consultant_id = auth.uid());
