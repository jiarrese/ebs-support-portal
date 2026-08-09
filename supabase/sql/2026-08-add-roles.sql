-- Roles admin/company_admin + RLS completa (ya aplicado en Supabase vía MCP el 2026-08-09).
-- Se deja acá como referencia versionada de lo que quedó corriendo en la base.
-- Hasta este cambio NINGUNA tabla tenía RLS habilitado (hueco de seguridad real:
-- cualquier usuario autenticado podía leer/escribir cualquier fila de cualquier
-- empresa vía la API REST de Supabase, sin pasar por la UI).

-- ============================================================================
-- 1) Enum de roles (migración separada: Postgres no permite usar un valor de
--    enum recién agregado en la misma transacción que lo agrega)
-- ============================================================================
alter type user_role add value if not exists 'admin';
alter type user_role add value if not exists 'company_admin';

-- ============================================================================
-- 2) Helper functions (security definer para evitar recursión sobre profiles)
-- ============================================================================
create or replace function public.current_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.current_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

create or replace function public.is_ops() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role() in ('admin','consultant')
$$;

create or replace function public.can_access_ticket(p_ticket_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_ops() or exists (
    select 1 from tickets t where t.id = p_ticket_id and t.company_id = public.current_company_id()
  )
$$;

revoke execute on function public.current_role() from public;
revoke execute on function public.current_company_id() from public;
revoke execute on function public.is_ops() from public;
revoke execute on function public.can_access_ticket(uuid) from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.current_company_id() to authenticated;
grant execute on function public.is_ops() to authenticated;
grant execute on function public.can_access_ticket(uuid) to authenticated;

-- ============================================================================
-- 3) profiles
-- ============================================================================
alter table profiles enable row level security;

-- Lectura abierta a cualquier autenticado: full_name/role/company_id se necesitan
-- para mostrar nombres en comentarios, horas, adjuntos y asignaciones entre
-- empresas/roles distintos. Baja sensibilidad vs. el resto de las tablas.
create policy profiles_select_all on profiles for select
  to authenticated using (true);

create policy profiles_insert_admin on profiles for insert
  to authenticated with check (public.current_role() = 'admin');

create policy profiles_insert_company_admin on profiles for insert
  to authenticated with check (
    public.current_role() = 'company_admin' and role = 'client' and company_id = public.current_company_id()
  );

create policy profiles_update_admin on profiles for update
  to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy profiles_update_company_admin on profiles for update
  to authenticated using (
    public.current_role() = 'company_admin' and role = 'client' and company_id = public.current_company_id()
  )
  with check (role = 'client' and company_id = public.current_company_id());

-- ============================================================================
-- 4) companies / ebs_environments / projects / project_companies
-- ============================================================================
alter table companies enable row level security;
create policy companies_select on companies for select
  to authenticated using (public.is_ops() or id = public.current_company_id());
create policy companies_write_ops on companies for all
  to authenticated using (public.is_ops()) with check (public.is_ops());

alter table ebs_environments enable row level security;
create policy ebs_environments_select on ebs_environments for select
  to authenticated using (public.is_ops() or company_id = public.current_company_id());
create policy ebs_environments_write_ops on ebs_environments for all
  to authenticated using (public.is_ops()) with check (public.is_ops());

alter table projects enable row level security;
create policy projects_select on projects for select
  to authenticated using (
    public.is_ops()
    or exists (select 1 from project_companies pc where pc.project_id = projects.id and pc.company_id = public.current_company_id())
  );
create policy projects_write_ops on projects for all
  to authenticated using (public.is_ops()) with check (public.is_ops());

alter table project_companies enable row level security;
create policy project_companies_select on project_companies for select
  to authenticated using (public.is_ops() or company_id = public.current_company_id());
create policy project_companies_write_ops on project_companies for all
  to authenticated using (public.is_ops()) with check (public.is_ops());

-- ============================================================================
-- 5) tickets / ticket_comments / ticket_attachments / time_entries
-- ============================================================================
alter table tickets enable row level security;
create policy tickets_select on tickets for select
  to authenticated using (public.is_ops() or company_id = public.current_company_id());
create policy tickets_insert on tickets for insert
  to authenticated with check (
    reported_by = auth.uid()
    and (public.is_ops() or (company_id = public.current_company_id() and public.current_role() in ('client','company_admin')))
  );
create policy tickets_update_ops on tickets for update
  to authenticated using (public.is_ops()) with check (public.is_ops());

alter table ticket_comments enable row level security;
-- internal=true ahora sí queda oculto para client/company_admin (antes se veía
-- en la UI, marcado con el tag "interno", pero sin ninguna restricción real).
create policy ticket_comments_select on ticket_comments for select
  to authenticated using (public.can_access_ticket(ticket_id) and (internal = false or public.is_ops()));
create policy ticket_comments_insert on ticket_comments for insert
  to authenticated with check (
    public.can_access_ticket(ticket_id)
    and author_id = auth.uid()
    and (internal = false or public.is_ops())
    and (sent_to_client = false or public.is_ops())
  );

alter table ticket_attachments enable row level security;
create policy ticket_attachments_select on ticket_attachments for select
  to authenticated using (public.can_access_ticket(ticket_id));
create policy ticket_attachments_insert on ticket_attachments for insert
  to authenticated with check (public.can_access_ticket(ticket_id) and uploaded_by = auth.uid());
create policy ticket_attachments_delete on ticket_attachments for delete
  to authenticated using (public.can_access_ticket(ticket_id));

alter table time_entries enable row level security;
create policy time_entries_select on time_entries for select
  to authenticated using (public.can_access_ticket(ticket_id));
create policy time_entries_insert on time_entries for insert
  to authenticated with check (public.is_ops() and consultant_id = auth.uid());
create policy time_entries_update_ops on time_entries for update
  to authenticated using (public.is_ops()) with check (public.is_ops());
create policy time_entries_delete_ops on time_entries for delete
  to authenticated using (public.is_ops());

-- ============================================================================
-- 6) billing_periods
-- ============================================================================
alter table billing_periods enable row level security;
create policy billing_periods_select on billing_periods for select
  to authenticated using (
    public.is_ops() or (public.current_role() = 'company_admin' and company_id = public.current_company_id())
  );
create policy billing_periods_write_ops on billing_periods for all
  to authenticated using (public.is_ops()) with check (public.is_ops());

-- ============================================================================
-- 7) Vistas: security_invoker (para que respeten la RLS de las tablas base) +
--    filtro de rol explícito en billing_summary/project_monthly_summary (sin
--    esto, 'client' podría leer facturación de su empresa vía la vista aunque
--    la página /billing lo redirija, porque client SÍ puede leer sus propios
--    time_entries/tickets para que funcione el total de horas por ticket)
-- ============================================================================
create or replace view billing_summary as
select c.id as company_id, c.name as company_name, c.hourly_rate, c.currency,
       (date_trunc('month', te.entry_date::timestamptz))::date as month,
       sum(te.hours) as total_hours,
       sum(te.hours) * c.hourly_rate as total_amount
from time_entries te
join tickets t on t.id = te.ticket_id
join companies c on c.id = t.company_id
where te.billable = true
  and (public.is_ops() or (public.current_role() = 'company_admin' and c.id = public.current_company_id()))
group by c.id, date_trunc('month', te.entry_date::timestamptz);

create or replace view project_monthly_summary as
select p.id as project_id, p.name as project_name, p.billing_type, p.monthly_hours as budget_hours,
       p.hourly_rate, p.currency,
       (date_trunc('month', te.entry_date::timestamptz))::date as month,
       sum(te.hours) as used_hours,
       case when p.hourly_rate is not null then sum(te.hours) * p.hourly_rate else 0 end as total_amount
from time_entries te
join tickets t on t.id = te.ticket_id
join projects p on p.id = t.project_id
where te.billable = true
  and (
    public.is_ops()
    or (public.current_role() = 'company_admin' and exists (
      select 1 from project_companies pc where pc.project_id = p.id and pc.company_id = public.current_company_id()
    ))
  )
group by p.id, p.name, p.billing_type, p.monthly_hours, p.hourly_rate, p.currency, date_trunc('month', te.entry_date::timestamptz);

alter view ticket_summary set (security_invoker = true);
alter view billing_summary set (security_invoker = true);
alter view project_monthly_summary set (security_invoker = true);

-- ============================================================================
-- 8) Storage: el bucket ticket-attachments tenía policies que dejaban leer/
--    subir/borrar CUALQUIER archivo de CUALQUIER ticket a cualquier usuario
--    autenticado (solo chequeaban bucket_id). Se restringe por ticket.
-- ============================================================================
drop policy if exists "read" on storage.objects;
drop policy if exists "upload" on storage.objects;
drop policy if exists "delete" on storage.objects;

create policy ticket_attachments_storage_select on storage.objects for select
  to authenticated using (
    bucket_id = 'ticket-attachments' and public.can_access_ticket((storage.foldername(name))[1]::uuid)
  );
create policy ticket_attachments_storage_insert on storage.objects for insert
  to authenticated with check (
    bucket_id = 'ticket-attachments' and public.can_access_ticket((storage.foldername(name))[1]::uuid)
  );
create policy ticket_attachments_storage_delete on storage.objects for delete
  to authenticated using (
    bucket_id = 'ticket-attachments' and public.can_access_ticket((storage.foldername(name))[1]::uuid)
  );

-- ============================================================================
-- Pendiente, no tocado (preexistente, fuera de este cambio):
-- - Funciones current_user_role()/current_user_company()/handle_new_user() ya
--   existían (con RLS deshabilitado no las usaba nada). handle_new_user() tiene
--   un trigger real (on_auth_user_created en auth.users) que crea el profile
--   con role='client' apenas se crea el auth.user — por eso /api/users hace
--   upsert en vez de insert.
-- - Advisor "Leaked Password Protection Disabled" en Auth — no relacionado a
--   este cambio, se puede activar aparte desde Authentication > Policies.
-- ============================================================================
