-- ============================================================================
-- Migración: 20260808000000_sync_tramite_pasos_tramites_escritura.sql
-- Módulo: 07-tramites
-- Sincronización automática de movimientos de gestoría (tramite_pasos_escritura)
-- con el expediente procesal formal de trámites (tramites_escritura)
-- ============================================================================

-- 1. Función trigger para auto-crear o actualizar tramites_escritura al registrar un paso
create or replace function public.fn_trg_sync_paso_a_tramite_escritura()
returns trigger language plpgsql security definer as $$
declare
  v_tipo_id uuid;
  v_fase text := 'previo';
  v_dias int := 10;
  v_nuevo_estado text := 'en_proceso';
  v_es_conclusion boolean := false;
  v_paso_nombre text;
  v_fecha_base date;
  v_fecha_limite date;
  v_tramite_id uuid;
begin
  -- Solo actuar si tenemos escritura_id y dependencia_id
  if new.escritura_id is null or new.dependencia_id is null then
    return new;
  end if;

  -- Obtener nombre del paso
  select upper(nombre) into v_paso_nombre
  from public.cat_pasos_tramite
  where id = new.paso_id;

  v_paso_nombre := coalesce(v_paso_nombre, '');

  -- Determinar estado procesal deducido según la naturaleza del paso
  if v_paso_nombre like '%RECHAZO%' or v_paso_nombre like '%OBSERVACION%' or v_paso_nombre like '%PREVENCION%' then
    v_nuevo_estado := 'prevenido_observado';
  elsif v_paso_nombre like '%CEDULA%' or v_paso_nombre like '%1ER TEST%' or v_paso_nombre like '%SALIDA%' or v_paso_nombre like '%CONCLUIDO%' then
    v_nuevo_estado := 'concluido_favorable';
    v_es_conclusion := true;
  elsif v_paso_nombre like '%ING.%' or v_paso_nombre like '%INGRESO%' or v_paso_nombre like '%REINGRESO%' then
    v_nuevo_estado := 'ingresado_dependencia';
  else
    v_nuevo_estado := 'en_proceso';
  end if;

  v_fecha_base := coalesce(new.fecha_registro::date, current_date);

  -- Verificar si ya existe trámite formal para esta (escritura_id, dependencia_id)
  select id into v_tramite_id
  from public.tramites_escritura
  where escritura_id = new.escritura_id
    and dependencia_id = new.dependencia_id
  order by created_at desc
  limit 1;

  if v_tramite_id is not null then
    -- Actualizar trámite existente con nuevo estado, folio y fecha de conclusión
    update public.tramites_escritura
    set
      estado = v_nuevo_estado,
      folio_dependencia = coalesce(nullif(trim(new.folio_volante), ''), folio_dependencia),
      orden_pago_id = coalesce(new.orden_pago_id, orden_pago_id),
      fecha_conclusion = case when v_es_conclusion then v_fecha_base else fecha_conclusion end,
      updated_at = now()
    where id = v_tramite_id;
  else
    -- Buscar tipo de trámite predeterminado para esta dependencia
    select id, coalesce(fase_default, 'previo'), coalesce(dias_habiles_compromiso, 10)
    into v_tipo_id, v_fase, v_dias
    from public.cat_tipos_tramite_notarial
    where dependencia_id = new.dependencia_id
      and activo = true
    order by orden asc nulls last, created_at asc
    limit 1;

    -- Si no se encuentra activo, buscar cualquiera de esa dependencia
    if v_tipo_id is null then
      select id, coalesce(fase_default, 'previo'), coalesce(dias_habiles_compromiso, 10)
      into v_tipo_id, v_fase, v_dias
      from public.cat_tipos_tramite_notarial
      where dependencia_id = new.dependencia_id
      limit 1;
    end if;

    -- Fallback: tomar cualquier tipo activo si la dependencia no tiene tipo explícito
    if v_tipo_id is null then
      select id, coalesce(fase_default, 'previo'), coalesce(dias_habiles_compromiso, 10)
      into v_tipo_id, v_fase, v_dias
      from public.cat_tipos_tramite_notarial
      limit 1;
    end if;

    if v_tipo_id is not null then
      v_fecha_limite := v_fecha_base + (v_dias * interval '1 day');

      insert into public.tramites_escritura (
        escritura_id,
        tipo_tramite_id,
        dependencia_id,
        fase,
        estado,
        folio_dependencia,
        fecha_ingreso,
        fecha_limite_estimada,
        fecha_conclusion,
        responsable_id,
        observaciones,
        orden_pago_id
      ) values (
        new.escritura_id,
        v_tipo_id,
        new.dependencia_id,
        v_fase,
        v_nuevo_estado,
        nullif(trim(new.folio_volante), ''),
        v_fecha_base,
        v_fecha_limite,
        case when v_es_conclusion then v_fecha_base else null end,
        new.completado_por,
        new.notas,
        new.orden_pago_id
      );
    end if;
  end if;

  return new;
end;
$$;

-- 2. Vincular trigger AFTER INSERT OR UPDATE en tramite_pasos_escritura
drop trigger if exists trg_sync_paso_a_tramite_escritura on public.tramite_pasos_escritura;
create trigger trg_sync_paso_a_tramite_escritura
  after insert or update on public.tramite_pasos_escritura
  for each row execute function public.fn_trg_sync_paso_a_tramite_escritura();

-- 3. Backfill de sincronización para registros existentes en tramite_pasos_escritura
do $$
declare
  r record;
begin
  for r in (
    select distinct on (tpe.escritura_id, tpe.dependencia_id)
      tpe.id
    from public.tramite_pasos_escritura tpe
    where tpe.dependencia_id is not null
      and not exists (
        select 1 from public.tramites_escritura te
        where te.escritura_id = tpe.escritura_id
          and te.dependencia_id = tpe.dependencia_id
      )
    order by tpe.escritura_id, tpe.dependencia_id, tpe.fecha_registro desc
  ) loop
    update public.tramite_pasos_escritura
    set updated_at = now()
    where id = r.id;
  end loop;
end;
$$;

-- 4. Notificar recarga de esquema a PostgREST
notify pgrst, 'reload schema';
