-- ============================================================================
-- Migración: 20260814000000_bitacora_turnado.sql
-- Módulo: 14-bitacora-turnado (Cadena de Custodia Redactor <-> Gestor)
-- ============================================================================

-- 1. Extender tramites_escritura con columnas de custodia activa
alter table public.tramites_escritura
  add column if not exists custodia_actual_rol text not null default 'redactor'
    check (custodia_actual_rol in ('redactor', 'gestor', 'notario', 'administrador')),
  add column if not exists custodio_actual_id uuid references public.profiles(id) on delete set null,
  add column if not exists fecha_inicio_custodia_actual timestamptz not null default now(),
  add column if not exists detenido_por_solventacion boolean not null default false;

create index if not exists idx_tramites_escritura_custodio on public.tramites_escritura(custodio_actual_id);
create index if not exists idx_tramites_escritura_custodia_rol on public.tramites_escritura(custodia_actual_rol);
create index if not exists idx_tramites_escritura_detenido on public.tramites_escritura(detenido_por_solventacion);

-- 2. Tabla inmutable de eventos de turnado y cadena de custodia
create table if not exists public.bitacora_turnado_tramites (
  id uuid primary key default gen_random_uuid(),
  escritura_id uuid not null references public.escrituras(id) on delete cascade,
  tramite_id uuid references public.tramites_escritura(id) on delete cascade,
  usuario_origen_id uuid not null references public.profiles(id) on delete restrict,
  rol_origen text not null check (rol_origen in ('redactor', 'gestor', 'notario', 'administrador')),
  usuario_destino_id uuid not null references public.profiles(id) on delete restrict,
  rol_destino text not null check (rol_destino in ('redactor', 'gestor', 'notario', 'administrador')),
  tipo_evento text not null check (
    tipo_evento in (
      'turnado_a_gestor',
      'devuelto_a_redactor_prevencion',
      'solventado_reingresado',
      'tramite_concluido_entregado',
      'reasignacion_administrativa'
    )
  ),
  motivo text not null,
  folio_prevencion text,
  fecha_limite_solventacion date,
  documento_soporte_id uuid references public.expediente_documentos(id) on delete set null,
  instrucciones text,
  tiempo_custodia_horas numeric(10,2) not null default 0.00,
  created_at timestamptz not null default now()
);

comment on table public.bitacora_turnado_tramites is 'Historial inmutable de transferencias de custodia de trámites y expedientes entre redactores y gestores.';

create index if not exists idx_turnado_escritura on public.bitacora_turnado_tramites(escritura_id);
create index if not exists idx_turnado_tramite on public.bitacora_turnado_tramites(tramite_id);
create index if not exists idx_turnado_created_at on public.bitacora_turnado_tramites(created_at desc);
create index if not exists idx_turnado_destino on public.bitacora_turnado_tramites(usuario_destino_id);

-- 3. Habilitar RLS en bitacora_turnado_tramites
alter table public.bitacora_turnado_tramites enable row level security;

-- Política de lectura para usuarios autenticados
create policy "Usuarios autenticados pueden ver la bitacora de turnado"
  on public.bitacora_turnado_tramites
  for select
  to authenticated
  using (true);

-- Política de inserción para usuarios autenticados
create policy "Usuarios autenticados pueden registrar eventos de turnado"
  on public.bitacora_turnado_tramites
  for insert
  to authenticated
  with check (true);

-- No se crean políticas for update ni for delete -> Inmutabilidad garantizada.

-- 4. Función almacenada atómica para registrar turnado y actualizar estado del trámite
create or replace function public.fn_registrar_turnado(
  p_escritura_id uuid,
  p_tramite_id uuid,
  p_usuario_origen_id uuid,
  p_rol_origen text,
  p_usuario_destino_id uuid,
  p_rol_destino text,
  p_tipo_evento text,
  p_motivo text,
  p_folio_prevencion text default null,
  p_fecha_limite_solventacion date default null,
  p_documento_soporte_id uuid default null,
  p_instrucciones text default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_nuevo_id uuid;
  v_fecha_anterior timestamptz;
  v_horas_transcurridas numeric(10,2) := 0.00;
  v_detenido boolean := false;
begin
  -- 1. Obtener fecha de inicio de la custodia anterior para calcular horas
  if p_tramite_id is not null then
    select fecha_inicio_custodia_actual into v_fecha_anterior
    from public.tramites_escritura
    where id = p_tramite_id;
  end if;

  if v_fecha_anterior is not null then
    v_horas_transcurridas := round(
      extract(epoch from (now() - v_fecha_anterior)) / 3600.0,
      2
    );
  end if;

  -- 2. Determinar si queda marcado como detenido por solventación
  if p_tipo_evento = 'devuelto_a_redactor_prevencion' then
    v_detenido := true;
  elsif p_tipo_evento in ('solventado_reingresado', 'tramite_concluido_entregado') then
    v_detenido := false;
  end if;

  -- 3. Insertar asiento inmutable en la bitácora
  insert into public.bitacora_turnado_tramites (
    escritura_id,
    tramite_id,
    usuario_origen_id,
    rol_origen,
    usuario_destino_id,
    rol_destino,
    tipo_evento,
    motivo,
    folio_prevencion,
    fecha_limite_solventacion,
    documento_soporte_id,
    instrucciones,
    tiempo_custodia_horas,
    created_at
  ) values (
    p_escritura_id,
    p_tramite_id,
    p_usuario_origen_id,
    p_rol_origen,
    p_usuario_destino_id,
    p_rol_destino,
    p_tipo_evento,
    p_motivo,
    p_folio_prevencion,
    p_fecha_limite_solventacion,
    p_documento_soporte_id,
    p_instrucciones,
    v_horas_transcurridas,
    now()
  ) returning id into v_nuevo_id;

  -- 4. Actualizar estado y custodio en el trámite
  if p_tramite_id is not null then
    update public.tramites_escritura
    set
      custodia_actual_rol = p_rol_destino,
      custodio_actual_id = p_usuario_destino_id,
      fecha_inicio_custodia_actual = now(),
      detenido_por_solventacion = v_detenido,
      updated_at = now()
    where id = p_tramite_id;
  end if;

  return v_nuevo_id;
end;
$$;
