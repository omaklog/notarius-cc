-- ============================================================================
-- Migración: 20260805000000_fix_permisos_tramite_pasos_anon.sql
-- Módulo: 07-tramites
-- Solución al error 42501: Habilitar permisos DML completos y RLS para anon y authenticated
-- ============================================================================

-- 1. Permisos y Grants en tablas de gestoría y trámites
grant select, insert, update, delete on public.tramite_pasos_escritura to anon, authenticated, service_role;
grant select, insert, update, delete on public.cat_pasos_tramite to anon, authenticated, service_role;
grant select, insert, update, delete on public.cat_dependencias_oficiales to anon, authenticated, service_role;
grant select, insert, update, delete on public.cat_tipos_tramite_notarial to anon, authenticated, service_role;
grant select, insert, update, delete on public.tramites_escritura to anon, authenticated, service_role;
grant select, insert, update, delete on public.tramite_prevenciones to anon, authenticated, service_role;

-- 2. Permisos en Vistas
grant select on public.v_tramite_pasos_historial to anon, authenticated, service_role;
grant select on public.v_tramite_dependencias_resumen to anon, authenticated, service_role;
grant select on public.v_tramite_pasos_escritura to anon, authenticated, service_role;
grant select on public.v_tramites_resumen to anon, authenticated, service_role;

-- 3. Políticas RLS permisivas para desarrollo y frontend
drop policy if exists "tramite_pasos_escritura_all" on public.tramite_pasos_escritura;
drop policy if exists "tramite_pasos_escritura_anon_select" on public.tramite_pasos_escritura;
create policy "tramite_pasos_escritura_all" on public.tramite_pasos_escritura
  for all using (true) with check (true);

drop policy if exists "cat_pasos_all" on public.cat_pasos_tramite;
drop policy if exists "cat_pasos_select" on public.cat_pasos_tramite;
drop policy if exists "cat_pasos_admin" on public.cat_pasos_tramite;
create policy "cat_pasos_all" on public.cat_pasos_tramite
  for all using (true) with check (true);

drop policy if exists "cat_dependencias_all" on public.cat_dependencias_oficiales;
drop policy if exists "cat_dependencias_select" on public.cat_dependencias_oficiales;
create policy "cat_dependencias_all" on public.cat_dependencias_oficiales
  for all using (true) with check (true);

drop policy if exists "tramites_escritura_all" on public.tramites_escritura;
drop policy if exists "tramites_escritura_anon_select" on public.tramites_escritura;
create policy "tramites_escritura_all" on public.tramites_escritura
  for all using (true) with check (true);

drop policy if exists "tramite_prevenciones_all" on public.tramite_prevenciones;
drop policy if exists "tramite_prevenciones_anon_select" on public.tramite_prevenciones;
create policy "tramite_prevenciones_all" on public.tramite_prevenciones
  for all using (true) with check (true);

-- 4. Recargar esquema en PostgREST
notify pgrst, 'reload schema';
