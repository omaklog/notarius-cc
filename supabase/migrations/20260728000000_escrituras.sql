-- Escrituras (entidad raíz) — specs/03-escrituras/data-model.md, research.md.
-- Evoluciona catálogos de 01-infra-supabase (tipos_acto_notarial ->
-- actos_juridicos; da de baja roles_compareciente), crea la máquina de
-- estados y el gate de protocolización reforzados en la capa de datos
-- (FR-014), y un stub mínimo de comparecientes (Clarification, sesión
-- 2026-07-28 de spec.md) para que escritura_comparecientes tenga una FK
-- real sin esperar al spec de Comparecientes.

-- ============================================================
-- tipo_acto_juridico (enum de sistema, no editable — research.md #1)
-- ============================================================
create type public.tipo_acto_juridico as enum ('traslativo', 'no_traslativo');

-- ============================================================
-- actos_juridicos (evoluciona tipos_acto_notarial de 01-infra-supabase,
-- no se duplica — research.md #1)
-- ============================================================
alter table public.tipos_acto_notarial rename to actos_juridicos;

alter table public.actos_juridicos add column descripcion text;
alter table public.actos_juridicos add column tipo public.tipo_acto_juridico;

update public.actos_juridicos set tipo = 'traslativo'
where codigo in ('compraventa', 'donacion');

update public.actos_juridicos set tipo = 'no_traslativo'
where codigo in ('testamento', 'poder_notarial', 'constitucion_sociedad');

alter table public.actos_juridicos alter column tipo set not null;
alter table public.actos_juridicos drop column codigo;
alter table public.actos_juridicos add constraint actos_juridicos_nombre_key unique (nombre);

alter policy "tipos_acto_notarial_select_authenticated" on public.actos_juridicos
rename to "actos_juridicos_select_authenticated";

drop policy "tipos_acto_notarial_all_service_role" on public.actos_juridicos;

create policy "actos_juridicos_all_admin" on public.actos_juridicos for all to authenticated using (public.fn_has_permiso ('administracion', 'acceso'))
with
  check (public.fn_has_permiso ('administracion', 'acceso'));

-- ============================================================
-- roles_compareciente — se da de baja (research.md #2): el rol de un
-- compareciente dentro de una escritura es un check constraint fijo
-- (ver escritura_comparecientes más abajo), no un catálogo editable.
-- ============================================================
drop table public.roles_compareciente;

-- ============================================================
-- instrumento_control + fn_siguiente_instrumento (research.md #3):
-- numeración de instrumento atómica, server-side, nunca reutilizada.
-- ============================================================
create table public.instrumento_control (
  anio integer primary key,
  ultimo_numero integer not null default 0
);

create or replace function public.fn_siguiente_instrumento (p_anio integer) returns integer language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare
  v_numero integer;
begin
  insert into public.instrumento_control (anio, ultimo_numero)
  values (p_anio, 0)
  on conflict (anio) do nothing;

  update public.instrumento_control
  set ultimo_numero = ultimo_numero + 1
  where anio = p_anio
  returning ultimo_numero into v_numero;

  return v_numero;
end;
$$;

-- ============================================================
-- comparecientes (stub mínimo — Clarification sesión 2026-07-28,
-- research.md #6). El futuro spec de Comparecientes la amplía vía
-- ALTER TABLE, nunca la recrea.
-- ============================================================
create table public.comparecientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

alter table public.comparecientes enable row level security;

-- Sin escritura_id: solo alcance 'todas' puede tocar la identidad mínima
-- directamente (research.md #6). El alta/edición escopada por escritura
-- pasa por fn_asociar_compareciente(), no por esta tabla directamente.
create policy "comparecientes_select" on public.comparecientes for select to authenticated using (public.fn_has_permiso ('comparecientes', 'ver'));

create policy "comparecientes_insert" on public.comparecientes
for insert
  to authenticated
with
  check (public.fn_has_permiso ('comparecientes', 'crear'));

create policy "comparecientes_update" on public.comparecientes for update to authenticated using (public.fn_has_permiso ('comparecientes', 'editar'))
with
  check (public.fn_has_permiso ('comparecientes', 'editar'));

create policy "comparecientes_delete" on public.comparecientes for delete to authenticated using (public.fn_has_permiso ('comparecientes', 'eliminar'));

-- ============================================================
-- escrituras (entidad raíz)
-- ============================================================
create table public.escrituras (
  id uuid primary key default gen_random_uuid(),
  instrumento integer not null,
  anio integer not null,
  volumen integer not null,
  pagina_inicial integer,
  pagina_final integer,
  expediente text,
  acto_juridico_id uuid not null references public.actos_juridicos (id),
  estatus text not null default 'borrador' check (
    estatus in ('borrador', 'protocolizada', 'anulada')
  ),
  responsable_id uuid not null references public.profiles (id),
  fecha_celebracion date,
  monto_operacion numeric(14, 2),
  objeto text not null,
  observaciones text,
  motivo_anulacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id),
  unique (instrumento)
);

create trigger set_updated_at
before update on public.escrituras
for each row
execute function public.set_updated_at ();

-- ============================================================
-- fn_asignar_instrumento — respeta el instrumento capturado por el usuario
-- o fija el siguiente consecutivo si no fue provisto (FR-002)
-- ============================================================
create or replace function public.fn_asignar_instrumento () returns trigger language plpgsql as $$
begin
  new.anio := coalesce(new.anio, extract(year from now())::integer);
  if new.instrumento is null or new.instrumento <= 0 then
    new.instrumento := public.fn_siguiente_instrumento(new.anio);
  end if;
  return new;
end;
$$;

create trigger trg_asignar_instrumento before insert on public.escrituras for each row
execute function public.fn_asignar_instrumento ();

-- ============================================================
-- escritura_comparecientes (tabla puente)
-- ============================================================
create table public.escritura_comparecientes (
  id uuid primary key default gen_random_uuid(),
  escritura_id uuid not null references public.escrituras (id) on delete cascade,
  compareciente_id uuid not null references public.comparecientes (id),
  rol text not null check (
    rol in (
      'otorgante',
      'adquirente',
      'apoderado',
      'representante_legal',
      'testigo'
    )
  ),
  porcentaje_participacion numeric(5, 2) check (
    porcentaje_participacion > 0
    and porcentaje_participacion <= 100
  ),
  created_at timestamptz not null default now(),
  unique (escritura_id, compareciente_id, rol)
);

-- ============================================================
-- RLS de escrituras — mismo patrón de contracts/usuarios-roles-interface.md,
-- aplicado por primera vez a una tabla real ligada a escritura_id.
-- ============================================================
alter table public.escrituras enable row level security;

create policy "escrituras_select" on public.escrituras for select to authenticated using (public.fn_has_permiso ('escrituras', 'ver', id));

create policy "escrituras_insert" on public.escrituras
for insert
  to authenticated
with
  check (public.fn_has_permiso ('escrituras', 'crear', id));

create policy "escrituras_update" on public.escrituras for update to authenticated using (public.fn_has_permiso ('escrituras', 'editar', id))
with
  check (public.fn_has_permiso ('escrituras', 'editar', id));

create policy "escrituras_delete" on public.escrituras for delete to authenticated using (public.fn_has_permiso ('escrituras', 'eliminar', id));

-- ============================================================
-- RLS de escritura_comparecientes
-- ============================================================
alter table public.escritura_comparecientes enable row level security;

create policy "escritura_comparecientes_select" on public.escritura_comparecientes for select to authenticated using (
  public.fn_has_permiso ('comparecientes', 'ver', escritura_id)
);

create policy "escritura_comparecientes_insert" on public.escritura_comparecientes
for insert
  to authenticated
with
  check (
    public.fn_has_permiso ('comparecientes', 'crear', escritura_id)
  );

create policy "escritura_comparecientes_update" on public.escritura_comparecientes for update to authenticated using (
  public.fn_has_permiso ('comparecientes', 'editar', escritura_id)
)
with
  check (
    public.fn_has_permiso ('comparecientes', 'editar', escritura_id)
  );

create policy "escritura_comparecientes_delete" on public.escritura_comparecientes for delete to authenticated using (
  public.fn_has_permiso ('comparecientes', 'eliminar', escritura_id)
);

-- ============================================================
-- fn_validar_protocolizacion — gate de protocolización (research.md #4).
-- Devuelve un arreglo de motivos (vacío si puede protocolizarse). Las
-- condiciones que dependen de módulos aún inexistentes se omiten vía
-- to_regclass, mismo patrón que fn_has_permiso usa para 'escrituras'.
-- ============================================================
create or replace function public.fn_validar_protocolizacion (p_escritura_id uuid) returns text[] language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare
  v_motivos text[] := '{}';
  v_es_traslativo boolean;
  v_conteo_porcentajes integer;
  v_suma_porcentajes numeric;
begin
  -- Cumplimiento PLD por compareciente (tabla futura del spec de
  -- Comparecientes/Cumplimiento PLD; mientras no exista, se omite).
  if to_regclass('public.cumplimiento_pld') is not null then
    if exists (
      select 1
      from public.escritura_comparecientes ec
      join public.cumplimiento_pld cp on cp.compareciente_id = ec.compareciente_id
      where ec.escritura_id = p_escritura_id
        and cp.estatus is distinct from 'verificado'
    ) then
      v_motivos := array_append(v_motivos, 'Hay comparecientes sin cumplimiento PLD verificado.');
    end if;
  end if;

  -- Bloqueos activos sin resolver por compareciente (tabla futura).
  if to_regclass('public.compareciente_bloqueos') is not null then
    if exists (
      select 1
      from public.escritura_comparecientes ec
      join public.compareciente_bloqueos cb on cb.compareciente_id = ec.compareciente_id
      where ec.escritura_id = p_escritura_id
        and cb.resuelto = false
    ) then
      v_motivos := array_append(v_motivos, 'Hay comparecientes con un bloqueo activo sin resolver.');
    end if;
  end if;

  -- Predio georreferenciado si el acto jurídico es traslativo (tabla
  -- futura del spec de Georreferenciación).
  select (aj.tipo = 'traslativo') into v_es_traslativo
  from public.escrituras e
  join public.actos_juridicos aj on aj.id = e.acto_juridico_id
  where e.id = p_escritura_id;

  if v_es_traslativo and to_regclass('public.predios') is not null then
    if not exists (
      select 1 from public.predios pr
      where pr.escritura_id = p_escritura_id
        and pr.poligono is not null
    ) then
      v_motivos := array_append(v_motivos, 'El acto jurídico es traslativo y no tiene un predio georreferenciado asociado.');
    end if;
  end if;

  -- Suma 100% de participación cuando se capturó (FR-007).
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

-- ============================================================
-- fn_asociar_compareciente — alta/asociación de un compareciente a una
-- escritura, escopada por escritura_id (research.md #6). Único camino
-- legítimo para crear/editar filas de comparecientes/escritura_comparecientes
-- para un rol con alcance 'propias'.
-- ============================================================
create or replace function public.fn_asociar_compareciente (
  p_escritura_id uuid,
  p_compareciente_id uuid,
  p_nombre_nuevo text,
  p_rol text,
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

  insert into public.escritura_comparecientes (escritura_id, compareciente_id, rol, porcentaje_participacion)
  values (p_escritura_id, v_compareciente_id, p_rol, p_porcentaje)
  on conflict (escritura_id, compareciente_id, rol)
  do update set porcentaje_participacion = excluded.porcentaje_participacion;

  return v_compareciente_id;
end;
$$;

-- ============================================================
-- trg_validar_transicion_escritura — máquina de estados completa
-- (research.md #5): inmutabilidad, gate de protocolización, permiso de
-- anulación, permiso de reasignar responsable.
-- ============================================================
create or replace function public.fn_validar_transicion_escritura () returns trigger language plpgsql as $$
declare
  v_motivos text[];
begin
  -- anulada es un estado terminal: ningún update se permite.
  if old.estatus = 'anulada' then
    raise exception 'Una escritura anulada no puede modificarse.';
  end if;

  if old.estatus = 'protocolizada' then
    if new.estatus = 'protocolizada' then
      raise exception 'Una escritura protocolizada no admite edición de sus datos.';
    elsif new.estatus = 'anulada' then
      if new.motivo_anulacion is null or btrim(new.motivo_anulacion) = '' then
        raise exception 'Se requiere un motivo de anulación.';
      end if;

      if not public.fn_has_permiso('escrituras', 'anular', old.id) then
        raise exception 'No tienes permiso para anular esta escritura.';
      end if;

      if row(new.instrumento, new.anio, new.volumen, new.pagina_inicial, new.pagina_final,
             new.acto_juridico_id, new.responsable_id, new.fecha_celebracion,
             new.monto_operacion, new.objeto, new.observaciones, new.created_by)
         is distinct from
         row(old.instrumento, old.anio, old.volumen, old.pagina_inicial, old.pagina_final,
             old.acto_juridico_id, old.responsable_id, old.fecha_celebracion,
             old.monto_operacion, old.objeto, old.observaciones, old.created_by)
      then
        raise exception 'Al anular una escritura no pueden modificarse sus demás datos.';
      end if;
    else
      raise exception 'Transición de estatus no permitida.';
    end if;
  elsif old.estatus = 'borrador' then
    if new.estatus = 'protocolizada' then
      v_motivos := public.fn_validar_protocolizacion(old.id);
      if array_length(v_motivos, 1) > 0 then
        raise exception '%', array_to_string(v_motivos, ' ');
      end if;
    elsif new.estatus <> 'borrador' then
      raise exception 'Transición de estatus no permitida.';
    end if;
  end if;

  if new.responsable_id is distinct from old.responsable_id then
    if not public.fn_has_permiso('escrituras', 'reasignar_responsable', old.id) then
      raise exception 'No tienes permiso para reasignar el responsable de esta escritura.';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validar_transicion_escritura before update on public.escrituras for each row
execute function public.fn_validar_transicion_escritura ();

-- ============================================================
-- Auditoría: escrituras se agrega a las entidades auditables
-- (research.md #7)
-- ============================================================
alter table public.audit_log drop constraint audit_log_entidad_check;

alter table public.audit_log
add constraint audit_log_entidad_check check (
  entidad in (
    'roles',
    'rol_permisos',
    'profiles',
    'escrituras'
  )
);

create trigger audit_log_escrituras
after insert or update or delete on public.escrituras for each row
execute function public.fn_audit_log_generic ();
