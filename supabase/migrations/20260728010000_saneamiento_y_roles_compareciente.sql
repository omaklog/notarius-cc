-- Saneamiento de base de datos y reestructuración de roles de comparecientes
-- vinculados a actos jurídicos (matriz relacional configurable).
--
-- 1. Saneamiento: Eliminar tabla huérfana public.roles_usuario
-- 2. actos_juridicos: Añadir columna numero para indexación canónica
-- 3. roles_compareciente: Catálogo editable con preservación de integridad
-- 4. acto_juridico_roles: Tabla puente N:M para roles permitidos por acto
-- 5. escritura_comparecientes: Migración de 'rol' text a 'rol_id' uuid FK restrict
-- 6. Trigger de validación estricta de roles por acto jurídico
-- 7. Actualización de RPC fn_asociar_compareciente

-- ============================================================
-- 1. Saneamiento: Drop tabla huérfana roles_usuario
-- ============================================================
drop table if exists public.roles_usuario cascade;

-- ============================================================
-- 2. actos_juridicos: número canónico y flag de actividad vulnerable (LFPIORPI Art. 17)
-- ============================================================
alter table public.actos_juridicos
  add column if not exists numero integer unique,
  add column if not exists es_actividad_vulnerable boolean not null default false;

-- ============================================================
-- 3. Catálogo de roles_compareciente
-- ============================================================
create table if not exists public.roles_compareciente (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create trigger set_updated_at
before update on public.roles_compareciente
for each row
execute function public.set_updated_at ();

alter table public.roles_compareciente enable row level security;

create policy "roles_compareciente_select_authenticated"
  on public.roles_compareciente for select
  to authenticated using (true);

create policy "roles_compareciente_all_admin"
  on public.roles_compareciente for all
  to authenticated using (public.fn_has_permiso ('administracion', 'acceso'))
  with check (public.fn_has_permiso ('administracion', 'acceso'));

-- ============================================================
-- 4. Matriz relacional acto_juridico_roles
-- ============================================================
create table if not exists public.acto_juridico_roles (
  id uuid primary key default gen_random_uuid(),
  acto_juridico_id uuid not null references public.actos_juridicos (id) on delete cascade,
  rol_compareciente_id uuid not null references public.roles_compareciente (id) on delete restrict,
  es_requerido boolean not null default false,
  created_at timestamptz not null default now(),
  unique (acto_juridico_id, rol_compareciente_id)
);

alter table public.acto_juridico_roles enable row level security;

create policy "acto_juridico_roles_select_authenticated"
  on public.acto_juridico_roles for select
  to authenticated using (true);

create policy "acto_juridico_roles_all_admin"
  on public.acto_juridico_roles for all
  to authenticated using (public.fn_has_permiso ('administracion', 'acceso'))
  with check (public.fn_has_permiso ('administracion', 'acceso'));

-- ============================================================
-- 5. Evolución de escritura_comparecientes (migrar a rol_id)
-- ============================================================

-- Roles iniciales requeridos para migración de datos previos
insert into public.roles_compareciente (codigo, nombre)
values
  ('otorgante', 'Otorgante'),
  ('adquirente', 'Adquirente'),
  ('apoderado', 'Apoderado'),
  ('representante_legal', 'Representante legal'),
  ('testigo', 'Testigo')
on conflict (codigo) do nothing;

alter table public.escritura_comparecientes
  add column if not exists rol_id uuid references public.roles_compareciente (id) on delete restrict;

-- Backfill de rol_id a partir del texto existente
update public.escritura_comparecientes ec
set rol_id = rc.id
from public.roles_compareciente rc
where rc.codigo = ec.rol
  and ec.rol_id is null;

-- Ajustar constraints
alter table public.escritura_comparecientes
  drop constraint if exists escritura_comparecientes_escritura_id_compareciente_id_rol_key;

alter table public.escritura_comparecientes
  drop constraint if exists escritura_comparecientes_rol_check;

alter table public.escritura_comparecientes
  alter column rol drop not null;

alter table public.escritura_comparecientes
  alter column rol_id set not null;

alter table public.escritura_comparecientes
  add constraint escritura_comparecientes_escritura_id_compareciente_id_rol_id_key
  unique (escritura_id, compareciente_id, rol_id);

-- ============================================================
-- 6. Trigger de validación estricta de roles por acto jurídico
-- ============================================================
create or replace function public.fn_validar_escritura_compareciente_rol ()
returns trigger language plpgsql as $$
declare
  v_acto_juridico_id uuid;
begin
  select e.acto_juridico_id into v_acto_juridico_id
  from public.escrituras e
  where e.id = new.escritura_id;

  if not exists (
    select 1
    from public.acto_juridico_roles ajr
    where ajr.acto_juridico_id = v_acto_juridico_id
      and ajr.rol_compareciente_id = new.rol_id
  ) then
    raise exception 'El rol asignado no está permitido para el acto jurídico de esta escritura.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_escritura_compareciente_rol on public.escritura_comparecientes;

create trigger trg_validar_escritura_compareciente_rol
before insert or update of rol_id, escritura_id on public.escritura_comparecientes
for each row
execute function public.fn_validar_escritura_compareciente_rol ();

-- ============================================================
-- 7. Actualizar RPC fn_asociar_compareciente
-- ============================================================
create or replace function public.fn_asociar_compareciente (
  p_escritura_id uuid,
  p_compareciente_id uuid,
  p_nombre_nuevo text,
  p_rol_id uuid,
  p_porcentaje numeric
) returns uuid language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare
  v_compareciente_id uuid;
  v_accion text;
begin
  v_accion := case when p_compareciente_id is null then 'crear' else 'editar' end;

  if not public.fn_has_permiso('comparecientes', v_accion, p_escritura_id) then
    raise exception 'No tienes permiso para asociar comparecientes a esta escritura.';
  end if;

  if p_compareciente_id is null then
    insert into public.comparecientes (nombre)
    values (p_nombre_nuevo)
    returning id into v_compareciente_id;
  else
    v_compareciente_id := p_compareciente_id;
  end if;

  insert into public.escritura_comparecientes (escritura_id, compareciente_id, rol_id, porcentaje_participacion)
  values (p_escritura_id, v_compareciente_id, p_rol_id, p_porcentaje)
  on conflict (escritura_id, compareciente_id, rol_id)
  do update set porcentaje_participacion = excluded.porcentaje_participacion;

  return v_compareciente_id;
end;
$$;
