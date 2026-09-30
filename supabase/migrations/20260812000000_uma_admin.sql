-- ============================================================================
-- Migración: 20260812000000_uma_admin.sql
-- Módulo: Administración General - Catálogo y Gestión de UMA Histórica
-- Conforme a la Constitución Notarial (§6 UMA Histórica)
-- ============================================================================

-- 1. Ampliar tabla public.uma_historico con campos de notas y fuente oficial
alter table public.uma_historico
  add column if not exists notas text,
  add column if not exists fuente text default 'DOF / INEGI';

-- 2. Otorgar permisos a authenticated y service_role
grant select, insert, update, delete on public.uma_historico to authenticated, service_role;

-- 3. Políticas RLS para administración
-- Permitir select a authenticated ya existe en catalogos_base.sql
-- Crear política de modificación (insert, update, delete) para administradores
drop policy if exists "uma_historico_admin_modify" on public.uma_historico;
create policy "uma_historico_admin_modify" on public.uma_historico
  for all to authenticated
  using (public.fn_has_permiso('administracion', 'acceso'))
  with check (public.fn_has_permiso('administracion', 'acceso'));
