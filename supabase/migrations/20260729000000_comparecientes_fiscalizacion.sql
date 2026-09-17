-- Migración 04-comparecientes: Catálogo Global de Comparecientes y Fiscalización Notarial
-- 
-- 1. Extensión pg_trgm para búsqueda difusa/predictiva
-- 2. Enum tipo_persona_compareciente ('fisica', 'moral')
-- 3. Catálogos base: tipos_identificacion_oficial, regimenes_patrimoniales
-- 4. Evolución de public.comparecientes (tabla raíz unificada)
-- 5. Sub-entidades: compareciente_personas_fisicas y compareciente_personas_morales
-- 6. Relaciones: compareciente_representantes y compareciente_beneficiarios_controladores
-- 7. Funciones de dominio: fn_buscar_comparecientes, fn_guardar_compareciente_fisica, fn_guardar_compareciente_moral
-- 8. Seguridad RLS y Grants

create extension if not exists pg_trgm with schema extensions;

-- ============================================================
-- 1. Tipos y Catálogos Base
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_persona_compareciente') then
    create type public.tipo_persona_compareciente as enum ('fisica', 'moral');
  end if;
end;
$$;

create table if not exists public.tipos_identificacion_oficial (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.tipos_identificacion_oficial enable row level security;

create policy "tipos_identificacion_select_auth"
  on public.tipos_identificacion_oficial for select
  to authenticated using (true);

create policy "tipos_identificacion_all_admin"
  on public.tipos_identificacion_oficial for all
  to authenticated using (public.fn_has_permiso('administracion', 'acceso'))
  with check (public.fn_has_permiso('administracion', 'acceso'));

insert into public.tipos_identificacion_oficial (codigo, nombre)
values
  ('ine', 'Credencial para Votar (INE/IFE)'),
  ('pasaporte', 'Pasaporte Oficial'),
  ('cedula_profesional', 'Cédula Profesional'),
  ('cartilla_militar', 'Cartilla del Servicio Militar'),
  ('forma_migratoria', 'Documento Migratorio / Residencia')
on conflict (codigo) do update set nombre = excluded.nombre;

create table if not exists public.regimenes_patrimoniales (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.regimenes_patrimoniales enable row level security;

create policy "regimenes_patrimoniales_select_auth"
  on public.regimenes_patrimoniales for select
  to authenticated using (true);

create policy "regimenes_patrimoniales_all_admin"
  on public.regimenes_patrimoniales for all
  to authenticated using (public.fn_has_permiso('administracion', 'acceso'))
  with check (public.fn_has_permiso('administracion', 'acceso'));

insert into public.regimenes_patrimoniales (codigo, nombre)
values
  ('sociedad_conyugal', 'Sociedad Conyugal'),
  ('separacion_bienes', 'Separación de Bienes'),
  ('sociedad_legal', 'Sociedad Legal')
on conflict (codigo) do update set nombre = excluded.nombre;

-- ============================================================
-- 2. Evolución de public.comparecientes (Entidad Base)
-- ============================================================
alter table public.comparecientes
  add column if not exists tipo_persona public.tipo_persona_compareciente not null default 'fisica',
  add column if not exists rfc text,
  add column if not exists email text,
  add column if not exists telefono text,
  add column if not exists activo boolean not null default true,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid references public.profiles(id);

create unique index if not exists comparecientes_rfc_unique_idx
  on public.comparecientes (rfc)
  where rfc is not null and rfc <> '';

-- ============================================================
-- 3. compareciente_personas_fisicas
-- ============================================================
create table if not exists public.compareciente_personas_fisicas (
  compareciente_id uuid primary key references public.comparecientes (id) on delete cascade,
  nombres text not null,
  primer_apellido text not null,
  segundo_apellido text,
  curp text,
  fecha_nacimiento date,
  genero text check (genero in ('M', 'F', 'X')),
  pais_nacimiento text not null default 'México',
  nacionalidad text not null default 'Mexicana',
  estado_civil text not null default 'soltero' check (estado_civil in ('soltero', 'casado', 'divorciado', 'viudo', 'union_libre')),
  regimen_patrimonial_id uuid references public.regimenes_patrimoniales (id) on delete restrict,
  ocupacion text,
  tipo_identificacion_id uuid references public.tipos_identificacion_oficial (id) on delete restrict,
  folio_identificacion text,
  vigencia_identificacion date,
  calle text,
  numero_exterior text,
  numero_interior text,
  colonia text,
  codigo_postal text,
  municipio text,
  entidad_federativa text,
  pais text not null default 'México',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists compareciente_pf_curp_unique_idx
  on public.compareciente_personas_fisicas (curp)
  where curp is not null and curp <> '';

create or replace function public.fn_validar_regimen_matrimonial ()
returns trigger language plpgsql as $$
begin
  if new.estado_civil = 'casado' and new.regimen_patrimonial_id is null then
    raise exception 'El régimen patrimonial es obligatorio cuando el estado civil es casado.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_regimen_matrimonial on public.compareciente_personas_fisicas;
create trigger trg_validar_regimen_matrimonial
before insert or update of estado_civil, regimen_patrimonial_id on public.compareciente_personas_fisicas
for each row
execute function public.fn_validar_regimen_matrimonial ();

-- ============================================================
-- 4. compareciente_personas_morales
-- ============================================================
create table if not exists public.compareciente_personas_morales (
  compareciente_id uuid primary key references public.comparecientes (id) on delete cascade,
  razon_social text not null,
  fecha_constitucion date,
  nacionalidad text not null default 'Mexicana',
  folio_mercantil text,
  instrumento_constitutivo text,
  fecha_instrumento date,
  notario_constitucion text,
  plaza_constitucion text,
  objeto_social text,
  calle text,
  numero_exterior text,
  numero_interior text,
  colonia text,
  codigo_postal text,
  municipio text,
  entidad_federativa text,
  pais text not null default 'México',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 5. compareciente_representantes y compareciente_beneficiarios_controladores
-- ============================================================
create table if not exists public.compareciente_representantes (
  id uuid primary key default gen_random_uuid(),
  persona_moral_id uuid not null references public.comparecientes (id) on delete cascade,
  representante_fisica_id uuid not null references public.comparecientes (id) on delete restrict,
  tipo_facultades text not null,
  instrumento_poder text,
  fecha_poder date,
  notario_poder text,
  vigente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (persona_moral_id, representante_fisica_id, tipo_facultades)
);

create table if not exists public.compareciente_beneficiarios_controladores (
  id uuid primary key default gen_random_uuid(),
  persona_moral_id uuid not null references public.comparecientes (id) on delete cascade,
  beneficiario_fisica_id uuid not null references public.comparecientes (id) on delete restrict,
  porcentaje_participacion numeric(5, 2) check (porcentaje_participacion > 0 and porcentaje_participacion <= 100),
  criterio_control text not null check (criterio_control in ('titularidad_acciones', 'derechos_voto', 'designacion_directores', 'control_de_hecho')),
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (persona_moral_id, beneficiario_fisica_id)
);

-- Habilitar RLS en todas las tablas
alter table public.compareciente_personas_fisicas enable row level security;
alter table public.compareciente_personas_morales enable row level security;
alter table public.compareciente_representantes enable row level security;
alter table public.compareciente_beneficiarios_controladores enable row level security;

create policy "compareciente_pf_select" on public.compareciente_personas_fisicas
  for select to authenticated using (public.fn_has_permiso('comparecientes', 'ver'));

create policy "compareciente_pf_insert" on public.compareciente_personas_fisicas
  for insert to authenticated with check (public.fn_has_permiso('comparecientes', 'crear'));

create policy "compareciente_pf_update" on public.compareciente_personas_fisicas
  for update to authenticated using (public.fn_has_permiso('comparecientes', 'editar'))
  with check (public.fn_has_permiso('comparecientes', 'editar'));

create policy "compareciente_pf_delete" on public.compareciente_personas_fisicas
  for delete to authenticated using (public.fn_has_permiso('comparecientes', 'eliminar'));

create policy "compareciente_pm_select" on public.compareciente_personas_morales
  for select to authenticated using (public.fn_has_permiso('comparecientes', 'ver'));

create policy "compareciente_pm_insert" on public.compareciente_personas_morales
  for insert to authenticated with check (public.fn_has_permiso('comparecientes', 'crear'));

create policy "compareciente_pm_update" on public.compareciente_personas_morales
  for update to authenticated using (public.fn_has_permiso('comparecientes', 'editar'))
  with check (public.fn_has_permiso('comparecientes', 'editar'));

create policy "compareciente_pm_delete" on public.compareciente_personas_morales
  for delete to authenticated using (public.fn_has_permiso('comparecientes', 'eliminar'));

create policy "compareciente_rep_all" on public.compareciente_representantes
  for all to authenticated using (public.fn_has_permiso('comparecientes', 'ver'))
  with check (public.fn_has_permiso('comparecientes', 'editar') or public.fn_has_permiso('comparecientes', 'crear'));

create policy "compareciente_bc_all" on public.compareciente_beneficiarios_controladores
  for all to authenticated using (public.fn_has_permiso('comparecientes', 'ver'))
  with check (public.fn_has_permiso('comparecientes', 'editar') or public.fn_has_permiso('comparecientes', 'crear'));

-- Grants explícitos para roles de Supabase
grant select, insert, update, delete on public.tipos_identificacion_oficial to authenticated, service_role;
grant select, insert, update, delete on public.regimenes_patrimoniales to authenticated, service_role;
grant select, insert, update, delete on public.comparecientes to authenticated, service_role;
grant select, insert, update, delete on public.compareciente_personas_fisicas to authenticated, service_role;
grant select, insert, update, delete on public.compareciente_personas_morales to authenticated, service_role;
grant select, insert, update, delete on public.compareciente_representantes to authenticated, service_role;
grant select, insert, update, delete on public.compareciente_beneficiarios_controladores to authenticated, service_role;

notify pgrst, 'reload schema';

-- ============================================================
-- 6. Funciones de Dominio (RPC)
-- ============================================================

-- Búsqueda predictiva con coincidencias por RFC, CURP o Nombre
create or replace function public.fn_buscar_comparecientes (
  p_query text,
  p_limite integer default 10
) returns table (
  id uuid,
  tipo_persona text,
  rfc text,
  identificador_secundario text,
  nombre_completo text,
  activo boolean
) language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  return query
  select
    c.id,
    c.tipo_persona::text,
    c.rfc,
    case
      when c.tipo_persona = 'fisica' then pf.curp
      else pm.folio_mercantil
    end as identificador_secundario,
    case
      when c.tipo_persona = 'fisica' then trim(concat(pf.nombres, ' ', pf.primer_apellido, ' ', coalesce(pf.segundo_apellido, '')))
      else pm.razon_social
    end as nombre_completo,
    c.activo
  from public.comparecientes c
  left join public.compareciente_personas_fisicas pf on pf.compareciente_id = c.id
  left join public.compareciente_personas_morales pm on pm.compareciente_id = c.id
  where
    c.activo = true
    and (
      c.rfc ilike concat('%', p_query, '%')
      or pf.curp ilike concat('%', p_query, '%')
      or pm.folio_mercantil ilike concat('%', p_query, '%')
      or pm.razon_social ilike concat('%', p_query, '%')
      or concat(pf.nombres, ' ', pf.primer_apellido, ' ', coalesce(pf.segundo_apellido, '')) ilike concat('%', p_query, '%')
    )
  order by
    case when c.rfc ilike concat(p_query, '%') then 1 else 2 end,
    nombre_completo asc
  limit p_limite;
end;
$$;

-- Guardado atómico de Persona Física
create or replace function public.fn_guardar_compareciente_fisica (
  p_id uuid,
  p_nombres text,
  p_primer_apellido text,
  p_segundo_apellido text,
  p_rfc text,
  p_curp text,
  p_fecha_nacimiento date,
  p_genero text,
  p_nacionalidad text,
  p_estado_civil text,
  p_regimen_patrimonial_id uuid,
  p_ocupacion text,
  p_tipo_identificacion_id uuid,
  p_folio_identificacion text,
  p_vigencia_identificacion date,
  p_calle text,
  p_numero_exterior text,
  p_numero_interior text,
  p_colonia text,
  p_codigo_postal text,
  p_municipio text,
  p_entidad_federativa text,
  p_email text,
  p_telefono text
) returns uuid language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_nombre_display text;
begin
  v_nombre_display := trim(concat(p_nombres, ' ', p_primer_apellido, ' ', coalesce(p_segundo_apellido, '')));

  if p_id is null then
    insert into public.comparecientes (tipo_persona, nombre, rfc, email, telefono, activo, created_by)
    values ('fisica', v_nombre_display, upper(nullif(trim(p_rfc), '')), nullif(trim(p_email), ''), nullif(trim(p_telefono), ''), true, auth.uid())
    returning id into v_id;
  else
    v_id := p_id;
    update public.comparecientes
    set
      nombre = v_nombre_display,
      rfc = upper(nullif(trim(p_rfc), '')),
      email = nullif(trim(p_email), ''),
      telefono = nullif(trim(p_telefono), ''),
      updated_at = now()
    where id = v_id;
  end if;

  insert into public.compareciente_personas_fisicas (
    compareciente_id, nombres, primer_apellido, segundo_apellido,
    curp, fecha_nacimiento, genero, nacionalidad,
    estado_civil, regimen_patrimonial_id, ocupacion,
    tipo_identificacion_id, folio_identificacion, vigencia_identificacion,
    calle, numero_exterior, numero_interior, colonia,
    codigo_postal, municipio, entidad_federativa
  ) values (
    v_id, p_nombres, p_primer_apellido, nullif(trim(p_segundo_apellido), ''),
    upper(nullif(trim(p_curp), '')), p_fecha_nacimiento, p_genero, coalesce(p_nacionalidad, 'Mexicana'),
    coalesce(p_estado_civil, 'soltero'), p_regimen_patrimonial_id, p_ocupacion,
    p_tipo_identificacion_id, p_folio_identificacion, p_vigencia_identificacion,
    p_calle, p_numero_exterior, p_numero_interior, p_colonia,
    p_codigo_postal, p_municipio, p_entidad_federativa
  )
  on conflict (compareciente_id) do update set
    nombres = excluded.nombres,
    primer_apellido = excluded.primer_apellido,
    segundo_apellido = excluded.segundo_apellido,
    curp = excluded.curp,
    fecha_nacimiento = excluded.fecha_nacimiento,
    genero = excluded.genero,
    nacionalidad = excluded.nacionalidad,
    estado_civil = excluded.estado_civil,
    regimen_patrimonial_id = excluded.regimen_patrimonial_id,
    ocupacion = excluded.ocupacion,
    tipo_identificacion_id = excluded.tipo_identificacion_id,
    folio_identificacion = excluded.folio_identificacion,
    vigencia_identificacion = excluded.vigencia_identificacion,
    calle = excluded.calle,
    numero_exterior = excluded.numero_exterior,
    numero_interior = excluded.numero_interior,
    colonia = excluded.colonia,
    codigo_postal = excluded.codigo_postal,
    municipio = excluded.municipio,
    entidad_federativa = excluded.entidad_federativa,
    updated_at = now();

  return v_id;
end;
$$;

-- Guardado atómico de Persona Moral
create or replace function public.fn_guardar_compareciente_moral (
  p_id uuid,
  p_razon_social text,
  p_rfc text,
  p_fecha_constitucion date,
  p_nacionalidad text,
  p_folio_mercantil text,
  p_instrumento_constitutivo text,
  p_fecha_instrumento date,
  p_notario_constitucion text,
  p_plaza_constitucion text,
  p_objeto_social text,
  p_calle text,
  p_numero_exterior text,
  p_numero_interior text,
  p_colonia text,
  p_codigo_postal text,
  p_municipio text,
  p_entidad_federativa text,
  p_email text,
  p_telefono text
) returns uuid language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into public.comparecientes (tipo_persona, nombre, rfc, email, telefono, activo, created_by)
    values ('moral', trim(p_razon_social), upper(nullif(trim(p_rfc), '')), nullif(trim(p_email), ''), nullif(trim(p_telefono), ''), true, auth.uid())
    returning id into v_id;
  else
    v_id := p_id;
    update public.comparecientes
    set
      nombre = trim(p_razon_social),
      rfc = upper(nullif(trim(p_rfc), '')),
      email = nullif(trim(p_email), ''),
      telefono = nullif(trim(p_telefono), ''),
      updated_at = now()
    where id = v_id;
  end if;

  insert into public.compareciente_personas_morales (
    compareciente_id, razon_social, fecha_constitucion, nacionalidad,
    folio_mercantil, instrumento_constitutivo, fecha_instrumento,
    notario_constitucion, plaza_constitucion, objeto_social,
    calle, numero_exterior, numero_interior, colonia,
    codigo_postal, municipio, entidad_federativa
  ) values (
    v_id, trim(p_razon_social), p_fecha_constitucion, coalesce(p_nacionalidad, 'Mexicana'),
    p_folio_mercantil, p_instrumento_constitutivo, p_fecha_instrumento,
    p_notario_constitucion, p_plaza_constitucion, p_objeto_social,
    p_calle, p_numero_exterior, p_numero_interior, p_colonia,
    p_codigo_postal, p_municipio, p_entidad_federativa
  )
  on conflict (compareciente_id) do update set
    razon_social = excluded.razon_social,
    fecha_constitucion = excluded.fecha_constitucion,
    nacionalidad = excluded.nacionalidad,
    folio_mercantil = excluded.folio_mercantil,
    instrumento_constitutivo = excluded.instrumento_constitutivo,
    fecha_instrumento = excluded.fecha_instrumento,
    notario_constitucion = excluded.notario_constitucion,
    plaza_constitucion = excluded.plaza_constitucion,
    objeto_social = excluded.objeto_social,
    calle = excluded.calle,
    numero_exterior = excluded.numero_exterior,
    numero_interior = excluded.numero_interior,
    colonia = excluded.colonia,
    codigo_postal = excluded.codigo_postal,
    municipio = excluded.municipio,
    entidad_federativa = excluded.entidad_federativa,
    updated_at = now();

  return v_id;
end;
$$;
