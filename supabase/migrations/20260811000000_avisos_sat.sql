-- ============================================================================
-- Migración: 20260811000000_avisos_sat.sql
-- Módulo: 11-avisos-sat (Avisos SAT / UIF - Prevención de Lavado de Dinero SPPLD)
-- Conforme al Art. 17 Fracc. XII LFPIORPI y la Constitución Notarial (§5, §7, §8)
-- ============================================================================

-- 1. Registro de Permisos Dinámicos en public.permisos
insert into public.permisos (modulo, accion, descripcion, requiere_alcance) values
  ('avisos_sat', 'ver', 'Ver avisos SAT / UIF y tablero mensual de cumplimiento', true),
  ('avisos_sat', 'crear', 'Preparar y registrar avisos SAT de escrituras', true),
  ('avisos_sat', 'generar_xml', 'Generar layouts XML individuales y paquetes mensuales SPPLD', true),
  ('avisos_sat', 'registrar_acuse', 'Asentar folios oficiales de acuse SAT y comprobantes PDF', true),
  ('avisos_sat', 'ceros', 'Declarar informe mensual en ceros ante el SAT', false)
on conflict (modulo, accion) do update
  set descripcion = excluded.descripcion,
      requiere_alcance = excluded.requiere_alcance;

-- Asignar permisos a rol Administrador si existe en la base de datos
insert into public.rol_permisos (rol_id, permiso_id, alcance)
select r.id, p.id, 'todas'
from public.roles r
cross join public.permisos p
where r.nombre in ('Administrador', 'Notario Titular')
  and p.modulo = 'avisos_sat'
on conflict (rol_id, permiso_id) do nothing;

-- 2. Tabla maestra de Avisos SAT / UIF
create table if not exists public.avisos_sat (
  id uuid primary key default gen_random_uuid(),
  escritura_id uuid references public.escrituras(id) on delete set null,
  periodo_anio integer not null check (periodo_anio >= 2000),
  periodo_mes integer not null check (periodo_mes between 1 and 12),
  tipo_aviso text not null check (tipo_aviso in ('ordinario', 'ceros', '24_horas', 'modificatorio')),
  estatus text not null default 'pendiente' check (estatus in ('pendiente', 'xml_generado', 'presentado', 'extemporaneo')),
  
  -- Datos de presentación y acuse oficial emitido por el SAT (SPPLD)
  folio_acuse_sat text,
  fecha_presentacion_sat timestamptz,
  archivo_xml_nombre text,
  archivo_xml_url text,
  archivo_acuse_pdf_url text,
  
  -- Cuantía y umbrales en UMA histórica
  monto_operacion_mxn numeric(14,2) not null default 0.00 check (monto_operacion_mxn >= 0),
  monto_operacion_uma numeric(12,2) not null default 0.00 check (monto_operacion_uma >= 0),
  
  -- Metadatos completos de la operación y del layout
  detalles_json jsonb not null default '{}'::jsonb,
  aviso_previo_id uuid references public.avisos_sat(id) on delete set null,
  notas text,
  
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices de consulta y rendimiento
create index if not exists idx_avisos_sat_escritura on public.avisos_sat(escritura_id);
create index if not exists idx_avisos_sat_periodo on public.avisos_sat(periodo_anio, periodo_mes);
create index if not exists idx_avisos_sat_estatus on public.avisos_sat(estatus);
create index if not exists idx_avisos_sat_tipo on public.avisos_sat(tipo_aviso);

-- 3. Tabla de Bitácora y Auditoría Inmutable (Conservación legal 10 años conforme a Art. 18 LFPIORPI)
create table if not exists public.avisos_sat_bitacora (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references public.avisos_sat(id) on delete cascade,
  evento text not null check (evento in ('creacion', 'xml_generado', 'pdf_descargado', 'acuse_registrado', 'ceros_declarado', 'modificado')),
  detalles jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_avisos_sat_bitacora_aviso on public.avisos_sat_bitacora(aviso_id);
create index if not exists idx_avisos_sat_bitacora_created on public.avisos_sat_bitacora(created_at desc);

-- 4. Trigger de actualización automática de timestamp
create or replace function public.fn_tr_avisos_sat_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_avisos_sat_updated_at on public.avisos_sat;
create trigger tr_avisos_sat_updated_at
  before update on public.avisos_sat
  for each row execute function public.fn_tr_avisos_sat_updated_at();

-- 5. Trigger para registro automático en bitácora inmutable al cambiar estatus
create or replace function public.fn_tr_avisos_sat_bitacora_auto()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into public.avisos_sat_bitacora (aviso_id, evento, detalles, created_by)
    values (
      new.id,
      'creacion',
      jsonb_build_object('tipo_aviso', new.tipo_aviso, 'periodo_anio', new.periodo_anio, 'periodo_mes', new.periodo_mes),
      new.created_by
    );
  elsif tg_op = 'UPDATE' then
    if old.estatus is distinct from new.estatus then
      insert into public.avisos_sat_bitacora (aviso_id, evento, detalles, created_by)
      values (
        new.id,
        case
          when new.estatus = 'xml_generado' then 'xml_generado'
          when new.estatus = 'presentado' then 'acuse_registrado'
          else 'modificado'
        end,
        jsonb_build_object(
          'estatus_anterior', old.estatus,
          'estatus_nuevo', new.estatus,
          'folio_acuse_sat', new.folio_acuse_sat,
          'fecha_presentacion_sat', new.fecha_presentacion_sat
        ),
        new.updated_by
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_avisos_sat_bitacora_auto on public.avisos_sat;
create trigger tr_avisos_sat_bitacora_auto
  after insert or update on public.avisos_sat
  for each row execute function public.fn_tr_avisos_sat_bitacora_auto();

-- 6. Vista mensual agregada: v_avisos_sat_mensual
create or replace view public.v_avisos_sat_mensual as
select
  periodo_anio,
  periodo_mes,
  count(id) as total_avisos,
  count(id) filter (where tipo_aviso = 'ordinario') as total_ordinarios,
  count(id) filter (where tipo_aviso = 'ceros') as total_ceros,
  count(id) filter (where tipo_aviso = '24_horas') as total_24h,
  count(id) filter (where estatus = 'presentado') as total_presentados,
  count(id) filter (where estatus in ('pendiente', 'xml_generado')) as total_pendientes,
  coalesce(sum(monto_operacion_mxn), 0) as monto_total_mxn,
  coalesce(sum(monto_operacion_uma), 0) as monto_total_uma
from public.avisos_sat
group by periodo_anio, periodo_mes;

-- 7. Vista detallada de avisos con escrituras hidratadas: v_avisos_sat_detalle
create or replace view public.v_avisos_sat_detalle as
select
  a.id,
  a.escritura_id,
  a.periodo_anio,
  a.periodo_mes,
  a.tipo_aviso,
  a.estatus,
  a.folio_acuse_sat,
  a.fecha_presentacion_sat,
  a.archivo_xml_nombre,
  a.archivo_xml_url,
  a.archivo_acuse_pdf_url,
  a.monto_operacion_mxn,
  a.monto_operacion_uma,
  a.detalles_json,
  a.aviso_previo_id,
  a.notas,
  a.created_at,
  a.updated_at,
  e.instrumento::text as numero_instrumento,
  e.fecha_celebracion as fecha_acto,
  aj.nombre as acto_juridico_nombre,
  aj.es_actividad_vulnerable,
  coalesce(u.nombre_completo, 'No asignado') as responsable_nombre,
  (
    select c.nombre
    from public.escritura_comparecientes ec
    join public.comparecientes c on c.id = ec.compareciente_id
    where ec.escritura_id = e.id
    order by ec.created_at asc
    limit 1
  ) as cliente_principal
from public.avisos_sat a
left join public.escrituras e on e.id = a.escritura_id
left join public.actos_juridicos aj on aj.id = e.acto_juridico_id
left join public.profiles u on u.id = e.responsable_id;

-- 8. Habilitar Row Level Security (RLS)
alter table public.avisos_sat enable row level security;
alter table public.avisos_sat_bitacora enable row level security;

-- Políticas RLS permisivas autenticadas y lectura anon
drop policy if exists "avisos_sat_all" on public.avisos_sat;
create policy "avisos_sat_all" on public.avisos_sat
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "avisos_sat_anon_select" on public.avisos_sat;
create policy "avisos_sat_anon_select" on public.avisos_sat
  for select using (true);

drop policy if exists "avisos_sat_bitacora_all" on public.avisos_sat_bitacora;
create policy "avisos_sat_bitacora_all" on public.avisos_sat_bitacora
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "avisos_sat_bitacora_anon_select" on public.avisos_sat_bitacora;
create policy "avisos_sat_bitacora_anon_select" on public.avisos_sat_bitacora
  for select using (true);

-- 9. Grants de base de datos
grant select, insert, update, delete on public.avisos_sat to authenticated, service_role;
grant select, insert on public.avisos_sat_bitacora to authenticated, service_role;
grant select on public.avisos_sat to anon;
grant select on public.avisos_sat_bitacora to anon;
grant select on public.v_avisos_sat_mensual to authenticated, anon, service_role;
grant select on public.v_avisos_sat_detalle to authenticated, anon, service_role;

notify pgrst, 'reload schema';
