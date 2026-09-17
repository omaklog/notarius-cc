-- ============================================================
-- Migración: 20260730000000_cumplimiento_pld.sql
-- Feature: 05-cumplimiento-pld (Cumplimiento PLD / UIF y Prevención de Lavado de Dinero)
-- Conforme al Art. 17 y Art. 32 LFPIORPI y Constitución §5 y §6
-- ============================================================

-- 1. Storage Buckets
insert into storage.buckets (id, name, public)
values ('pld-evidencias', 'pld-evidencias', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'pld_evidencias_all_authenticated'
  ) then
    create policy "pld_evidencias_all_authenticated" on storage.objects
      for all to authenticated
      using (bucket_id in ('pld-evidencias', 'evidencias-pld'))
      with check (bucket_id in ('pld-evidencias', 'evidencias-pld'));
  end if;
end $$;

-- 2. Ampliación de columnas en actos_juridicos para umbrales LFPIORPI
alter table public.actos_juridicos
  add column if not exists umbral_identificacion_uma numeric(12, 2),
  add column if not exists umbral_aviso_uma numeric(12, 2),
  add column if not exists limite_efectivo_uma numeric(12, 2);

-- Configuración inicial de umbrales para actos vulnerables típicos (Art. 17 y 32 LFPIORPI)
update public.actos_juridicos
set umbral_identificacion_uma = 8025.00,
    umbral_aviso_uma = 16050.00,
    limite_efectivo_uma = 8025.00
where es_actividad_vulnerable = true and (nombre ilike '%compraventa%' or nombre ilike '%inmueble%');

update public.actos_juridicos
set umbral_identificacion_uma = 3210.00,
    umbral_aviso_uma = 6420.00,
    limite_efectivo_uma = 3210.00
where es_actividad_vulnerable = true and (nombre ilike '%sociedad%' or nombre ilike '%constitucion%' or nombre ilike '%poder%');

-- 3. Catálogo de listas de restricción oficiales
create table if not exists public.pld_listas_catalogo (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  entidad_emisora text not null,
  url_consulta text not null,
  es_bloqueante boolean not null default true,
  orden integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

-- Seeder inicial de las 4 listas oficiales obligatorias
insert into public.pld_listas_catalogo (codigo, nombre, entidad_emisora, url_consulta, es_bloqueante, orden, activo)
values
  ('lpb_uif', 'Lista de Personas Bloqueadas (LPB)', 'SHCP / UIF México', 'https://sppld.sat.gob.mx/pld/interiores/personas_bloqueadas.html', true, 1, true),
  ('ofac_sdn', 'Specially Designated Nationals (SDN)', 'Departamento del Tesoro de EE.UU.', 'https://sanctionssearch.ofac.treas.gov/', true, 2, true),
  ('onu_consolidada', 'Lista Consolidada del Consejo de Seguridad', 'Organización de las Naciones Unidas', 'https://scsanctions.un.org/consolidated/', true, 3, true),
  ('sat_69b', 'Listado Definitivo Art. 69-B CFF (EFOS)', 'Servicio de Administración Tributaria', 'http://omawww.sat.gob.mx/cifras_sat/Paginas/datos/vinculacion.html', true, 4, true)
on conflict (codigo) do update
set nombre = excluded.nombre,
    entidad_emisora = excluded.entidad_emisora,
    url_consulta = excluded.url_consulta,
    es_bloqueante = excluded.es_bloqueante,
    orden = excluded.orden,
    activo = excluded.activo;

-- 4. Registro granular de consultas y evidencias PLD
create table if not exists public.pld_consultas (
  id uuid primary key default gen_random_uuid(),
  escritura_id uuid not null references public.escrituras (id) on delete cascade,
  compareciente_id uuid not null references public.comparecientes (id) on delete cascade,
  lista_id uuid not null references public.pld_listas_catalogo (id),
  metodo text not null default 'manual' check (metodo in ('manual', 'reutilizado_asistido', 'api_proveedor')),
  resultado text not null check (resultado in ('limpio', 'coincidencia_bloqueante', 'falso_positivo')),
  evidencia_storage_path text not null,
  evidencia_nombre_original text,
  evidencia_hash text,
  evidencia_size integer,
  justificacion_descarte text,
  documento_contraste_path text,
  notas text,
  consulta_original_fecha timestamptz not null default now(),
  escritura_origen_id uuid references public.escrituras (id),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  constraint uq_pld_consulta unique (escritura_id, compareciente_id, lista_id)
);

-- 5. Evaluación consolidada del instrumento notarial
create table if not exists public.pld_evaluaciones_escritura (
  escritura_id uuid primary key references public.escrituras (id) on delete cascade,
  uma_valor_aplicado numeric(10, 2) not null,
  uma_fecha_aplicada date not null,
  monto_operacion numeric(14, 2) not null default 0.00,
  veces_uma numeric(12, 2) not null default 0.00,
  monto_efectivo numeric(14, 2) not null default 0.00,
  veces_uma_efectivo numeric(12, 2) not null default 0.00,
  limite_efectivo_uma numeric(12, 2),
  excede_limite_efectivo boolean not null default false,
  umbral_identificacion_uma numeric(12, 2),
  umbral_aviso_uma numeric(12, 2),
  requiere_identificacion boolean not null default false,
  requiere_aviso_sat boolean not null default false,
  calificacion_aviso text not null default 'exento' check (calificacion_aviso in ('exento', 'identificacion', 'aviso_ordinario', 'aviso_24h')),
  estatus_global text not null default 'pendiente' check (estatus_global in ('pendiente', 'aprobado', 'bloqueado')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

-- 6. Debida diligencia reforzada para Personas Políticamente Expuestas (PEP)
create table if not exists public.pld_pep_diligencias (
  id uuid primary key default gen_random_uuid(),
  escritura_id uuid not null references public.escrituras (id) on delete cascade,
  compareciente_id uuid not null references public.comparecientes (id) on delete cascade,
  condicion_pep text not null check (condicion_pep in ('pep_directo', 'pep_asimilado')),
  cargo_publico text not null,
  dependencia text not null,
  periodo text,
  tipo_vinculo text,
  origen_fondos_declarado text not null,
  documento_soporte_path text,
  aprobado boolean not null default false,
  aprobado_por uuid references auth.users (id),
  fecha_aprobacion timestamptz,
  notas_aprobacion text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  constraint uq_pld_pep_escritura unique (escritura_id, compareciente_id)
);

-- 7. Seguridad y Políticas RLS
alter table public.pld_listas_catalogo enable row level security;
alter table public.pld_consultas enable row level security;
alter table public.pld_evaluaciones_escritura enable row level security;
alter table public.pld_pep_diligencias enable row level security;

-- Grants
grant select on public.pld_listas_catalogo to anon, authenticated, service_role;
grant select, insert, update, delete on public.pld_consultas to authenticated, service_role;
grant select, insert, update, delete on public.pld_evaluaciones_escritura to authenticated, service_role;
grant select, insert, update, delete on public.pld_pep_diligencias to authenticated, service_role;

-- Políticas de RLS
create policy "pld_listas_select_all" on public.pld_listas_catalogo
  for select to anon, authenticated using (activo = true);

create policy "pld_listas_admin_all" on public.pld_listas_catalogo
  for all to authenticated using (public.fn_has_permiso('administracion', 'acceso'));

create policy "pld_consultas_select" on public.pld_consultas
  for select to authenticated using (true);

create policy "pld_consultas_write" on public.pld_consultas
  for all to authenticated using (true) with check (true);

create policy "pld_evaluaciones_select" on public.pld_evaluaciones_escritura
  for select to authenticated using (true);

create policy "pld_evaluaciones_write" on public.pld_evaluaciones_escritura
  for all to authenticated using (true) with check (true);

create policy "pld_pep_select" on public.pld_pep_diligencias
  for select to authenticated using (true);

create policy "pld_pep_write" on public.pld_pep_diligencias
  for all to authenticated using (true) with check (true);

-- ============================================================
-- 8. Funciones Almacenadas PLD y Gate de Protocolización
-- ============================================================

-- 8.1 Cálculo dinámico y evaluación de la escritura
create or replace function public.fn_evaluar_pld_escritura (
  p_escritura_id uuid
) returns public.pld_evaluaciones_escritura language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_escritura record;
  v_acto record;
  v_uma record;
  v_fecha_ref date;
  v_valor_uma numeric(10, 2);
  v_monto_op numeric(14, 2);
  v_monto_ef numeric(14, 2);
  v_veces_uma numeric(12, 2) := 0.00;
  v_veces_ef numeric(12, 2) := 0.00;
  v_req_ident boolean := false;
  v_req_aviso boolean := false;
  v_excede_ef boolean := false;
  v_calif text := 'exento';
  v_estatus text := 'aprobado';
  v_resultado public.pld_evaluaciones_escritura;
begin
  select * into v_escritura from public.escrituras where id = p_escritura_id;
  if not found then
    raise exception 'Escritura no encontrada: %', p_escritura_id;
  end if;

  select * into v_acto from public.actos_juridicos where id = v_escritura.acto_juridico_id;
  v_fecha_ref := coalesce(v_escritura.fecha_celebracion, current_date);
  v_monto_op := coalesce(v_escritura.monto_operacion, 0.00);

  -- Leer monto efectivo existente de evaluación previa si hubiera
  select coalesce(monto_efectivo, 0.00) into v_monto_ef
  from public.pld_evaluaciones_escritura
  where escritura_id = p_escritura_id;
  if v_monto_ef is null then
    v_monto_ef := 0.00;
  end if;

  -- Buscar UMA histórica según fecha de celebración
  select valor into v_valor_uma
  from public.uma_historico
  where v_fecha_ref >= fecha_inicio_vigencia
    and (fecha_fin_vigencia is null or v_fecha_ref <= fecha_fin_vigencia)
  order by fecha_inicio_vigencia desc
  limit 1;

  if v_valor_uma is null or v_valor_uma <= 0 then
    -- Fallback prudente al último valor conocido de UMA
    select valor into v_valor_uma from public.uma_historico order by fecha_inicio_vigencia desc limit 1;
    if v_valor_uma is null then
      v_valor_uma := 113.14; -- UMA estándar 2026
    end if;
  end if;

  if v_valor_uma > 0 then
    v_veces_uma := round(v_monto_op / v_valor_uma, 2);
    v_veces_ef := round(v_monto_ef / v_valor_uma, 2);
  end if;

  -- Evaluación de umbrales solo si es actividad vulnerable
  if coalesce(v_acto.es_actividad_vulnerable, false) = true then
    if v_acto.umbral_identificacion_uma is not null and v_veces_uma >= v_acto.umbral_identificacion_uma then
      v_req_ident := true;
      v_calif := 'identificacion';
    end if;

    if v_acto.umbral_aviso_uma is not null and v_veces_uma >= v_acto.umbral_aviso_uma then
      v_req_aviso := true;
      v_calif := 'aviso_ordinario';
    end if;

    -- Control de efectivo Art. 32
    if v_acto.limite_efectivo_uma is not null and v_veces_ef > v_acto.limite_efectivo_uma then
      v_excede_ef := true;
      v_estatus := 'bloqueado';
    end if;
  else
    v_calif := 'exento';
  end if;

  -- Verificar si existen bloqueos en comparecientes
  if exists (
    select 1 from public.pld_consultas
    where escritura_id = p_escritura_id and resultado = 'coincidencia_bloqueante'
  ) then
    v_estatus := 'bloqueado';
    v_calif := 'aviso_24h';
  end if;

  -- Upsert en pld_evaluaciones_escritura
  insert into public.pld_evaluaciones_escritura (
    escritura_id, uma_valor_aplicado, uma_fecha_aplicada,
    monto_operacion, veces_uma, monto_efectivo, veces_uma_efectivo,
    limite_efectivo_uma, excede_limite_efectivo,
    umbral_identificacion_uma, umbral_aviso_uma,
    requiere_identificacion, requiere_aviso_sat,
    calificacion_aviso, estatus_global, updated_at, updated_by
  ) values (
    p_escritura_id, v_valor_uma, v_fecha_ref,
    v_monto_op, v_veces_uma, v_monto_ef, v_veces_ef,
    v_acto.limite_efectivo_uma, v_excede_ef,
    v_acto.umbral_identificacion_uma, v_acto.umbral_aviso_uma,
    v_req_ident, v_req_aviso,
    v_calif, v_estatus, now(), auth.uid()
  )
  on conflict (escritura_id) do update
  set uma_valor_aplicado = excluded.uma_valor_aplicado,
      uma_fecha_aplicada = excluded.uma_fecha_aplicada,
      monto_operacion = excluded.monto_operacion,
      veces_uma = excluded.veces_uma,
      monto_efectivo = excluded.monto_efectivo,
      veces_uma_efectivo = excluded.veces_uma_efectivo,
      limite_efectivo_uma = excluded.limite_efectivo_uma,
      excede_limite_efectivo = excluded.excede_limite_efectivo,
      umbral_identificacion_uma = excluded.umbral_identificacion_uma,
      umbral_aviso_uma = excluded.umbral_aviso_uma,
      requiere_identificacion = excluded.requiere_identificacion,
      requiere_aviso_sat = excluded.requiere_aviso_sat,
      calificacion_aviso = excluded.calificacion_aviso,
      estatus_global = excluded.estatus_global,
      updated_at = now(),
      updated_by = auth.uid()
  returning * into v_resultado;

  return v_resultado;
end;
$$;

-- 8.2 Detección de screening vigente para importación asistida (< 90 días)
create or replace function public.fn_obtener_screening_vigente (
  p_compareciente_id uuid,
  p_escritura_id_actual uuid
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_rec record;
  v_total_listas integer;
  v_consultas_limpias integer;
begin
  select count(*) into v_total_listas from public.pld_listas_catalogo where activo = true;

  -- Buscar la escritura más reciente previa donde se completaron las consultas sin bloqueos
  select
    c.escritura_id,
    e.numero_escritura as instrumento,
    max(c.consulta_original_fecha) as ultima_fecha,
    count(distinct c.lista_id) as listas_cotejadas
  into v_rec
  from public.pld_consultas c
  join public.escrituras e on e.id = c.escritura_id
  where c.compareciente_id = p_compareciente_id
    and c.escritura_id <> p_escritura_id_actual
    and c.consulta_original_fecha >= now() - interval '90 days'
    and c.resultado in ('limpio', 'falso_positivo')
  group by c.escritura_id, e.numero_escritura
  having count(distinct c.lista_id) >= v_total_listas
     and not exists (
       select 1 from public.pld_consultas c_bad
       where c_bad.escritura_id = c.escritura_id
         and c_bad.compareciente_id = p_compareciente_id
         and c_bad.resultado = 'coincidencia_bloqueante'
     )
  order by max(c.consulta_original_fecha) desc
  limit 1;

  if v_rec.escritura_id is not null then
    return jsonb_build_object(
      'encontrado', true,
      'escritura_origen_id', v_rec.escritura_id,
      'instrumento', v_rec.instrumento,
      'fecha', v_rec.ultima_fecha,
      'dias_antiguedad', extract(day from now() - v_rec.ultima_fecha)::int,
      'dias_restantes', 90 - extract(day from now() - v_rec.ultima_fecha)::int
    );
  else
    return jsonb_build_object('encontrado', false);
  end if;
end;
$$;

-- 8.3 Importación asistida de screening PLD
create or replace function public.fn_importar_screening_pld (
  p_escritura_destino_id uuid,
  p_compareciente_id uuid,
  p_escritura_origen_id uuid
) returns setof public.pld_consultas language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  return query
  insert into public.pld_consultas (
    escritura_id, compareciente_id, lista_id, metodo, resultado,
    evidencia_storage_path, evidencia_nombre_original, evidencia_hash, evidencia_size,
    justificacion_descarte, documento_contraste_path, notas,
    consulta_original_fecha, escritura_origen_id, created_at, created_by
  )
  select
    p_escritura_destino_id,
    p_compareciente_id,
    c.lista_id,
    'reutilizado_asistido',
    c.resultado,
    c.evidencia_storage_path,
    c.evidencia_nombre_original,
    c.evidencia_hash,
    c.evidencia_size,
    c.justificacion_descarte,
    c.documento_contraste_path,
    concat('Dictamen importado de Instrumento previo (origen: ', p_escritura_origen_id::text, ')'),
    c.consulta_original_fecha,
    p_escritura_origen_id,
    now(),
    auth.uid()
  from public.pld_consultas c
  where c.escritura_id = p_escritura_origen_id
    and c.compareciente_id = p_compareciente_id
  on conflict (escritura_id, compareciente_id, lista_id) do update
  set metodo = excluded.metodo,
      resultado = excluded.resultado,
      evidencia_storage_path = excluded.evidencia_storage_path,
      evidencia_nombre_original = excluded.evidencia_nombre_original,
      evidencia_hash = excluded.evidencia_hash,
      evidencia_size = excluded.evidencia_size,
      justificacion_descarte = excluded.justificacion_descarte,
      documento_contraste_path = excluded.documento_contraste_path,
      notas = excluded.notas,
      consulta_original_fecha = excluded.consulta_original_fecha,
      escritura_origen_id = excluded.escritura_origen_id
  returning *;
end;
$$;

-- 8.4 Aprobación de Debida Diligencia PEP por Notario Titular o Administrador
create or replace function public.fn_aprobar_diligencia_pep (
  p_diligencia_id uuid,
  p_notas text
) returns public.pld_pep_diligencias language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_res public.pld_pep_diligencias;
begin
  -- Validación estricta RBAC: solo notario_titular o administrador
  if not (
    public.fn_has_permiso('administracion', 'acceso') or
    exists (
      select 1 from public.profiles pr
      join public.roles r on r.id = pr.rol_id
      where pr.id = auth.uid()
        and (lower(r.nombre) in ('notario titular', 'administrador') or r.es_sistema = true)
    )
  ) then
    raise exception 'Acceso denegado: Se requiere rol de Notario Titular o Administrador para autorizar diligencia PEP.';
  end if;

  update public.pld_pep_diligencias
  set aprobado = true,
      aprobado_por = auth.uid(),
      fecha_aprobacion = now(),
      notas_aprobacion = p_notas
  where id = p_diligencia_id
  returning * into v_res;

  if not found then
    raise exception 'Registro de diligencia PEP no encontrado: %', p_diligencia_id;
  end if;

  return v_res;
end;
$$;

-- 8.5 Sustitución definitiva del gate de protocolización
create or replace function public.fn_validar_protocolizacion (
  p_escritura_id uuid
) returns text[] language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_motivos text[] := '{}';
  v_es_traslativo boolean := false;
  v_es_vulnerable boolean := false;
  v_total_listas integer;
  v_comparecientes_totales integer;
  v_conteo_porcentajes integer;
  v_suma_porcentajes numeric;
  v_evaluacion record;
begin
  -- 1. Consultar atributos del acto jurídico
  select
    coalesce(aj.tipo = 'traslativo', false),
    coalesce(aj.es_actividad_vulnerable, false)
  into v_es_traslativo, v_es_vulnerable
  from public.escrituras e
  join public.actos_juridicos aj on aj.id = e.acto_juridico_id
  where e.id = p_escritura_id;

  select count(*) into v_total_listas from public.pld_listas_catalogo where activo = true;
  select count(*) into v_comparecientes_totales from public.escritura_comparecientes where escritura_id = p_escritura_id;

  -- A. Exigencia de comparecientes vinculados
  if v_comparecientes_totales = 0 then
    v_motivos := array_append(v_motivos, 'La escritura no tiene comparecientes vinculados.');
  else
    -- B. Screening Universal de Listas para todo otorgante
    -- Verificar si existe algún compareciente que no tenga completas las listas activas
    if exists (
      select ec.compareciente_id
      from public.escritura_comparecientes ec
      left join public.pld_consultas c on c.escritura_id = ec.escritura_id
                                       and c.compareciente_id = ec.compareciente_id
                                       and c.consulta_original_fecha >= now() - interval '90 days'
      where ec.escritura_id = p_escritura_id
      group by ec.compareciente_id
      having count(distinct c.lista_id) < v_total_listas
    ) then
      v_motivos := array_append(v_motivos, 'Hay comparecientes con screening PLD incompleto o con cotejos vencidos (> 90 días).');
    end if;

    -- C. Bloqueos activos sin descarte
    if exists (
      select 1 from public.pld_consultas c
      where c.escritura_id = p_escritura_id
        and c.resultado = 'coincidencia_bloqueante'
    ) then
      v_motivos := array_append(v_motivos, 'Hay comparecientes con coincidencia confirmada en listas de restricción (LPB / SAT 69-B).');
    end if;

    -- D. Debida diligencia PEP no aprobada
    if exists (
      select 1 from public.pld_pep_diligencias d
      where d.escritura_id = p_escritura_id
        and d.aprobado is not true
    ) then
      v_motivos := array_append(v_motivos, 'Hay comparecientes PEP con debida diligencia pendiente de autorización por el Notario Titular.');
    end if;

    -- E. Beneficiario Controlador para Personas Morales en actos vulnerables o traslativos (CFF 32-B Quáter)
    if (v_es_traslativo or v_es_vulnerable) and exists (
      select 1
      from public.escritura_comparecientes ec
      join public.comparecientes c on c.id = ec.compareciente_id
      where ec.escritura_id = p_escritura_id
        and c.tipo = 'moral'
        and not exists (
          select 1 from public.compareciente_beneficiarios_controladores bc
          where bc.persona_moral_id = c.id
        )
    ) then
      v_motivos := array_append(v_motivos, 'Hay personas morales que comparecen sin Beneficiario Controlador acreditado (Art. 32-B Quáter CFF).');
    end if;
  end if;

  -- F. Control de límite de efectivo Art. 32 LFPIORPI
  if v_es_vulnerable then
    select * into v_evaluacion from public.pld_evaluaciones_escritura where escritura_id = p_escritura_id;
    if found and v_evaluacion.excede_limite_efectivo = true then
      v_motivos := array_append(v_motivos, 'El monto liquidado en efectivo excede el límite legal en UMA permitido (Art. 32 LFPIORPI).');
    end if;
  end if;

  -- G. Predio georreferenciado si el acto jurídico es traslativo
  if v_es_traslativo and to_regclass('public.predios') is not null then
    if not exists (
      select 1 from public.predios pr
      where pr.escritura_id = p_escritura_id
        and pr.poligono is not null
    ) then
      v_motivos := array_append(v_motivos, 'El acto jurídico es traslativo y no tiene un predio georreferenciado asociado.');
    end if;
  end if;

  -- H. Suma 100% de participación en roles con alícuota capturada
  select count(*), coalesce(sum(porcentaje_participacion), 0)
    into v_conteo_porcentajes, v_suma_porcentajes
  from public.escritura_comparecientes
  where escritura_id = p_escritura_id
    and porcentaje_participacion is not null;

  if v_conteo_porcentajes > 0 and v_suma_porcentajes <> 100 then
    v_motivos := array_append(v_motivos, 'Los porcentajes de participación capturados no suman 100%.');
  end if;

  return v_motivos;
end;
$$;
