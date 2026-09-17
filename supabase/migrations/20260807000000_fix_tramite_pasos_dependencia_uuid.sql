-- ============================================================================
-- Migración: 20260807000000_fix_tramite_pasos_dependencia_uuid.sql
-- Módulo: 07-tramites
-- Solución al error 22P02: Auto-resolver dependencia_id a partir de dependencia_clave
-- si el cliente envía NULL o no dispone del UUID local.
-- ============================================================================

-- 1. Función trigger para auto-vincular el UUID oficial de la dependencia
create or replace function public.fn_trg_tramite_pasos_resolver_dependencia()
returns trigger language plpgsql security definer as $$
begin
  if new.dependencia_id is null and new.dependencia_clave is not null then
    select id into new.dependencia_id
    from public.cat_dependencias_oficiales
    where clave_numerica = new.dependencia_clave
    limit 1;
  end if;
  return new;
end;
$$;

-- 2. Trigger en tramite_pasos_escritura
drop trigger if exists trg_tramite_pasos_resolver_dependencia on public.tramite_pasos_escritura;
create trigger trg_tramite_pasos_resolver_dependencia
  before insert or update on public.tramite_pasos_escritura
  for each row execute function public.fn_trg_tramite_pasos_resolver_dependencia();

-- 3. Backfill de registros huérfanos sin UUID asignado
update public.tramite_pasos_escritura tpe
set dependencia_id = cdo.id
from public.cat_dependencias_oficiales cdo
where tpe.dependencia_id is null
  and cdo.clave_numerica = tpe.dependencia_clave;

-- 4. Confirmar permisos DML para anon y authenticated
grant select, insert, update, delete on public.tramite_pasos_escritura to anon, authenticated, service_role;

-- 5. Recargar esquema de PostgREST
notify pgrst, 'reload schema';
