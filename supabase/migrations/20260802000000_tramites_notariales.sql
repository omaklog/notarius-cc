-- ============================================================================
-- Módulo 07: Trámites Notariales, Fases Procesales, Dependencias y Tiempos
-- ============================================================================

-- 1. Catálogo de Dependencias Oficiales
create table if not exists public.cat_dependencias_oficiales (
  id uuid primary key default gen_random_uuid(),
  sigla text unique not null,
  nombre text not null,
  clave_numerica integer unique,
  direccion text,
  portal_web text,
  dias_habiles_compromiso integer not null default 10,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cat_dependencias_oficiales is 'Dependencias gubernamentales y oficinas registrales ante las cuales se gestiona la fe pública notarial.';

-- 2. Catálogo de Tipos de Trámites Notariales
create table if not exists public.cat_tipos_tramite_notarial (
  id uuid primary key default gen_random_uuid(),
  dependencia_id uuid not null references public.cat_dependencias_oficiales(id) on delete cascade,
  codigo text unique not null,
  nombre text not null,
  descripcion text,
  fase_default text not null check (fase_default in ('previo', 'firma_otorgamiento', 'posterior_fiscal', 'inscripcion_definitiva', 'entrega_cliente')),
  dias_habiles_compromiso integer not null default 10,
  requerido_protocolizacion boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cat_tipos_tramite_notarial is 'Catálogo maestro de trámites notariales clasificados por dependencia oficial y fase procesal.';

-- 3. Tabla de Trámites por Escritura
create table if not exists public.tramites_escritura (
  id uuid primary key default gen_random_uuid(),
  escritura_id uuid not null references public.escrituras(id) on delete cascade,
  tipo_tramite_id uuid not null references public.cat_tipos_tramite_notarial(id),
  dependencia_id uuid not null references public.cat_dependencias_oficiales(id),
  fase text not null check (fase in ('previo', 'firma_otorgamiento', 'posterior_fiscal', 'inscripcion_definitiva', 'entrega_cliente')),
  estado text not null default 'solicitado' check (estado in ('solicitado', 'en_proceso', 'ingresado_dependencia', 'prevenido_observado', 'subsanado', 'concluido_favorable', 'rechazado_cancelado')),
  folio_dependencia text,
  responsable_id uuid references public.profiles(id) on delete set null,
  fecha_solicitud date not null default current_date,
  fecha_ingreso date,
  fecha_limite_estimada date,
  fecha_conclusion date,
  orden_pago_id uuid,
  documento_resultado_id uuid references public.expediente_documentos(id) on delete set null,
  observaciones text,
  motivo_cancelacion text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tramites_escritura is 'Seguimiento individual de gestiones y trámites oficiales vinculados a un instrumento notarial.';

-- Índices de consulta frecuente
create index if not exists idx_tramites_escritura_escritura_id on public.tramites_escritura(escritura_id);
create index if not exists idx_tramites_escritura_estado on public.tramites_escritura(estado);
create index if not exists idx_tramites_escritura_fase on public.tramites_escritura(fase);
create index if not exists idx_tramites_escritura_responsable on public.tramites_escritura(responsable_id);

-- 4. Tabla de Prevenciones Registrales
create table if not exists public.tramite_prevenciones (
  id uuid primary key default gen_random_uuid(),
  tramite_id uuid not null references public.tramites_escritura(id) on delete cascade,
  folio_prevencion text not null,
  oficio_observacion text,
  motivo_observacion text not null,
  registrador_nombre text,
  fecha_notificacion date not null default current_date,
  fecha_limite_subsanacion date not null,
  subsanado boolean not null default false,
  fecha_subsanacion date,
  folio_reingreso text,
  documento_subsanacion_id uuid references public.expediente_documentos(id) on delete set null,
  notas_subsanacion text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tramite_prevenciones is 'Historial de notas de prevención, suspensiones y subsanaciones formuladas por autoridades registrales.';

create index if not exists idx_tramite_prevenciones_tramite_id on public.tramite_prevenciones(tramite_id);

-- 5. Función de cálculo de días hábiles (excluyendo sábados y domingos)
create or replace function public.fn_calcular_dias_habiles(
  p_fecha_inicio date,
  p_dias_habiles integer
) returns date language plpgsql immutable as $$
declare
  v_fecha date := p_fecha_inicio;
  v_agregados integer := 0;
begin
  if p_fecha_inicio is null or p_dias_habiles is null or p_dias_habiles <= 0 then
    return p_fecha_inicio;
  end if;

  while v_agregados < p_dias_habiles loop
    v_fecha := v_fecha + 1;
    -- 0 = domingo, 6 = sábado
    if extract(dow from v_fecha) not in (0, 6) then
      v_agregados := v_agregados + 1;
    end if;
  end loop;

  return v_fecha;
end;
$$;

-- 6. Trigger para calcular automáticamente fecha_limite_estimada al ingresar trámite
create or replace function public.fn_tr_tramite_fecha_limite()
returns trigger language plpgsql as $$
declare
  v_dias integer := 10;
begin
  if new.fecha_ingreso is not null and new.fecha_limite_estimada is null then
    select coalesce(ctt.dias_habiles_compromiso, cdo.dias_habiles_compromiso, 10)
    into v_dias
    from public.cat_tipos_tramite_notarial ctt
    left join public.cat_dependencias_oficiales cdo on cdo.id = ctt.dependencia_id
    where ctt.id = new.tipo_tramite_id;

    new.fecha_limite_estimada := public.fn_calcular_dias_habiles(new.fecha_ingreso, coalesce(v_dias, 10));
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tr_tramite_fecha_limite on public.tramites_escritura;
create trigger tr_tramite_fecha_limite
  before insert or update on public.tramites_escritura
  for each row execute function public.fn_tr_tramite_fecha_limite();

-- Asegurar columna expediente en escrituras si no existiese
alter table public.escrituras add column if not exists expediente text;

-- 7. Vista Enriquecida de Trámites: v_tramites_resumen
create or replace view public.v_tramites_resumen as
select
  t.id,
  t.escritura_id,
  t.tipo_tramite_id,
  t.dependencia_id,
  t.fase,
  t.estado,
  t.folio_dependencia,
  t.responsable_id,
  t.fecha_solicitud,
  t.fecha_ingreso,
  t.fecha_limite_estimada,
  t.fecha_conclusion,
  t.orden_pago_id,
  t.documento_resultado_id,
  t.observaciones,
  t.motivo_cancelacion,
  t.created_by,
  t.created_at,
  t.updated_at,
  -- Catálogos
  ctt.nombre as tipo_tramite_nombre,
  ctt.codigo as tipo_tramite_codigo,
  cdo.sigla as dependencia_sigla,
  cdo.nombre as dependencia_nombre,
  cdo.portal_web as dependencia_portal_web,
  -- Escritura
  e.instrumento as escritura_instrumento,
  coalesce(e.expediente, 'EXP-' || e.anio || '-' || e.instrumento) as escritura_expediente,
  aj.nombre as acto_nombre,
  -- Gestor
  u.nombre_completo as responsable_nombre,
  -- Días restantes y Semáforo dinámico
  case
    when t.estado = 'concluido_favorable' then 0
    when t.estado = 'rechazado_cancelado' then 0
    when t.fecha_limite_estimada is null then 0
    else (t.fecha_limite_estimada - current_date)
  end as dias_habiles_restantes,
  case
    when t.estado = 'concluido_favorable' then 'azul'
    when t.estado = 'rechazado_cancelado' then 'gris'
    when t.estado = 'prevenido_observado' then 'rojo'
    when t.fecha_limite_estimada is null then 'gris'
    when t.fecha_limite_estimada < current_date then 'rojo'
    when (t.fecha_limite_estimada - current_date) <= 3 then 'amarillo'
    else 'verde'
  end as semaforo
from public.tramites_escritura t
join public.cat_tipos_tramite_notarial ctt on ctt.id = t.tipo_tramite_id
join public.cat_dependencias_oficiales cdo on cdo.id = t.dependencia_id
join public.escrituras e on e.id = t.escritura_id
left join public.actos_juridicos aj on aj.id = e.acto_juridico_id
left join public.profiles u on u.id = t.responsable_id;

-- 8. Función para generar plantilla asistida de trámites por acto notarial
create or replace function public.fn_generar_tramites_plantilla_acto(
  p_escritura_id uuid
) returns integer language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_acto_id uuid;
  v_es_traslativo boolean := false;
  v_acto_nombre text := '';
  v_insertados integer := 0;
  v_tipo record;
begin
  select e.acto_juridico_id, coalesce(aj.tipo = 'traslativo', false), coalesce(aj.nombre, '')
  into v_acto_id, v_es_traslativo, v_acto_nombre
  from public.escrituras e
  left join public.actos_juridicos aj on aj.id = e.acto_juridico_id
  where e.id = p_escritura_id;

  if not found then
    return 0;
  end if;

  -- Si es acto traslativo (e.g. Compraventa, Donación, Dación en Pago)
  if v_es_traslativo or v_acto_nombre ilike '%compraventa%' or v_acto_nombre ilike '%adjudicacion%' then
    for v_tipo in (
      select id, dependencia_id, fase_default
      from public.cat_tipos_tramite_notarial
      where codigo in (
        'RPP_CLG_1ER_AVISO',
        'CATASTRO_EST_AVALUO',
        'CATASTRO_MUN_PREDIAL',
        'RPP_2DO_AVISO',
        'RPP_INSCRIPCION_TESTIMONIO',
        'ENTREGA_TESTIMONIO_CLIENTE'
      )
      and activo = true
    ) loop
      if not exists (
        select 1 from public.tramites_escritura
        where escritura_id = p_escritura_id and tipo_tramite_id = v_tipo.id
      ) then
        insert into public.tramites_escritura (
          escritura_id, tipo_tramite_id, dependencia_id, fase, estado
        ) values (
          p_escritura_id, v_tipo.id, v_tipo.dependencia_id, v_tipo.fase_default, 'solicitado'
        );
        v_insertados := v_insertados + 1;
      end if;
    end loop;
  else
    for v_tipo in (
      select id, dependencia_id, fase_default
      from public.cat_tipos_tramite_notarial
      where codigo in ('RPP_INSCRIPCION_TESTIMONIO', 'ENTREGA_TESTIMONIO_CLIENTE')
      and activo = true
    ) loop
      if not exists (
        select 1 from public.tramites_escritura
        where escritura_id = p_escritura_id and tipo_tramite_id = v_tipo.id
      ) then
        insert into public.tramites_escritura (
          escritura_id, tipo_tramite_id, dependencia_id, fase, estado
        ) values (
          p_escritura_id, v_tipo.id, v_tipo.dependencia_id, v_tipo.fase_default, 'solicitado'
        );
        v_insertados := v_insertados + 1;
      end if;
    end loop;
  end if;

  return v_insertados;
end;
$$;

-- 9. Actualización Integral del Gate de Protocolización con Sección J (Trámites Previos Requeridos)
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
  v_eval_exp jsonb;
  v_faltantes jsonb;
  v_sin_cotejo jsonb;
  v_item text;
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
        and pr.geometria is not null
    ) then
      v_motivos := array_append(v_motivos, 'La escritura es de acto traslativo y no tiene predio georreferenciado.');
    end if;
  end if;

  -- H. Suma de porcentajes de comparecientes (100% de propiedad transmitida/adquirida)
  select count(*), coalesce(sum(porcentaje_participacion), 0)
  into v_conteo_porcentajes, v_suma_porcentajes
  from public.escritura_comparecientes
  where escritura_id = p_escritura_id
    and porcentaje_participacion is not null;

  if v_conteo_porcentajes > 0 and v_suma_porcentajes <> 100.0 then
    v_motivos := array_append(v_motivos, 'La suma de porcentajes de los comparecientes debe ser exactamente 100% (actual: ' || v_suma_porcentajes || '%).');
  end if;

  -- I. Integración Documental del Expediente y Fe de Cotejo de Títulos/Poderes
  v_eval_exp := public.fn_evaluar_requisitos_expediente(p_escritura_id);
  v_faltantes := v_eval_exp->'obligatorios_faltantes';
  v_sin_cotejo := v_eval_exp->'titulos_o_poderes_sin_cotejo';

  if jsonb_array_length(v_faltantes) > 0 then
    for v_item in select jsonb_array_elements_text(v_faltantes) loop
      v_motivos := array_append(v_motivos, 'Expediente incompleto: falta documento obligatorio "' || v_item || '" (o dispensa notarial fundada).');
    end loop;
  end if;

  if jsonb_array_length(v_sin_cotejo) > 0 then
    for v_item in select jsonb_array_elements_text(v_sin_cotejo) loop
      v_motivos := array_append(v_motivos, 'Fe de cotejo requerida: el documento "' || v_item || '" debe ser cotejado físicamente contra su original o contar con dispensa notarial.');
    end loop;
  end if;

  -- J. Trámites Previos Requeridos (Regla de Usuario: Bloquea si hay trámites previos pendientes; si no tiene trámites, pase libre)
  if exists (
    select 1 from public.tramites_escritura
    where escritura_id = p_escritura_id
      and fase = 'previo'
      and estado not in ('concluido_favorable', 'rechazado_cancelado')
  ) then
    for v_item in (
      select coalesce(t.folio_dependencia, ctt.nombre, 'Trámite previo') || ' (' || dep.sigla || ')'
      from public.tramites_escritura t
      join public.cat_tipos_tramite_notarial ctt on ctt.id = t.tipo_tramite_id
      join public.cat_dependencias_oficiales dep on dep.id = t.dependencia_id
      where t.escritura_id = p_escritura_id
        and t.fase = 'previo'
        and t.estado not in ('concluido_favorable', 'rechazado_cancelado')
    ) loop
      v_motivos := array_append(v_motivos, 'Trámite previo pendiente: "' || v_item || '" debe concluirse favorablemente o cancelarse antes de protocolizar.');
    end loop;
  end if;

  return v_motivos;
end;
$$;

-- 10. Seeds Oficiales de Dependencias y Trámites
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
  activo = true;

-- Seed de tipos de trámites notariales
with deps as (
  select id, sigla from public.cat_dependencias_oficiales
)
insert into public.cat_tipos_tramite_notarial (
  dependencia_id, codigo, nombre, descripcion, fase_default, dias_habiles_compromiso, requerido_protocolizacion, activo
)
select
  d.id,
  v.codigo,
  v.nombre,
  v.descripcion,
  v.fase_default,
  v.dias_habiles_compromiso,
  v.requerido_protocolizacion,
  true
from (values
  ('RPP', 'RPP_CLG_1ER_AVISO', 'Certificado de Libertad de Gravámenes con 1er Aviso Preventivo', 'Constancia registral de titularidad y gravámenes con protección de prelación notarial previa a la firma', 'previo', 15, true),
  ('RPP', 'RPP_2DO_AVISO', 'Segundo Aviso Preventivo de Otorgamiento', 'Aviso registral de otorgamiento y firma del instrumento ante el Notario', 'firma_otorgamiento', 5, false),
  ('RPP', 'RPP_INSCRIPCION_TESTIMONIO', 'Inscripción Definitiva de Primer Testimonio', 'Ingreso de testimonio notarial con volante de prelación para calificación e inscripción en Folio Real', 'inscripcion_definitiva', 20, false),
  ('CATASTRO_EST', 'CATASTRO_EST_AVALUO', 'Certificación de Clave y Valor Catastral / Cédula Estatal', 'Dictamen técnico para fijación de base gravable de impuestos inmobiliarios', 'previo', 10, true),
  ('CATASTRO_MUN', 'CATASTRO_MUN_PREDIAL', 'Certificación de No Adeudo Predial y Trámite Municipal', 'Constancia municipal de solvencia tributaria inmobiliaria', 'previo', 7, true),
  ('CONTROL_INT', 'ENTREGA_TESTIMONIO_CLIENTE', 'Expedición y Entrega de Testimonio Foliado', 'Cotejo final de boletas registrales, engrose y entrega física/electrónica al cliente', 'entrega_cliente', 5, false),
  ('INFONAVIT', 'INFONAVIT_TITULACION', 'Gestión de Crédito y Titulación INFONAVIT', 'Trámite de paquete de titulación e instrucción de crédito institucional', 'previo', 10, false)
) as v(dep_sigla, codigo, nombre, descripcion, fase_default, dias_habiles_compromiso, requerido_protocolizacion)
join deps d on d.sigla = v.dep_sigla
on conflict (codigo) do update
set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  fase_default = excluded.fase_default,
  dias_habiles_compromiso = excluded.dias_habiles_compromiso,
  requerido_protocolizacion = excluded.requerido_protocolizacion;

-- 11. Habilitar RLS en tablas creadas
alter table public.cat_dependencias_oficiales enable row level security;
alter table public.cat_tipos_tramite_notarial enable row level security;
alter table public.tramites_escritura enable row level security;
alter table public.tramite_prevenciones enable row level security;

-- Políticas de Seguridad
drop policy if exists "cat_dependencias_select" on public.cat_dependencias_oficiales;
create policy "cat_dependencias_select" on public.cat_dependencias_oficiales for select using (true);

drop policy if exists "cat_tipos_tramite_select" on public.cat_tipos_tramite_notarial;
create policy "cat_tipos_tramite_select" on public.cat_tipos_tramite_notarial for select using (true);

drop policy if exists "tramites_escritura_all" on public.tramites_escritura;
drop policy if exists "tramites_escritura_anon_select" on public.tramites_escritura;
create policy "tramites_escritura_all" on public.tramites_escritura
  for all using (true) with check (true);

drop policy if exists "tramite_prevenciones_all" on public.tramite_prevenciones;
drop policy if exists "tramite_prevenciones_anon_select" on public.tramite_prevenciones;
create policy "tramite_prevenciones_all" on public.tramite_prevenciones
  for all using (true) with check (true);

-- 12. Permisos y Grants
grant select, insert, update, delete on public.cat_dependencias_oficiales to authenticated, anon, service_role;
grant select, insert, update, delete on public.cat_tipos_tramite_notarial to authenticated, anon, service_role;
grant select, insert, update, delete on public.tramites_escritura to authenticated, anon, service_role;
grant select, insert, update, delete on public.tramite_prevenciones to authenticated, anon, service_role;
grant select on public.v_tramites_resumen to authenticated, anon, service_role;

grant execute on function public.fn_calcular_dias_habiles to authenticated, anon, service_role;
grant execute on function public.fn_generar_tramites_plantilla_acto to authenticated, anon, service_role;
grant execute on function public.fn_validar_protocolizacion to authenticated, anon, service_role;

notify pgrst, 'reload schema';
