-- ============================================================================
-- Migración: 20260810000000_honorarios.sql
-- Módulo: 10-honorarios (Honorarios Notariales, Cotizaciones, Anticipos y Saldos)
-- Conforme a la Constitución del Sistema Notarial (§1, §3, §4, §5, §7, §8)
-- ============================================================================

-- 1. Secuencia para folios de recibos institucionales
create sequence if not exists public.sec_honorarios_recibos start with 1 increment by 1;

-- 2. Tabla maestra de Cuentas de Honorarios por Escritura
create table if not exists public.honorarios_cuentas (
  id uuid primary key default gen_random_uuid(),
  escritura_id uuid not null unique references public.escrituras(id) on delete cascade,
  subtotal_gravado numeric(12,2) not null default 0.00 check (subtotal_gravado >= 0),
  subtotal_exento numeric(12,2) not null default 0.00 check (subtotal_exento >= 0),
  descuento_total numeric(12,2) not null default 0.00 check (descuento_total >= 0),
  iva_total numeric(12,2) not null default 0.00 check (iva_total >= 0),
  total_cotizado numeric(12,2) not null default 0.00 check (total_cotizado >= 0),
  total_pagado numeric(12,2) not null default 0.00 check (total_pagado >= 0),
  saldo_pendiente numeric(12,2) not null default 0.00,
  estatus text not null default 'borrador' check (estatus in ('borrador', 'cotizado', 'anticipo_parcial', 'liquidado', 'cancelado')),

  -- Datos fiscales CFDI 4.0
  rfc_receptor varchar(13),
  razon_social_receptor text,
  regimen_fiscal_receptor varchar(10),
  codigo_postal_fiscal varchar(5),
  uso_cfdi varchar(5),
  estatus_facturacion text not null default 'no_requerida' check (estatus_facturacion in ('no_requerida', 'pendiente', 'facturada', 'cancelada')),
  uuid_fiscal varchar(36),
  fecha_timbrado timestamptz,
  metodo_pago_sat varchar(5) check (metodo_pago_sat in ('PUE', 'PPD')),
  forma_pago_sat varchar(5),
  factura_pdf_id uuid references public.expediente_documentos(id) on delete set null,
  factura_xml_id uuid references public.expediente_documentos(id) on delete set null,

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabla de Partidas Libres de Cotización
create table if not exists public.honorarios_partidas (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.honorarios_cuentas(id) on delete cascade,
  concepto text not null,
  monto numeric(12,2) not null check (monto >= 0),
  aplica_iva boolean not null default true,
  tasa_iva numeric(4,2) not null default 0.16,
  es_descuento boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

-- 4. Tabla de Pagos y Anticipos Recibidos
create table if not exists public.honorarios_pagos (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.honorarios_cuentas(id) on delete cascade,
  folio_recibo text unique not null,
  monto numeric(12,2) not null check (monto > 0),
  fecha_pago date not null default current_date,
  metodo_pago text not null check (metodo_pago in ('transferencia_spei', 'tarjeta_credito_debito', 'cheque', 'efectivo')),
  referencia_bancaria text,
  concepto text not null default 'Anticipo de gastos y honorarios',
  recibido_por uuid references public.profiles(id) on delete set null,
  comprobante_documento_id uuid references public.expediente_documentos(id) on delete set null,
  notas text,
  created_at timestamptz not null default now()
);

-- 5. Índices de optimización
create index if not exists idx_honorarios_cuentas_escritura on public.honorarios_cuentas(escritura_id);
create index if not exists idx_honorarios_cuentas_estatus on public.honorarios_cuentas(estatus);
create index if not exists idx_honorarios_partidas_cuenta on public.honorarios_partidas(cuenta_id);
create index if not exists idx_honorarios_pagos_cuenta on public.honorarios_pagos(cuenta_id);
create index if not exists idx_honorarios_pagos_fecha on public.honorarios_pagos(fecha_pago);

-- 6. Trigger para consecutivo automático de recibos: REC-YYYY-NNNN
create or replace function public.fn_tr_honorarios_pago_folio()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.folio_recibo is null or trim(new.folio_recibo) = '' then
    new.folio_recibo := 'REC-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.sec_honorarios_recibos')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists tr_honorarios_pago_folio on public.honorarios_pagos;
create trigger tr_honorarios_pago_folio
  before insert on public.honorarios_pagos
  for each row execute function public.fn_tr_honorarios_pago_folio();

-- 7. Función y triggers de recálculo aritmético de la cuenta
create or replace function public.fn_recalcular_honorarios_cuenta(p_cuenta_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_gravado numeric(12,2) := 0;
  v_exento numeric(12,2) := 0;
  v_descuento numeric(12,2) := 0;
  v_iva numeric(12,2) := 0;
  v_total_cotizado numeric(12,2) := 0;
  v_total_pagado numeric(12,2) := 0;
  v_saldo numeric(12,2) := 0;
  v_estatus text;
begin
  -- Sumar partidas gravadas, exentas y deducciones
  select 
    coalesce(sum(case when aplica_iva = true and es_descuento = false then monto else 0 end), 0),
    coalesce(sum(case when aplica_iva = false and es_descuento = false then monto else 0 end), 0),
    coalesce(sum(case when es_descuento = true then monto else 0 end), 0)
  into v_gravado, v_exento, v_descuento
  from public.honorarios_partidas
  where cuenta_id = p_cuenta_id;

  -- Calcular IVA sobre importe gravado neto
  v_iva := round(greatest(0, (v_gravado - v_descuento)) * 0.16, 2);
  v_total_cotizado := (v_gravado + v_exento + v_iva) - v_descuento;

  -- Sumar cobros registrados
  select coalesce(sum(monto), 0)
  into v_total_pagado
  from public.honorarios_pagos
  where cuenta_id = p_cuenta_id;

  v_saldo := v_total_cotizado - v_total_pagado;

  -- Determinar transición de estatus de la cuenta
  if v_total_cotizado = 0 then
    v_estatus := 'borrador';
  elsif v_total_pagado = 0 then
    v_estatus := 'cotizado';
  elsif v_saldo <= 0 then
    v_estatus := 'liquidado';
  else
    v_estatus := 'anticipo_parcial';
  end if;

  update public.honorarios_cuentas
  set 
    subtotal_gravado = v_gravado,
    subtotal_exento = v_exento,
    descuento_total = v_descuento,
    iva_total = v_iva,
    total_cotizado = v_total_cotizado,
    total_pagado = v_total_pagado,
    saldo_pendiente = v_saldo,
    estatus = v_estatus,
    updated_at = now()
  where id = p_cuenta_id;
end;
$$;

-- Triggers para disparar recálculo tras cambios en partidas
create or replace function public.fn_tr_partidas_recalcular()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  perform public.fn_recalcular_honorarios_cuenta(coalesce(new.cuenta_id, old.cuenta_id));
  return null;
end;
$$;

drop trigger if exists tr_honorarios_partidas_recalc on public.honorarios_partidas;
create trigger tr_honorarios_partidas_recalc
  after insert or update or delete on public.honorarios_partidas
  for each row execute function public.fn_tr_partidas_recalcular();

-- Triggers para disparar recálculo tras cambios en pagos
create or replace function public.fn_tr_pagos_recalcular()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  perform public.fn_recalcular_honorarios_cuenta(coalesce(new.cuenta_id, old.cuenta_id));
  return null;
end;
$$;

drop trigger if exists tr_honorarios_pagos_recalc on public.honorarios_pagos;
create trigger tr_honorarios_pagos_recalc
  after insert or update or delete on public.honorarios_pagos
  for each row execute function public.fn_tr_pagos_recalcular();

-- 8. Vista consolidada v_honorarios_cuentas_resumen
create or replace view public.v_honorarios_cuentas_resumen as
select
  hc.id,
  hc.escritura_id,
  e.instrumento as escritura_instrumento,
  coalesce(e.expediente, 'EXP-' || e.anio || '-' || e.instrumento) as escritura_expediente,
  e.objeto as escritura_objeto,
  aj.nombre as acto_nombre,
  e.responsable_id,
  u.nombre_completo as responsable_nombre,
  hc.subtotal_gravado,
  hc.subtotal_exento,
  hc.descuento_total,
  hc.iva_total,
  hc.total_cotizado,
  hc.total_pagado,
  hc.saldo_pendiente,
  hc.estatus,
  hc.rfc_receptor,
  hc.razon_social_receptor,
  hc.estatus_facturacion,
  hc.uuid_fiscal,
  hc.fecha_timbrado,
  hc.created_at,
  hc.updated_at
from public.honorarios_cuentas hc
join public.escrituras e on e.id = hc.escritura_id
left join public.actos_juridicos aj on aj.id = e.acto_juridico_id
left join public.profiles u on u.id = e.responsable_id;

-- 9. Habilitar RLS
alter table public.honorarios_cuentas enable row level security;
alter table public.honorarios_partidas enable row level security;
alter table public.honorarios_pagos enable row level security;

-- Políticas permisivas autenticadas y lectura pública/anon si corresponde
drop policy if exists "honorarios_cuentas_all" on public.honorarios_cuentas;
create policy "honorarios_cuentas_all" on public.honorarios_cuentas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "honorarios_cuentas_anon_select" on public.honorarios_cuentas;
create policy "honorarios_cuentas_anon_select" on public.honorarios_cuentas
  for select using (true);

drop policy if exists "honorarios_partidas_all" on public.honorarios_partidas;
create policy "honorarios_partidas_all" on public.honorarios_partidas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "honorarios_partidas_anon_select" on public.honorarios_partidas;
create policy "honorarios_partidas_anon_select" on public.honorarios_partidas
  for select using (true);

drop policy if exists "honorarios_pagos_all" on public.honorarios_pagos;
create policy "honorarios_pagos_all" on public.honorarios_pagos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "honorarios_pagos_anon_select" on public.honorarios_pagos;
create policy "honorarios_pagos_anon_select" on public.honorarios_pagos
  for select using (true);

-- 10. Grants
grant select, insert, update, delete on public.honorarios_cuentas to authenticated, service_role;
grant select, insert, update, delete on public.honorarios_partidas to authenticated, service_role;
grant select, insert, update, delete on public.honorarios_pagos to authenticated, service_role;
grant select on public.honorarios_cuentas to anon;
grant select on public.honorarios_partidas to anon;
grant select on public.honorarios_pagos to anon;
grant select on public.v_honorarios_cuentas_resumen to authenticated, anon, service_role;
grant usage, select on sequence public.sec_honorarios_recibos to authenticated, service_role;

notify pgrst, 'reload schema';
