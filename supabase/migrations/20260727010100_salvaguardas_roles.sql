-- Salvaguardas de 02-usuarios-roles (US3): la notaría nunca debe quedar sin
-- ningún usuario activo con permiso administracion.acceso, y un rol con
-- usuarios activos asignados nunca debe poder eliminarse.

-- T031: un rol no se puede eliminar si es de la configuración inicial del
-- sistema (es_sistema) o si tiene usuarios activos asignados (FR-009/FR-010).
create or replace function public.fn_bloquear_eliminacion_rol()
returns trigger
language plpgsql
as $$
begin
  if old.es_sistema then
    raise exception 'No se puede eliminar un rol de la configuración inicial del sistema.';
  end if;

  if exists (
    select 1 from public.profiles
    where rol_id = old.id and activo = true
  ) then
    raise exception 'No se puede eliminar un rol con usuarios activos asignados.';
  end if;

  return old;
end;
$$;

create trigger trg_bloquear_eliminacion_rol
  before delete on public.roles
  for each row execute function public.fn_bloquear_eliminacion_rol();

-- T032: no se puede quitar el permiso administracion.acceso de un rol si
-- eso dejaría a la notaría sin ningún usuario activo con ese acceso
-- (FR-016, vía "quitar el permiso"). Solo aplica a DELETE: el alcance de
-- este permiso siempre es null (requiere_alcance = false), así que un
-- UPDATE de rol_permisos nunca cambia si un rol tiene o no este permiso.
create or replace function public.fn_bloquear_remover_ultimo_admin_permiso()
returns trigger
language plpgsql
as $$
declare
  v_es_admin_permiso boolean;
  v_conteo integer;
begin
  select (p.modulo = 'administracion' and p.accion = 'acceso')
    into v_es_admin_permiso
  from public.permisos p
  where p.id = old.permiso_id;

  if not v_es_admin_permiso then
    return old;
  end if;

  select count(*) into v_conteo
  from public.profiles pr
  join public.rol_permisos rp on rp.rol_id = pr.rol_id
  join public.permisos p on p.id = rp.permiso_id
  where pr.activo = true
    and p.modulo = 'administracion'
    and p.accion = 'acceso'
    and rp.id <> old.id;

  if v_conteo = 0 then
    raise exception 'No se puede quitar este permiso: dejaría a la notaría sin ningún usuario activo con acceso administrativo.';
  end if;

  return old;
end;
$$;

create trigger trg_bloquear_remover_ultimo_admin_permiso
  before delete on public.rol_permisos
  for each row execute function public.fn_bloquear_remover_ultimo_admin_permiso();

-- T033: no se puede reasignar el rol de un usuario ni desactivar su cuenta
-- si eso dejaría a la notaría sin ningún usuario activo con acceso
-- administrativo (FR-016, vías "reasignar rol" y "desactivar cuenta").
create or replace function public.fn_bloquear_dejar_sin_admin()
returns trigger
language plpgsql
as $$
declare
  v_tenia_acceso boolean;
  v_tendria_acceso boolean;
  v_otros_activos integer;
begin
  select exists (
    select 1 from public.rol_permisos rp
    join public.permisos p on p.id = rp.permiso_id
    where rp.rol_id = old.rol_id
      and p.modulo = 'administracion'
      and p.accion = 'acceso'
  ) into v_tenia_acceso;

  -- Si este usuario no era un administrador activo, el cambio no puede
  -- reducir el conteo de administradores activos: nada que bloquear.
  if not (old.activo and v_tenia_acceso) then
    return new;
  end if;

  select (new.activo and exists (
    select 1 from public.rol_permisos rp
    join public.permisos p on p.id = rp.permiso_id
    where rp.rol_id = new.rol_id
      and p.modulo = 'administracion'
      and p.accion = 'acceso'
  )) into v_tendria_acceso;

  -- Sigue activo y su nuevo rol conserva el acceso: no hay riesgo.
  if v_tendria_acceso then
    return new;
  end if;

  select count(*) into v_otros_activos
  from public.profiles pr
  join public.rol_permisos rp on rp.rol_id = pr.rol_id
  join public.permisos p on p.id = rp.permiso_id
  where pr.activo = true
    and pr.id <> old.id
    and p.modulo = 'administracion'
    and p.accion = 'acceso';

  if v_otros_activos = 0 then
    raise exception 'No se puede aplicar este cambio: dejaría a la notaría sin ningún usuario activo con acceso administrativo.';
  end if;

  return new;
end;
$$;

create trigger trg_bloquear_dejar_sin_admin
  before update on public.profiles
  for each row execute function public.fn_bloquear_dejar_sin_admin();

-- Endurecimiento de FR-017 (bitácora inmutable): la política RLS de
-- audit_log solo permite SELECT a administradores, pero el GRANT base
-- (heredado del ALTER DEFAULT PRIVILEGES de la migración anterior) sigue
-- permitiendo INSERT/UPDATE/DELETE a nivel de tabla, y service_role tiene
-- rolbypassrls = true — por lo que ignora la política RLS por completo.
-- Sin este REVOKE, una llamada REST con la clave service_role podría
-- insertar, modificar o borrar filas de audit_log directamente, algo que
-- únicamente debe poder hacer fn_audit_log_generic() (security definer,
-- propiedad de postgres). authenticated tampoco necesita más que SELECT.
revoke insert, update, delete, truncate on public.audit_log from authenticated, service_role;
