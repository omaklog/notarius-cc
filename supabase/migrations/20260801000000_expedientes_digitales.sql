-- Migración 06-expedientes: Expedientes Digitales Notariales, Requisitos por Acto y Cotejo Notarial
-- 
-- 1. Catálogo maestro de tipos de documento notarial (cat_tipos_documento_notarial)
-- 2. Matriz de requisitos documentales por acto jurídico (acto_juridico_requisitos_documentales)
-- 3. Ampliación de expediente_documentos con atributos de cotejo notarial
-- 4. Registro de dispensas documentales (expediente_dispensas_documentales)
-- 5. Bitácora y trazabilidad de descargas (expediente_descargas_log)
-- 6. Vista dinámica enriquecida (public.v_expediente_escritura)
-- 7. Funciones RPC: evaluación de expediente, asiento de cotejo, dispensa y auditoría
-- 8. Actualización del gate de protocolización (fn_validar_protocolizacion)

-- 1. Catálogo maestro de tipos de documento notarial
create table if not exists public.cat_tipos_documento_notarial (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  categoria text not null check (categoria in ('inmueble', 'compareciente', 'fiscal', 'interno')),
  descripcion text,
  requiere_cotejo_fisico boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.cat_tipos_documento_notarial enable row level security;

create policy "cat_tipos_doc_select"
  on public.cat_tipos_documento_notarial for select
  to authenticated, anon
  using (activo = true);

create policy "cat_tipos_doc_admin"
  on public.cat_tipos_documento_notarial for all
  to authenticated
  using (public.fn_has_permiso('administracion', 'acceso'));

-- Seeds canónicos de tipos documentales
insert into public.cat_tipos_documento_notarial (codigo, nombre, categoria, descripcion, requiere_cotejo_fisico)
values
  ('titulo_propiedad', 'Título de Propiedad Antecedente', 'inmueble', 'Escritura o título formal inscrito en el RPP que acredita el dominio actual.', true),
  ('boleta_predial', 'Boleta Predial Vigente', 'fiscal', 'Comprobante de pago o propuesta catastral del ejercicio corriente.', false),
  ('agua_no_adeudo', 'Constancia de No Adeudo de Agua', 'fiscal', 'Certificación emitida por organismo operador o autoridad municipal de aguas.', false),
  ('libertad_gravamenes', 'Certificado de Libertad de Gravámenes (RPP)', 'inmueble', 'Certificado registral con vigencia de aviso preventivo.', false),
  ('avaluo_comercial', 'Avalúo Comercial Notarial', 'inmueble', 'Dictamen valuatorio practicado por perito registrado ante Catastro/SAT.', false),
  ('cedula_catastral', 'Cédula Catastral / Clave', 'inmueble', 'Constancia de alineamiento, número oficial o cédula catastral.', false),
  ('identificacion_oficial', 'Identificación Oficial Vigente', 'compareciente', 'Credencial INE, Pasaporte o Cédula Profesional del otorgante.', false),
  ('comprobante_domicilio', 'Comprobante de Domicilio', 'compareciente', 'Recibo de servicios con antigüedad menor a 3 meses.', false),
  ('curp', 'Constancia de CURP', 'compareciente', 'Clave Única de Registro de Población certificada ante RENAPO.', false),
  ('csf_sat', 'Constancia de Situación Fiscal (SAT)', 'fiscal', 'Cédula de identificación fiscal con vigencia < 3 meses.', false),
  ('acta_constitutiva', 'Acta Constitutiva con RPC', 'compareciente', 'Escritura constitutiva y reformas inscritas en el Registro Público de Comercio.', true),
  ('poder_notarial', 'Poder Notarial de Representación', 'compareciente', 'Testimonio notarial con facultades de dominio o administración vigentes.', true),
  ('permiso_se_sociedad', 'Permiso Secretaría de Economía', 'interno', 'Autorización de uso de denominación o razón social.', false),
  ('proyecto_estatutos', 'Proyecto de Estatutos Sociales', 'interno', 'Borrador y cláusulas estatutarias para persona moral.', false),
  ('disposicion_testamentaria', 'Disposiciones Testamentarias', 'interno', 'Notas e instrucciones firmadas por el testador.', false),
  ('otro_documento', 'Otro Documento Notarial', 'interno', 'Cualquier constancia o anexo notarial complementario.', false)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  categoria = excluded.categoria,
  descripcion = excluded.descripcion,
  requiere_cotejo_fisico = excluded.requiere_cotejo_fisico;

-- 2. Matriz de requisitos documentales por tipo de acto jurídico
create table if not exists public.acto_juridico_requisitos_documentales (
  id uuid primary key default gen_random_uuid(),
  acto_juridico_id uuid not null references public.actos_juridicos(id) on delete cascade,
  tipo_documento_id uuid not null references public.cat_tipos_documento_notarial(id) on delete cascade,
  obligatorio boolean not null default true,
  rol_compareciente text,
  orden integer not null default 10,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint uq_acto_tipo_rol unique (acto_juridico_id, tipo_documento_id, rol_compareciente)
);

create index if not exists idx_requisitos_acto_id on public.acto_juridico_requisitos_documentales(acto_juridico_id);

alter table public.acto_juridico_requisitos_documentales enable row level security;

create policy "requisitos_doc_select"
  on public.acto_juridico_requisitos_documentales for select
  to authenticated, anon
  using (activo = true);

create policy "requisitos_doc_admin"
  on public.acto_juridico_requisitos_documentales for all
  to authenticated
  using (public.fn_has_permiso('administracion', 'acceso'));

-- Seeds de requisitos para los actos típicos de la notaría
do $$
declare
  v_cv uuid;
  v_don uuid;
  v_soc uuid;
  v_pod uuid;
  v_test uuid;
  v_can uuid;
  v_doc_titulo uuid;
  v_doc_predial uuid;
  v_doc_agua uuid;
  v_doc_libertad uuid;
  v_doc_avaluo uuid;
  v_doc_cedula uuid;
  v_doc_ine uuid;
  v_doc_domicilio uuid;
  v_doc_curp uuid;
  v_doc_csf uuid;
  v_doc_acta uuid;
  v_doc_poder uuid;
  v_doc_permiso uuid;
  v_doc_estatutos uuid;
begin
  -- Obtener IDs de actos
  select id into v_cv from public.actos_juridicos where nombre = 'COMPRAVENTA';
  select id into v_don from public.actos_juridicos where nombre = 'DONACION';
  select id into v_soc from public.actos_juridicos where nombre = 'SOCIEDADES';
  select id into v_pod from public.actos_juridicos where nombre = 'PODERES';
  select id into v_test from public.actos_juridicos where nombre = 'TESTAMENTO';
  select id into v_can from public.actos_juridicos where nombre = 'CANCELACION DE HIPOTECA';

  -- Obtener IDs de tipos de documentos
  select id into v_doc_titulo from public.cat_tipos_documento_notarial where codigo = 'titulo_propiedad';
  select id into v_doc_predial from public.cat_tipos_documento_notarial where codigo = 'boleta_predial';
  select id into v_doc_agua from public.cat_tipos_documento_notarial where codigo = 'agua_no_adeudo';
  select id into v_doc_libertad from public.cat_tipos_documento_notarial where codigo = 'libertad_gravamenes';
  select id into v_doc_avaluo from public.cat_tipos_documento_notarial where codigo = 'avaluo_comercial';
  select id into v_doc_cedula from public.cat_tipos_documento_notarial where codigo = 'cedula_catastral';
  select id into v_doc_ine from public.cat_tipos_documento_notarial where codigo = 'identificacion_oficial';
  select id into v_doc_domicilio from public.cat_tipos_documento_notarial where codigo = 'comprobante_domicilio';
  select id into v_doc_curp from public.cat_tipos_documento_notarial where codigo = 'curp';
  select id into v_doc_csf from public.cat_tipos_documento_notarial where codigo = 'csf_sat';
  select id into v_doc_acta from public.cat_tipos_documento_notarial where codigo = 'acta_constitutiva';
  select id into v_doc_poder from public.cat_tipos_documento_notarial where codigo = 'poder_notarial';
  select id into v_doc_permiso from public.cat_tipos_documento_notarial where codigo = 'permiso_se_sociedad';
  select id into v_doc_estatutos from public.cat_tipos_documento_notarial where codigo = 'proyecto_estatutos';

  -- Requisitos para COMPRAVENTA
  if v_cv is not null then
    insert into public.acto_juridico_requisitos_documentales (acto_juridico_id, tipo_documento_id, obligatorio, orden) values
      (v_cv, v_doc_titulo, true, 10),
      (v_cv, v_doc_predial, true, 20),
      (v_cv, v_doc_agua, true, 30),
      (v_cv, v_doc_libertad, true, 40),
      (v_cv, v_doc_avaluo, false, 50),
      (v_cv, v_doc_cedula, false, 60),
      (v_cv, v_doc_csf, true, 70),
      (v_cv, v_doc_ine, true, 80)
    on conflict do nothing;
  end if;

  -- Requisitos para DONACION
  if v_don is not null then
    insert into public.acto_juridico_requisitos_documentales (acto_juridico_id, tipo_documento_id, obligatorio, orden) values
      (v_don, v_doc_titulo, true, 10),
      (v_don, v_doc_predial, true, 20),
      (v_don, v_doc_agua, true, 30),
      (v_don, v_doc_libertad, true, 40),
      (v_don, v_doc_ine, true, 50),
      (v_don, v_doc_csf, true, 60)
    on conflict do nothing;
  end if;

  -- Requisitos para SOCIEDADES
  if v_soc is not null then
    insert into public.acto_juridico_requisitos_documentales (acto_juridico_id, tipo_documento_id, obligatorio, orden) values
      (v_soc, v_doc_permiso, true, 10),
      (v_soc, v_doc_estatutos, true, 20),
      (v_soc, v_doc_ine, true, 30),
      (v_soc, v_doc_csf, true, 40),
      (v_soc, v_doc_curp, true, 50),
      (v_soc, v_doc_domicilio, false, 60)
    on conflict do nothing;
  end if;

  -- Requisitos para PODERES
  if v_pod is not null then
    insert into public.acto_juridico_requisitos_documentales (acto_juridico_id, tipo_documento_id, obligatorio, orden) values
      (v_pod, v_doc_ine, true, 10),
      (v_pod, v_doc_curp, true, 20),
      (v_pod, v_doc_domicilio, false, 30),
      (v_pod, v_doc_acta, false, 40),
      (v_pod, v_doc_poder, false, 50)
    on conflict do nothing;
  end if;

  -- Requisitos para TESTAMENTO
  if v_test is not null then
    insert into public.acto_juridico_requisitos_documentales (acto_juridico_id, tipo_documento_id, obligatorio, orden) values
      (v_test, v_doc_ine, true, 10),
      (v_test, v_doc_curp, true, 20),
      (v_test, v_doc_domicilio, false, 30)
    on conflict do nothing;
  end if;

  -- Requisitos para CANCELACION DE HIPOTECA
  if v_can is not null then
    insert into public.acto_juridico_requisitos_documentales (acto_juridico_id, tipo_documento_id, obligatorio, orden) values
      (v_can, v_doc_titulo, true, 10),
      (v_can, v_doc_predial, true, 20),
      (v_can, v_doc_libertad, true, 30),
      (v_can, v_doc_poder, true, 40)
    on conflict do nothing;
  end if;
end $$;

-- 3. Ampliación de expediente_documentos con atributos de cotejo notarial y tipo_documento_id
alter table public.expediente_documentos
  add column if not exists tipo_documento_id uuid references public.cat_tipos_documento_notarial(id),
  add column if not exists cotejado_contra_original boolean not null default false,
  add column if not exists tipo_documento_exhibido text check (tipo_documento_exhibido in ('original', 'copia_certificada', 'copia_simple')),
  add column if not exists cotejado_por uuid references public.profiles(id),
  add column if not exists fecha_cotejo timestamptz,
  add column if not exists notas_cotejo text;

create index if not exists idx_expediente_docs_tipo on public.expediente_documentos(tipo_documento_id);

-- 4. Registro de dispensas documentales autorizadas por Notario Titular
create table if not exists public.expediente_dispensas_documentales (
  id uuid primary key default gen_random_uuid(),
  escritura_id uuid not null references public.escrituras(id) on delete cascade,
  tipo_documento_id uuid not null references public.cat_tipos_documento_notarial(id) on delete cascade,
  motivo text not null,
  dispensado_por uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint uq_dispensa_escritura_tipo unique (escritura_id, tipo_documento_id)
);

create index if not exists idx_dispensas_escritura on public.expediente_dispensas_documentales(escritura_id);

alter table public.expediente_dispensas_documentales enable row level security;

create policy "dispensas_select"
  on public.expediente_dispensas_documentales for select
  to authenticated
  using (true);

create policy "dispensas_insert"
  on public.expediente_dispensas_documentales for insert
  to authenticated
  with check (
    public.fn_has_permiso('administracion', 'acceso') or
    public.fn_has_permiso('escrituras', 'editar')
  );

create policy "dispensas_delete"
  on public.expediente_dispensas_documentales for delete
  to authenticated
  using (
    public.fn_has_permiso('administracion', 'acceso')
  );

-- 5. Bitácora de descargas y compilaciones para auditoría
create table if not exists public.expediente_descargas_log (
  id uuid primary key default gen_random_uuid(),
  escritura_id uuid not null references public.escrituras(id) on delete cascade,
  usuario_id uuid not null references public.profiles(id),
  tipo_descarga text not null check (tipo_descarga in ('individual', 'zip_seleccion', 'pdf_compilado')),
  documentos_ids uuid[],
  total_documentos integer not null default 0,
  bytes_estimados bigint,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_descargas_log_escritura on public.expediente_descargas_log(escritura_id);

alter table public.expediente_descargas_log enable row level security;

create policy "descargas_log_select"
  on public.expediente_descargas_log for select
  to authenticated
  using (true);

create policy "descargas_log_insert"
  on public.expediente_descargas_log for insert
  to authenticated
  with check (auth.uid() = usuario_id or auth.uid() is not null);

-- 6. Actualización de la vista dinámica public.v_expediente_escritura
drop view if exists public.v_expediente_escritura;

create or replace view public.v_expediente_escritura as
select 
  d.id as documento_id,
  d.entidad_tipo,
  d.entidad_id,
  d.tipo_documento_id,
  td.codigo as tipo_documento_codigo,
  td.nombre as tipo_documento_nombre,
  d.categoria,
  d.lado,
  d.archivo_nombre,
  d.archivo_path,
  d.mime_type,
  d.size_bytes,
  d.cotejado_contra_original,
  d.tipo_documento_exhibido,
  d.cotejado_por,
  p_cot.nombre_completo as cotejador_nombre,
  d.fecha_cotejo,
  d.notas_cotejo,
  d.metadata,
  d.created_at,
  e.id as escritura_id,
  'escritura' as origen_documento,
  null::uuid as compareciente_id,
  null::text as compareciente_nombre
from public.expediente_documentos d
join public.escrituras e on d.entidad_id = e.id and d.entidad_tipo = 'escritura'
left join public.cat_tipos_documento_notarial td on d.tipo_documento_id = td.id
left join public.profiles p_cot on d.cotejado_por = p_cot.id

union all

select 
  d.id as documento_id,
  d.entidad_tipo,
  d.entidad_id,
  d.tipo_documento_id,
  td.codigo as tipo_documento_codigo,
  td.nombre as tipo_documento_nombre,
  d.categoria,
  d.lado,
  d.archivo_nombre,
  d.archivo_path,
  d.mime_type,
  d.size_bytes,
  d.cotejado_contra_original,
  d.tipo_documento_exhibido,
  d.cotejado_por,
  p_cot.nombre_completo as cotejador_nombre,
  d.fecha_cotejo,
  d.notas_cotejo,
  d.metadata,
  d.created_at,
  ec.escritura_id,
  'compareciente' as origen_documento,
  c.id as compareciente_id,
  coalesce(trim(pf.nombres || ' ' || pf.primer_apellido || ' ' || coalesce(pf.segundo_apellido, '')), pm.razon_social) as compareciente_nombre
from public.expediente_documentos d
join public.comparecientes c on d.entidad_id = c.id and d.entidad_tipo = 'compareciente'
join public.escritura_comparecientes ec on ec.compareciente_id = c.id
left join public.cat_tipos_documento_notarial td on d.tipo_documento_id = td.id
left join public.profiles p_cot on d.cotejado_por = p_cot.id
left join public.compareciente_personas_fisicas pf on pf.compareciente_id = c.id
left join public.compareciente_personas_morales pm on pm.compareciente_id = c.id;

grant select on public.v_expediente_escritura to authenticated, anon, service_role;
grant select, insert, update, delete on public.cat_tipos_documento_notarial to authenticated, anon, service_role;
grant select, insert, update, delete on public.acto_juridico_requisitos_documentales to authenticated, anon, service_role;
grant select, insert, update, delete on public.expediente_dispensas_documentales to authenticated, service_role;
grant select, insert on public.expediente_descargas_log to authenticated, service_role;

-- 7. Funciones RPC: evaluación de requisitos, asiento de cotejo, dispensa y descarga

-- 7.1 fn_evaluar_requisitos_expediente
create or replace function public.fn_evaluar_requisitos_expediente (
  p_escritura_id uuid
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_escritura record;
  v_req record;
  v_doc record;
  v_disp record;
  v_requisitos jsonb := '[]'::jsonb;
  v_total_requisitos integer := 0;
  v_total_cumplidos integer := 0;
  v_total_obligatorios integer := 0;
  v_obligatorios_cumplidos integer := 0;
  v_obligatorios_faltantes text[] := '{}';
  v_criticos_sin_cotejo text[] := '{}';
  v_estado text;
  v_semaforo text := 'verde';
  v_permite_protocolizar boolean := true;
begin
  select * into v_escritura from public.escrituras where id = p_escritura_id;
  if not found then
    return jsonb_build_object('error', 'Escritura no encontrada');
  end if;

  for v_req in
    select 
      r.id as requisito_id,
      r.acto_juridico_id,
      r.tipo_documento_id,
      r.obligatorio,
      r.rol_compareciente,
      r.orden,
      td.codigo as tipo_codigo,
      td.nombre as tipo_nombre,
      td.categoria as tipo_categoria,
      td.requiere_cotejo_fisico
    from public.acto_juridico_requisitos_documentales r
    join public.cat_tipos_documento_notarial td on r.tipo_documento_id = td.id
    where r.acto_juridico_id = v_escritura.acto_juridico_id and r.activo = true
    order by r.orden asc
  loop
    v_total_requisitos := v_total_requisitos + 1;
    if v_req.obligatorio then
      v_total_obligatorios := v_total_obligatorios + 1;
    end if;

    -- Buscar documento que satisfaga este requisito
    select * into v_doc
    from public.v_expediente_escritura
    where escritura_id = p_escritura_id
      and (
        tipo_documento_id = v_req.tipo_documento_id
        or (v_req.tipo_codigo = 'identificacion_oficial' and categoria = 'identificacion_oficial')
        or (v_req.tipo_codigo = 'comprobante_domicilio' and categoria = 'comprobante_domicilio')
        or (v_req.tipo_codigo = 'acta_constitutiva' and categoria = 'acta_constitutiva')
        or (v_req.tipo_codigo = 'poder_notarial' and categoria = 'poder_notarial')
      )
    order by cotejado_contra_original desc, created_at desc
    limit 1;

    -- Buscar dispensa si no hay documento
    select * into v_disp
    from public.expediente_dispensas_documentales
    where escritura_id = p_escritura_id and tipo_documento_id = v_req.tipo_documento_id;

    if v_doc.documento_id is not null then
      v_estado := 'cargado';
      v_total_cumplidos := v_total_cumplidos + 1;
      if v_req.obligatorio then
        v_obligatorios_cumplidos := v_obligatorios_cumplidos + 1;
      end if;

      -- Verificar cotejo para documentos críticos (título de propiedad, poder notarial)
      if v_req.requiere_cotejo_fisico and not coalesce(v_doc.cotejado_contra_original, false) and v_disp.id is null then
        v_criticos_sin_cotejo := array_append(v_criticos_sin_cotejo, v_req.tipo_nombre || ' (Falta cotejo físico)');
      end if;

    elsif v_disp.id is not null then
      v_estado := 'dispensado';
      v_total_cumplidos := v_total_cumplidos + 1;
      if v_req.obligatorio then
        v_obligatorios_cumplidos := v_obligatorios_cumplidos + 1;
      end if;
    else
      v_estado := 'pendiente';
      if v_req.obligatorio then
        v_obligatorios_faltantes := array_append(v_obligatorios_faltantes, v_req.tipo_nombre);
      end if;
    end if;

    v_requisitos := v_requisitos || jsonb_build_array(jsonb_build_object(
      'tipo_documento_id', v_req.tipo_documento_id,
      'tipo_documento_codigo', v_req.tipo_codigo,
      'tipo_documento_nombre', v_req.tipo_nombre,
      'categoria', v_req.tipo_categoria,
      'obligatorio', v_req.obligatorio,
      'requiere_cotejo_fisico', v_req.requiere_cotejo_fisico,
      'rol_compareciente', v_req.rol_compareciente,
      'estado', v_estado,
      'documento_id', v_doc.documento_id,
      'archivo_nombre', v_doc.archivo_nombre,
      'archivo_path', v_doc.archivo_path,
      'cotejado_contra_original', coalesce(v_doc.cotejado_contra_original, false),
      'tipo_documento_exhibido', v_doc.tipo_documento_exhibido,
      'cotejado_por_nombre', v_doc.cotejador_nombre,
      'fecha_cotejo', v_doc.fecha_cotejo,
      'motivo_dispensa', v_disp.motivo,
      'dispensado_por_id', v_disp.dispensado_por
    ));
  end loop;

  -- Determinar semáforo y si permite protocolizar
  if array_length(v_obligatorios_faltantes, 1) is not null and array_length(v_obligatorios_faltantes, 1) > 0 then
    v_semaforo := 'rojo';
    v_permite_protocolizar := false;
  elsif array_length(v_criticos_sin_cotejo, 1) is not null and array_length(v_criticos_sin_cotejo, 1) > 0 then
    v_semaforo := 'amarillo';
    v_permite_protocolizar := false;
  elsif v_total_cumplidos < v_total_requisitos then
    v_semaforo := 'amarillo';
    v_permite_protocolizar := true;
  else
    v_semaforo := 'verde';
    v_permite_protocolizar := true;
  end if;

  return jsonb_build_object(
    'escritura_id', p_escritura_id,
    'total_requisitos', v_total_requisitos,
    'total_cumplidos', v_total_cumplidos,
    'total_obligatorios', v_total_obligatorios,
    'obligatorios_cumplidos', v_obligatorios_cumplidos,
    'obligatorios_faltantes', to_jsonb(v_obligatorios_faltantes),
    'titulos_o_poderes_sin_cotejo', to_jsonb(v_criticos_sin_cotejo),
    'semaforo', v_semaforo,
    'permite_protocolizar', v_permite_protocolizar,
    'requisitos', v_requisitos
  );
end;
$$;

-- 7.2 fn_asentar_cotejo_notarial
create or replace function public.fn_asentar_cotejo_notarial (
  p_documento_id uuid,
  p_tipo_exhibido text,
  p_notas text default null
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_doc record;
  v_user_id uuid := auth.uid();
begin
  if p_tipo_exhibido not in ('original', 'copia_certificada', 'copia_simple') then
    raise exception 'Tipo de documento exhibido no válido: %', p_tipo_exhibido;
  end if;

  update public.expediente_documentos
  set
    cotejado_contra_original = (p_tipo_exhibido in ('original', 'copia_certificada')),
    tipo_documento_exhibido = p_tipo_exhibido,
    cotejado_por = coalesce(v_user_id, cotejado_por),
    fecha_cotejo = now(),
    notas_cotejo = p_notas
  where id = p_documento_id
  returning * into v_doc;

  if not found then
    raise exception 'Documento no encontrado: %', p_documento_id;
  end if;

  return to_jsonb(v_doc);
end;
$$;

-- 7.3 fn_registrar_dispensa_documental
create or replace function public.fn_registrar_dispensa_documental (
  p_escritura_id uuid,
  p_tipo_documento_id uuid,
  p_motivo text
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_disp record;
  v_user_id uuid := auth.uid();
begin
  if trim(coalesce(p_motivo, '')) = '' then
    raise exception 'El motivo de la dispensa notarial es obligatorio.';
  end if;

  insert into public.expediente_dispensas_documentales (
    escritura_id,
    tipo_documento_id,
    motivo,
    dispensado_por
  ) values (
    p_escritura_id,
    p_tipo_documento_id,
    p_motivo,
    coalesce(v_user_id, (select id from public.profiles limit 1))
  )
  on conflict (escritura_id, tipo_documento_id) do update set
    motivo = excluded.motivo,
    dispensado_por = excluded.dispensado_por,
    created_at = now()
  returning * into v_disp;

  return to_jsonb(v_disp);
end;
$$;

-- 7.4 fn_registrar_descarga_expediente
create or replace function public.fn_registrar_descarga_expediente (
  p_escritura_id uuid,
  p_tipo_descarga text,
  p_documentos_ids uuid[] default null,
  p_bytes bigint default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_log_id uuid;
  v_user_id uuid := auth.uid();
  v_total integer := coalesce(cardinality(p_documentos_ids), 0);
begin
  insert into public.expediente_descargas_log (
    escritura_id,
    usuario_id,
    tipo_descarga,
    documentos_ids,
    total_documentos,
    bytes_estimados,
    metadata
  ) values (
    p_escritura_id,
    coalesce(v_user_id, (select id from public.profiles limit 1)),
    p_tipo_descarga,
    p_documentos_ids,
    v_total,
    p_bytes,
    p_metadata
  ) returning id into v_log_id;

  return v_log_id;
end;
$$;

-- 8. Actualización integral de fn_validar_protocolizacion con Sección I (Integración de Expediente y Fe de Cotejo)
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

  return v_motivos;
end;
$$;

grant execute on function public.fn_evaluar_requisitos_expediente to authenticated, anon, service_role;
grant execute on function public.fn_asentar_cotejo_notarial to authenticated, service_role;
grant execute on function public.fn_registrar_dispensa_documental to authenticated, service_role;
grant execute on function public.fn_registrar_descarga_expediente to authenticated, service_role;
grant execute on function public.fn_validar_protocolizacion to authenticated, service_role;

notify pgrst, 'reload schema';
