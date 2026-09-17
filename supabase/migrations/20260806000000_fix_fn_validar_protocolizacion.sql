-- ============================================================================
-- Migración: 20260806000000_fix_fn_validar_protocolizacion.sql
-- Módulo: 03-escrituras / 07-tramites
-- Solución al error 42703: La columna en public.escritura_comparecientes es
-- porcentaje_participacion y no porcentaje.
-- ============================================================================

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

grant execute on function public.fn_validar_protocolizacion(uuid) to authenticated, anon, service_role;

notify pgrst, 'reload schema';
