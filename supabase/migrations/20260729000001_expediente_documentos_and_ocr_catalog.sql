-- Migración 04-comparecientes (Extensión): Repositorio Documental y Configuración OCR
-- 
-- 1. Ampliación de public.tipos_identificacion_oficial (permite_ocr, requiere_reverso)
-- 2. Creación de public.expediente_documentos (almacenamiento de expedientes y KYC)
-- 3. Vista dinámica public.v_expediente_escritura (enlace sin duplicidad a escrituras)
-- 4. Políticas RLS y Permisos

-- 1. Ampliación de tipos_identificacion_oficial
alter table public.tipos_identificacion_oficial
  add column if not exists permite_ocr boolean not null default false,
  add column if not exists requiere_reverso boolean not null default false;

-- Actualizar flags para los tipos estándar
update public.tipos_identificacion_oficial
set permite_ocr = true, requiere_reverso = true
where codigo = 'ine';

update public.tipos_identificacion_oficial
set permite_ocr = true, requiere_reverso = false
where codigo = 'pasaporte';

-- 2. Repositorio Documental: public.expediente_documentos
create table if not exists public.expediente_documentos (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text not null check (entidad_tipo in ('compareciente', 'escritura')),
  entidad_id uuid not null,
  categoria text not null check (categoria in ('identificacion_oficial', 'comprobante_domicilio', 'acta_constitutiva', 'poder_notarial', 'otro')),
  lado text check (lado in ('anverso', 'reverso', 'completo')),
  archivo_nombre text not null,
  archivo_path text not null,
  mime_type text not null,
  size_bytes bigint,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create index if not exists idx_expediente_docs_entidad 
  on public.expediente_documentos (entidad_tipo, entidad_id);

create index if not exists idx_expediente_docs_categoria 
  on public.expediente_documentos (categoria);

-- Habilitar RLS en expediente_documentos
alter table public.expediente_documentos enable row level security;

create policy "expediente_documentos_select"
  on public.expediente_documentos for select
  to authenticated
  using (true);

create policy "expediente_documentos_insert"
  on public.expediente_documentos for insert
  to authenticated
  with check (
    public.fn_has_permiso('comparecientes', 'crear') or 
    public.fn_has_permiso('comparecientes', 'editar') or
    public.fn_has_permiso('escrituras', 'editar')
  );

create policy "expediente_documentos_update"
  on public.expediente_documentos for update
  to authenticated
  using (
    public.fn_has_permiso('comparecientes', 'editar') or 
    public.fn_has_permiso('escrituras', 'editar')
  );

create policy "expediente_documentos_delete"
  on public.expediente_documentos for delete
  to authenticated
  using (
    public.fn_has_permiso('comparecientes', 'eliminar') or 
    public.fn_has_permiso('administracion', 'acceso')
  );

-- 3. Vista Dinámica: public.v_expediente_escritura
create or replace view public.v_expediente_escritura as
select 
  d.id as documento_id,
  d.entidad_tipo,
  d.entidad_id,
  d.categoria,
  d.lado,
  d.archivo_nombre,
  d.archivo_path,
  d.mime_type,
  d.size_bytes,
  d.metadata,
  d.created_at,
  e.id as escritura_id,
  'escritura' as origen_documento,
  null::uuid as compareciente_id,
  null::text as compareciente_nombre
from public.expediente_documentos d
join public.escrituras e on d.entidad_id = e.id and d.entidad_tipo = 'escritura'

union all

select 
  d.id as documento_id,
  d.entidad_tipo,
  d.entidad_id,
  d.categoria,
  d.lado,
  d.archivo_nombre,
  d.archivo_path,
  d.mime_type,
  d.size_bytes,
  d.metadata,
  d.created_at,
  ec.escritura_id,
  'compareciente' as origen_documento,
  c.id as compareciente_id,
  coalesce(trim(pf.nombres || ' ' || pf.primer_apellido || ' ' || coalesce(pf.segundo_apellido, '')), pm.razon_social) as compareciente_nombre
from public.expediente_documentos d
join public.comparecientes c on d.entidad_id = c.id and d.entidad_tipo = 'compareciente'
join public.escritura_comparecientes ec on ec.compareciente_id = c.id
left join public.compareciente_personas_fisicas pf on pf.compareciente_id = c.id
left join public.compareciente_personas_morales pm on pm.compareciente_id = c.id;

grant select, insert, update, delete on public.expediente_documentos to authenticated, service_role;
grant select on public.v_expediente_escritura to authenticated, service_role;

notify pgrst, 'reload schema';
