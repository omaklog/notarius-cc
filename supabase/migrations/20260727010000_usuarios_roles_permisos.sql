-- Usuarios, roles y permisos (spec 02-usuarios-roles). Autorización dinámica:
-- catálogo de permisos + roles editables + alcance por permiso, reforzada en
-- RLS vía fn_has_permiso() — ninguna condición hardcodea un nombre de rol
-- (contracts/usuarios-roles-interface.md, regla dura).
--
-- Reemplaza el catálogo estático `roles_usuario` de 01-infra-supabase
-- (research.md #1 de este feature).
--
-- Orden: funciones primero (sus cuerpos no se validan contra el esquema al
-- crearse, solo al invocarse) para que las políticas RLS de las tablas
-- puedan referenciarlas desde su primera definición.
--
-- IMPORTANTE (hallazgo de este feature): habilitar RLS y crear políticas no
-- es suficiente por sí solo — Postgres exige el GRANT de privilegio base
-- (select/insert/update/delete) ANTES de siquiera evaluar las políticas de
-- RLS, incluso para `service_role` (que bypassa RLS pero no los GRANTs).
-- `01-infra-supabase` no lo hizo para sus tablas de catálogo (bug latente,
-- nunca ejercitado con una sesión autenticada real hasta este feature). Se
-- fija hacia adelante con `ALTER DEFAULT PRIVILEGES` (aplica a esta
-- migración y a cualquier tabla futura creada por `postgres` en `public`) y
-- se corrige retroactivamente para las tablas ya creadas.
alter default privileges for role postgres in schema public
grant select,
insert,
update,
delete on tables to authenticated,
service_role;

-- Corrección retroactiva: tablas de 01-infra-supabase creadas antes de este
-- ALTER DEFAULT PRIVILEGES (roles_usuario ya no existe, se omite).
grant select on public.tipos_acto_notarial, public.roles_compareciente, public.uma_historico to authenticated,
service_role;

grant insert,
update,
delete on public.tipos_acto_notarial, public.roles_compareciente, public.uma_historico to service_role;

-- ============================================================
-- fn_has_permiso — única fuente de verdad de autorización
-- (contracts/usuarios-roles-interface.md, regla dura: nunca condicionar
-- por nombre de rol; todo pasa por esta función)
-- ============================================================
create or replace function public.fn_has_permiso (
  p_modulo text,
  p_accion text,
  p_escritura_id uuid default null
) returns boolean language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare
  v_alcance text;
  v_requiere_alcance boolean;
begin
  select rp.alcance, p.requiere_alcance
    into v_alcance, v_requiere_alcance
  from public.profiles pr
  join public.rol_permisos rp on rp.rol_id = pr.rol_id
  join public.permisos p on p.id = rp.permiso_id
  where pr.id = auth.uid()
    and p.modulo = p_modulo
    and p.accion = p_accion
    and pr.activo = true
  limit 1;

  if not found then
    return false;
  end if;

  if not v_requiere_alcance then
    return true;
  end if;

  if v_alcance = 'todas' then
    return true;
  end if;

  -- alcance 'propias': requiere que exista una escritura y que el usuario
  -- autenticado sea su responsable. La tabla escrituras la define su propio
  -- spec futuro; hasta que exista, cualquier chequeo de alcance 'propias'
  -- resuelve en false (sin la tabla, no hay forma de ser responsable de nada).
  if p_escritura_id is null then
    return false;
  end if;

  if to_regclass('public.escrituras') is null then
    return false;
  end if;

  return exists (
    select 1 from public.escrituras e
    where e.id = p_escritura_id
      and e.responsable_id = auth.uid()
  );
end;
$$;

-- ============================================================
-- fn_mis_permisos — espejo de permisos propios para la interfaz
-- (contracts/usuarios-roles-interface.md: useAuth().hasPermiso() nunca
-- lee rol_permisos/permisos directamente — esas tablas son de solo
-- administracion.acceso vía RLS. Esta función, security definer, es la
-- única forma en que un usuario normal puede conocer sus propios
-- permisos para filtrar la interfaz; la aplicación real de cada permiso
-- sigue viviendo en fn_has_permiso() dentro de cada política RLS.)
-- ============================================================
create or replace function public.fn_mis_permisos () returns table (modulo text, accion text, alcance text) language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
begin
  return query
  select p.modulo, p.accion, rp.alcance
  from public.profiles pr
  join public.rol_permisos rp on rp.rol_id = pr.rol_id
  join public.permisos p on p.id = rp.permiso_id
  where pr.id = auth.uid()
    and pr.activo = true;
end;
$$;

-- ============================================================
-- fn_mi_perfil — perfil propio + nombre de rol para la interfaz
-- (hallazgo de implementación: `roles` es de solo administracion.acceso
-- vía RLS, por lo que un usuario normal no puede resolver el nombre de
-- su propio rol con un join/embed directo — necesita el mismo patrón
-- security definer que fn_mis_permisos)
-- ============================================================
create or replace function public.fn_mi_perfil () returns table (
  id uuid,
  nombre_completo text,
  rol_id uuid,
  rol_nombre text,
  activo boolean
) language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
begin
  return query
  select pr.id, pr.nombre_completo, pr.rol_id, r.nombre, pr.activo
  from public.profiles pr
  join public.roles r on r.id = pr.rol_id
  where pr.id = auth.uid();
end;
$$;

-- ============================================================
-- fn_audit_log_generic — trigger genérico de auditoría (research.md #3)
-- ============================================================
create or replace function public.fn_audit_log_generic () returns trigger language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (entidad, entidad_id, accion, datos_nuevos, changed_by)
    values (tg_table_name, new.id, 'insert', to_jsonb(new), auth.uid());
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (entidad, entidad_id, accion, datos_anteriores, datos_nuevos, changed_by)
    values (tg_table_name, new.id, 'update', to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (entidad, entidad_id, accion, datos_anteriores, changed_by)
    values (tg_table_name, old.id, 'delete', to_jsonb(old), auth.uid());
    return old;
  end if;
  return null;
end;
$$;

-- ============================================================
-- permisos
-- ============================================================
create table public.permisos (
  id uuid primary key default gen_random_uuid(),
  modulo text not null,
  accion text not null,
  descripcion text not null,
  requiere_alcance boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (modulo, accion)
);

create trigger set_updated_at
before update on public.permisos
for each row
execute function public.set_updated_at ();

alter table public.permisos enable row level security;

create policy "permisos_all_admin" on public.permisos for all to authenticated using (public.fn_has_permiso ('administracion', 'acceso'))
with
  check (public.fn_has_permiso ('administracion', 'acceso'));

-- ============================================================
-- roles
-- ============================================================
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  es_sistema boolean not null default false,
  es_predeterminado_invitacion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garantiza que a lo sumo un rol sea el default de invitación (research.md #6).
create unique index roles_predeterminado_invitacion_uidx on public.roles (es_predeterminado_invitacion)
where
  es_predeterminado_invitacion;

create trigger set_updated_at
before update on public.roles
for each row
execute function public.set_updated_at ();

alter table public.roles enable row level security;

create policy "roles_all_admin" on public.roles for all to authenticated using (public.fn_has_permiso ('administracion', 'acceso'))
with
  check (public.fn_has_permiso ('administracion', 'acceso'));

-- ============================================================
-- rol_permisos
-- ============================================================
create table public.rol_permisos (
  id uuid primary key default gen_random_uuid(),
  rol_id uuid not null references public.roles (id) on delete cascade,
  permiso_id uuid not null references public.permisos (id) on delete cascade,
  alcance text check (alcance in ('propias', 'todas')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rol_id, permiso_id)
);

create index rol_permisos_rol_id_permiso_id_idx on public.rol_permisos (rol_id, permiso_id);

create trigger set_updated_at
before update on public.rol_permisos
for each row
execute function public.set_updated_at ();

alter table public.rol_permisos enable row level security;

create policy "rol_permisos_all_admin" on public.rol_permisos for all to authenticated using (public.fn_has_permiso ('administracion', 'acceso'))
with
  check (public.fn_has_permiso ('administracion', 'acceso'));

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text not null,
  rol_id uuid not null references public.roles (id),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_rol_id_idx on public.profiles (rol_id);

create trigger set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at ();

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated using (
  id = auth.uid ()
  or public.fn_has_permiso ('administracion', 'acceso')
);

create policy "profiles_write_admin" on public.profiles
for insert
  to authenticated
with
  check (public.fn_has_permiso ('administracion', 'acceso'));

create policy "profiles_update_admin" on public.profiles for update to authenticated using (public.fn_has_permiso ('administracion', 'acceso'))
with
  check (public.fn_has_permiso ('administracion', 'acceso'));

create policy "profiles_delete_admin" on public.profiles for delete to authenticated using (public.fn_has_permiso ('administracion', 'acceso'));

-- ============================================================
-- audit_log (bitácora inmutable, append-only — Clarification FR-017)
-- ============================================================
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entidad text not null check (entidad in ('roles', 'rol_permisos', 'profiles')),
  entidad_id uuid not null,
  accion text not null check (accion in ('insert', 'update', 'delete')),
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  changed_by uuid references auth.users (id),
  changed_at timestamptz not null default now()
);

create index audit_log_entidad_entidad_id_idx on public.audit_log (entidad, entidad_id);

alter table public.audit_log enable row level security;

-- Sin política de insert/update/delete para roles normales: el trigger de
-- arriba corre con los privilegios del dueño de la tabla (postgres), que
-- bypassa RLS. Ningún cliente puede escribir aquí directamente.
create policy "audit_log_select_admin" on public.audit_log for select to authenticated using (public.fn_has_permiso ('administracion', 'acceso'));

create trigger audit_log_roles
after insert or update or delete on public.roles for each row
execute function public.fn_audit_log_generic ();

create trigger audit_log_rol_permisos
after insert or update or delete on public.rol_permisos for each row
execute function public.fn_audit_log_generic ();

create trigger audit_log_profiles
after insert or update or delete on public.profiles for each row
execute function public.fn_audit_log_generic ();

-- ============================================================
-- handle_new_user — crea el perfil al invitar/crear un usuario en auth.users
-- ============================================================
create or replace function public.fn_handle_new_user () returns trigger language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare
  v_rol_id uuid;
begin
  select id into v_rol_id
  from public.roles
  where es_predeterminado_invitacion = true
  limit 1;

  insert into public.profiles (id, nombre_completo, rol_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    v_rol_id
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.fn_handle_new_user ();

-- ============================================================
-- Reemplaza el catálogo estático de 01-infra-supabase
-- ============================================================
drop table if exists public.roles_usuario;
