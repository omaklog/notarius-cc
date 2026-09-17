-- ============================================================================
-- Migración: 20260804000000_pasos_tramites_y_dependencias.sql
-- Módulo: 07-tramites y 08-ordenes-pago (Seeder de Dependencias, Pipeline de 17 Pasos y Bitácora Histórica)
-- Conforme a la Constitución del Sistema Notarial (§1, §3, §4, §7, §8)
-- ============================================================================

-- 1. Agregar columna clave_numerica en cat_dependencias_oficiales si no existe
alter table public.cat_dependencias_oficiales
  add column if not exists clave_numerica integer unique;

-- 2. Asegurar la presencia exclusiva de las 6 dependencias oficiales
insert into public.cat_dependencias_oficiales (sigla, nombre, clave_numerica, dias_habiles_compromiso, activo)
values
  ('NOTARIA', 'Notaría / Gestión Interna', 0, 5, true),
  ('CATASTRO_EST', 'Dirección de Catastro Estatal', 1, 10, true),
  ('CATASTRO_MUN', 'Catastro y Tesorería Municipal', 2, 7, true),
  ('RPP', 'Registro Público de la Propiedad', 3, 15, true),
  ('CONTROL_INT', 'Control Interno y Entrega de Testimonio', 4, 5, true),
  ('INFONAVIT', 'INFONAVIT - Créditos y Titulación', 5, 10, true)
on conflict (sigla) do update
set
  nombre = excluded.nombre,
  clave_numerica = excluded.clave_numerica,
  dias_habiles_compromiso = excluded.dias_habiles_compromiso,
  direccion = null,
  portal_web = null,
  activo = true;

-- Eliminar cualquier dependencia no autorizada por el usuario
delete from public.cat_dependencias_oficiales
where sigla not in ('NOTARIA', 'CATASTRO_EST', 'CATASTRO_MUN', 'RPP', 'CONTROL_INT', 'INFONAVIT');

-- Limpiar cualquier dirección o portal ficticio
update public.cat_dependencias_oficiales
set direccion = null, portal_web = null;

-- 3. Tabla del Catálogo Maestro de Pasos de Trámite / Pipeline de Gestoría
create table if not exists public.cat_pasos_tramite (
  id integer primary key,
  nombre text not null,
  orden integer not null,
  dependencia_clave integer not null,
  dependencia_id uuid references public.cat_dependencias_oficiales(id) on delete set null,
  genera_orden_pago boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cat_pasos_tramite is 'Catálogo maestro de pasos de gestoría notarial ordenados y configurables desde el panel de administración.';

create index if not exists idx_cat_pasos_tramite_orden on public.cat_pasos_tramite(orden);
create index if not exists idx_cat_pasos_tramite_dep on public.cat_pasos_tramite(dependencia_clave);

-- 4. Seeder oficial de los 17 pasos solicitados
insert into public.cat_pasos_tramite (id, nombre, orden, dependencia_clave, genera_orden_pago, activo)
values
  (1, 'CAPTURA', 1, 0, false, true),
  (2, 'ING. CAT. EST.', 2, 1, false, true),
  (4, 'RECHAZO CAT. EST.', 3, 1, false, true),
  (3, 'O.P. CAT. EST.', 4, 1, true, true),
  (6, 'CORREGIR CED. EST.', 5, 1, false, true),
  (5, 'CEDULA CAT. EST.', 6, 1, false, true),
  (14, 'ING. TRAM. MUN.', 7, 2, false, true),
  (15, 'RECHAZO MUNICIPAL', 8, 2, false, true),
  (16, 'O.P. MUNICIPAL', 9, 2, true, true),
  (7, 'PAGO T.D.', 10, 0, false, true),
  (17, 'P.T. FIRMADO Y SELLADO', 11, 0, false, true),
  (8, 'ORD. DE PAG. R.P.P.', 12, 3, true, true),
  (9, 'INGRESO A R.P.P.', 13, 3, false, true),
  (10, 'RECHAZO R.P.P.', 14, 3, false, true),
  (11, 'REINGRESO A R.P.P', 15, 3, false, true),
  (12, 'SALIDA DE R.P.P', 16, 4, false, true),
  (13, '1ER TEST AL CLIENTE', 17, 4, false, true)
on conflict (id) do update
set
  nombre = excluded.nombre,
  orden = excluded.orden,
  dependencia_clave = excluded.dependencia_clave,
  genera_orden_pago = excluded.genera_orden_pago,
  activo = excluded.activo;

-- Vincular la clave de dependencia con el UUID correspondiente
update public.cat_pasos_tramite cpt
set dependencia_id = cdo.id
from public.cat_dependencias_oficiales cdo
where cdo.clave_numerica = cpt.dependencia_clave;

-- 5. Tabla de Bitácora Histórica de Pasos por Escritura (Eventos cronológicos repetibles)
create table if not exists public.tramite_pasos_escritura (
  id uuid primary key default gen_random_uuid(),
  escritura_id uuid not null references public.escrituras(id) on delete cascade,
  paso_id integer not null references public.cat_pasos_tramite(id) on delete cascade,
  dependencia_clave integer not null default 0,
  dependencia_id uuid references public.cat_dependencias_oficiales(id) on delete set null,
  folio_volante text,
  completado boolean not null default true,
  fecha_completado timestamptz default now(),
  fecha_registro timestamptz not null default now(),
  completado_por uuid references public.profiles(id) on delete set null,
  notas text,
  orden_pago_id uuid references public.ordenes_pago(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Si la restricción unique previa existía, eliminarla para soportar bitácora repetible
alter table public.tramite_pasos_escritura
  drop constraint if exists tramite_pasos_escritura_escritura_id_paso_id_key;

-- Asegurar columnas en caso de tablas ya creadas
alter table public.tramite_pasos_escritura
  add column if not exists dependencia_clave integer not null default 0,
  add column if not exists dependencia_id uuid references public.cat_dependencias_oficiales(id) on delete set null,
  add column if not exists folio_volante text,
  add column if not exists fecha_registro timestamptz not null default now();

comment on table public.tramite_pasos_escritura is 'Bitácora histórica cronológica de pasos y movimientos de ventanilla por cada escritura pública.';

create index if not exists idx_tramite_pasos_escritura_esc on public.tramite_pasos_escritura(escritura_id);
create index if not exists idx_tramite_pasos_escritura_paso on public.tramite_pasos_escritura(paso_id);
create index if not exists idx_tramite_pasos_escritura_dep on public.tramite_pasos_escritura(dependencia_clave);
create index if not exists idx_tramite_pasos_escritura_fecha on public.tramite_pasos_escritura(fecha_registro desc);

-- 6. Vista unificada histórica de movimientos por escritura: v_tramite_pasos_historial
create or replace view public.v_tramite_pasos_historial as
select
  tpe.id as registro_id,
  tpe.escritura_id,
  tpe.paso_id,
  cpt.nombre as paso_nombre,
  cpt.orden as paso_orden,
  cpt.genera_orden_pago,
  tpe.dependencia_clave,
  coalesce(tpe.dependencia_id, cdo.id) as dependencia_id,
  cdo.sigla as dependencia_sigla,
  cdo.nombre as dependencia_nombre,
  tpe.folio_volante,
  tpe.notas,
  tpe.fecha_registro,
  tpe.completado,
  tpe.completado_por,
  u.nombre_completo as completado_por_nombre,
  tpe.orden_pago_id,
  op.folio as orden_pago_folio,
  op.monto as orden_pago_monto,
  op.estado as orden_pago_estado,
  op.linea_captura as orden_pago_linea_captura
from public.tramite_pasos_escritura tpe
join public.cat_pasos_tramite cpt on cpt.id = tpe.paso_id
left join public.cat_dependencias_oficiales cdo on (cdo.id = tpe.dependencia_id or cdo.clave_numerica = tpe.dependencia_clave)
left join public.profiles u on u.id = tpe.completado_por
left join public.ordenes_pago op on op.id = tpe.orden_pago_id
order by tpe.fecha_registro desc, tpe.created_at desc;

-- 7. Vista agregada por dependencia para cada escritura: v_tramite_dependencias_resumen
create or replace view public.v_tramite_dependencias_resumen as
with ranked_pasos as (
  select
    tpe.id as registro_id,
    tpe.escritura_id,
    tpe.dependencia_clave,
    tpe.dependencia_id,
    tpe.paso_id,
    tpe.folio_volante,
    tpe.notas,
    tpe.fecha_registro,
    tpe.completado_por,
    tpe.orden_pago_id,
    cpt.nombre as paso_nombre,
    cpt.genera_orden_pago,
    cdo.sigla as dep_sigla,
    cdo.nombre as dep_nombre,
    cdo.dias_habiles_compromiso as dep_dias_habiles,
    u.nombre_completo as responsable_nombre,
    row_number() over (
      partition by tpe.escritura_id, tpe.dependencia_clave 
      order by tpe.fecha_registro desc, tpe.created_at desc
    ) as rn
  from public.tramite_pasos_escritura tpe
  join public.cat_pasos_tramite cpt on cpt.id = tpe.paso_id
  left join public.cat_dependencias_oficiales cdo on (cdo.id = tpe.dependencia_id or cdo.clave_numerica = tpe.dependencia_clave)
  left join public.profiles u on u.id = tpe.completado_por
)
select
  escritura_id,
  dependencia_clave,
  dependencia_id,
  coalesce(dep_sigla, 'DEP_' || dependencia_clave) as dependencia_sigla,
  coalesce(dep_nombre, 'Dependencia ' || dependencia_clave) as dependencia_nombre,
  coalesce(dep_dias_habiles, 10) as dependencia_dias_habiles,
  paso_id as ultimo_paso_id,
  paso_nombre as ultimo_paso_nombre,
  folio_volante as ultimo_folio_volante,
  notas as ultimas_notas,
  fecha_registro as ultima_fecha_registro,
  completado_por as ultimo_responsable_id,
  responsable_nombre as ultimo_responsable_nombre,
  orden_pago_id as ultima_orden_pago_id,
  genera_orden_pago as ultimo_genera_orden_pago,
  (
    select count(*)::int from public.tramite_pasos_escritura sub 
    where sub.escritura_id = ranked_pasos.escritura_id and sub.dependencia_clave = ranked_pasos.dependencia_clave
  ) as total_movimientos
from ranked_pasos
where rn = 1;

-- Vista heredada para compatibilidad: v_tramite_pasos_escritura
create or replace view public.v_tramite_pasos_escritura as
select * from public.v_tramite_pasos_historial;

-- 8. Habilitar RLS
alter table public.cat_pasos_tramite enable row level security;
alter table public.tramite_pasos_escritura enable row level security;

-- Políticas permisivas para desarrollo y producción
drop policy if exists "cat_pasos_all" on public.cat_pasos_tramite;
drop policy if exists "cat_pasos_select" on public.cat_pasos_tramite;
drop policy if exists "cat_pasos_admin" on public.cat_pasos_tramite;
create policy "cat_pasos_all" on public.cat_pasos_tramite
  for all using (true) with check (true);

drop policy if exists "tramite_pasos_escritura_all" on public.tramite_pasos_escritura;
drop policy if exists "tramite_pasos_escritura_anon_select" on public.tramite_pasos_escritura;
create policy "tramite_pasos_escritura_all" on public.tramite_pasos_escritura
  for all using (true) with check (true);

-- 9. Permisos y Grants
grant select, insert, update, delete on public.cat_pasos_tramite to authenticated, anon, service_role;
grant select, insert, update, delete on public.tramite_pasos_escritura to authenticated, anon, service_role;
grant select, insert, update, delete on public.cat_dependencias_oficiales to authenticated, anon, service_role;

grant select on public.v_tramite_pasos_historial to authenticated, anon, service_role;
grant select on public.v_tramite_dependencias_resumen to authenticated, anon, service_role;
grant select on public.v_tramite_pasos_escritura to authenticated, anon, service_role;

notify pgrst, 'reload schema';
