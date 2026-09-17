-- ============================================================================
-- Migración: 20260803000000_ordenes_pago.sql
-- Módulo: 08-ordenes-pago (Órdenes de Pago de Derechos a Terceros, Líneas de Captura y Tesorería)
-- Conforme a la Constitución del Sistema Notarial (§1, §3, §4, §5, §7, §8)
-- ============================================================================

-- 1. Secuencia para folios consecutivos de órdenes de pago
create sequence if not exists public.sec_ordenes_pago_folio start with 1 increment by 1;

-- 2. Tabla principal de órdenes de pago de derechos
create table if not exists public.ordenes_pago (
  id uuid primary key default gen_random_uuid(),
  folio text unique not null,
  escritura_id uuid not null references public.escrituras(id) on delete cascade,
  tramite_id uuid references public.tramites_escritura(id) on delete set null,
  dependencia_id uuid not null references public.cat_dependencias_oficiales(id),
  concepto text not null,
  monto numeric(12,2) not null check (monto >= 0),
  linea_captura text,
  fecha_emision_linea date not null default current_date,
  fecha_vencimiento_linea date,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_tesoreria', 'pagado', 'cancelado')),
  metodo_pago text check (metodo_pago in ('transferencia_spei', 'cheque_caja', 'tarjeta_credito_debito', 'efectivo_ventanilla', 'cargo_cuenta_notaria')),
  folio_autorizacion_bancaria text,
  fecha_pago date,
  pagado_por uuid references public.profiles(id) on delete set null,
  comprobante_documento_id uuid references public.expediente_documentos(id) on delete set null,
  quien_cubre text not null default 'adquirente' check (quien_cubre in ('adquirente', 'enajenante', 'notaria_fondo_revolvente', 'banco_acreedor', 'otro')),
  observaciones text,
  motivo_cancelacion text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Índices de optimización para búsquedas y conciliación
create index if not exists idx_ordenes_pago_escritura on public.ordenes_pago(escritura_id);
create index if not exists idx_ordenes_pago_tramite on public.ordenes_pago(tramite_id);
create index if not exists idx_ordenes_pago_dependencia on public.ordenes_pago(dependencia_id);
create index if not exists idx_ordenes_pago_estado on public.ordenes_pago(estado);
create index if not exists idx_ordenes_pago_vencimiento on public.ordenes_pago(fecha_vencimiento_linea);

-- 4. Trigger para generación automática de folio 'ORD-YYYY-NNNN'
create or replace function public.fn_tr_orden_pago_folio()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.folio is null or trim(new.folio) = '' then
    new.folio := 'ORD-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.sec_ordenes_pago_folio')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists tr_orden_pago_folio on public.ordenes_pago;
create trigger tr_orden_pago_folio
  before insert on public.ordenes_pago
  for each row execute function public.fn_tr_orden_pago_folio();

-- 5. Trigger para actualización automática de updated_at
drop trigger if exists tr_orden_pago_updated_at on public.ordenes_pago;
create trigger tr_orden_pago_updated_at
  before update on public.ordenes_pago
  for each row execute function public.set_updated_at();

-- 6. Trigger de sincronización bidireccional con tramites_escritura
create or replace function public.fn_tr_orden_pago_sync_tramite()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  -- Al asociar una orden no cancelada a un trámite
  if new.tramite_id is not null and new.estado != 'cancelado' then
    update public.tramites_escritura
    set orden_pago_id = new.id
    where id = new.tramite_id and (orden_pago_id is distinct from new.id);
  end if;

  -- Si la orden se cancela, retirar la asociación del trámite si apuntaba a ella
  if new.estado = 'cancelado' and new.tramite_id is not null then
    update public.tramites_escritura
    set orden_pago_id = null
    where id = new.tramite_id and orden_pago_id = new.id;
  end if;

  -- En updates, si el trámite cambió de uno a otro
  if tg_op = 'UPDATE' and old.tramite_id is not null and old.tramite_id is distinct from new.tramite_id then
    update public.tramites_escritura
    set orden_pago_id = null
    where id = old.tramite_id and orden_pago_id = old.id;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_orden_pago_sync_tramite on public.ordenes_pago;
create trigger tr_orden_pago_sync_tramite
  after insert or update on public.ordenes_pago
  for each row execute function public.fn_tr_orden_pago_sync_tramite();

-- Asegurar columna expediente en escrituras si no existiese
alter table public.escrituras add column if not exists expediente text;

-- 7. Vista consolidada v_ordenes_pago_resumen
create or replace view public.v_ordenes_pago_resumen as
select
  op.id,
  op.folio,
  op.escritura_id,
  e.instrumento as escritura_instrumento,
  coalesce(e.expediente, 'EXP-' || e.anio || '-' || e.instrumento) as escritura_expediente,
  aj.nombre as acto_nombre,
  op.tramite_id,
  te.folio_dependencia as tramite_folio,
  op.dependencia_id,
  cdo.sigla as dependencia_sigla,
  cdo.nombre as dependencia_nombre,
  cdo.portal_web as dependencia_portal_web,
  op.concepto,
  op.monto,
  op.linea_captura,
  op.fecha_emision_linea,
  op.fecha_vencimiento_linea,
  op.estado,
  op.metodo_pago,
  op.folio_autorizacion_bancaria,
  op.fecha_pago,
  op.pagado_por,
  u.nombre_completo as pagado_por_nombre,
  op.comprobante_documento_id,
  ed.archivo_nombre as comprobante_archivo_nombre,
  ed.archivo_path as comprobante_ruta_storage,
  op.quien_cubre,
  op.observaciones,
  op.motivo_cancelacion,
  op.created_by,
  op.created_at,
  op.updated_at,
  case
    when op.fecha_vencimiento_linea is null then null
    else (op.fecha_vencimiento_linea - current_date)
  end as dias_restantes,
  case
    when op.estado = 'pagado' then 'azul'
    when op.estado = 'cancelado' or op.fecha_vencimiento_linea is null then 'gris'
    when (op.fecha_vencimiento_linea - current_date) <= 0 then 'rojo'
    when (op.fecha_vencimiento_linea - current_date) <= 3 then 'amarillo'
    else 'verde'
  end as semaforo
from public.ordenes_pago op
join public.escrituras e on e.id = op.escritura_id
left join public.actos_juridicos aj on aj.id = e.acto_juridico_id
join public.cat_dependencias_oficiales cdo on cdo.id = op.dependencia_id
left join public.tramites_escritura te on te.id = op.tramite_id
left join public.profiles u on u.id = op.pagado_por
left join public.expediente_documentos ed on ed.id = op.comprobante_documento_id;

-- 8. Habilitar RLS
alter table public.ordenes_pago enable row level security;

drop policy if exists "ordenes_pago_all" on public.ordenes_pago;
create policy "ordenes_pago_all" on public.ordenes_pago
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "ordenes_pago_anon_select" on public.ordenes_pago;
create policy "ordenes_pago_anon_select" on public.ordenes_pago
  for select using (true);

-- 9. Permisos y Grants
grant select, insert, update, delete on public.ordenes_pago to authenticated, service_role;
grant select on public.ordenes_pago to anon;
grant select on public.v_ordenes_pago_resumen to authenticated, anon, service_role;
grant usage, select on sequence public.sec_ordenes_pago_folio to authenticated, service_role;

notify pgrst, 'reload schema';
