-- ============================================================================
-- Migración: 20260813000000_notificaciones.sql
-- Módulo: 12-notificaciones (Sistema Notarial de Notificaciones Multicanal y Avisos a Comparecientes)
-- Conforme a la Constitución Notarial (§1, §2, §7, §8)
-- ============================================================================

-- 1. Registro de Permisos Dinámicos en public.permisos
insert into public.permisos (modulo, accion, descripcion, requiere_alcance) values
  ('notificaciones', 'ver', 'Ver notificaciones y bitácora de envíos', false),
  ('notificaciones', 'reenviar', 'Reenviar y despachar notificaciones a clientes', false),
  ('notificaciones', 'configurar_plantillas', 'Configurar plantillas de notificaciones y canales', false)
on conflict (modulo, accion) do update
  set descripcion = excluded.descripcion,
      requiere_alcance = excluded.requiere_alcance;

-- Asignar permisos a roles existentes
insert into public.rol_permisos (rol_id, permiso_id, alcance)
select r.id, p.id, null
from public.roles r
cross join public.permisos p
where r.nombre in ('Administrador', 'Notario Titular')
  and p.modulo = 'notificaciones'
on conflict (rol_id, permiso_id) do nothing;

insert into public.rol_permisos (rol_id, permiso_id, alcance)
select r.id, p.id, null
from public.roles r
cross join public.permisos p
where r.nombre in ('Gestor', 'Abogado')
  and p.modulo = 'notificaciones'
  and p.accion in ('ver', 'reenviar')
on conflict (rol_id, permiso_id) do nothing;

-- 2. Tabla de Plantillas de Notificaciones
create table if not exists public.plantillas_notificaciones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  canal text not null check (canal in ('correo', 'whatsapp', 'sms')),
  asunto text,
  cuerpo text not null,
  variables_disponibles text[] not null default '{}',
  requiere_confirmacion boolean not null default true,
  activo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabla de Bitácora Histórica de Notificaciones
create table if not exists public.notificaciones_bitacora (
  id uuid primary key default gen_random_uuid(),
  plantilla_id uuid references public.plantillas_notificaciones(id) on delete set null,
  escritura_id uuid references public.escrituras(id) on delete set null,
  compareciente_id uuid references public.comparecientes(id) on delete set null,
  canal text not null check (canal in ('correo', 'whatsapp', 'sms')),
  destinatario_nombre text not null,
  destinatario_contacto text not null,
  asunto text,
  cuerpo_renderizado text not null,
  estatus text not null default 'pendiente' check (estatus in ('pendiente', 'enviado', 'entregado', 'leido', 'fallido')),
  tipo_evento text not null default 'manual',
  intentos_envio int not null default 1,
  error_detalle text,
  archivos_adjuntos jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Índices de Rendimiento y Búsqueda
create index if not exists idx_notificaciones_escritura_id on public.notificaciones_bitacora(escritura_id);
create index if not exists idx_notificaciones_compareciente_id on public.notificaciones_bitacora(compareciente_id);
create index if not exists idx_notificaciones_canal on public.notificaciones_bitacora(canal);
create index if not exists idx_notificaciones_estatus on public.notificaciones_bitacora(estatus);
create index if not exists idx_notificaciones_created_at on public.notificaciones_bitacora(created_at desc);
create index if not exists idx_plantillas_codigo on public.plantillas_notificaciones(codigo);
create index if not exists idx_plantillas_canal on public.plantillas_notificaciones(canal);

-- 5. Semilla inicial de las 12 Plantillas Notariales Oficiales
insert into public.plantillas_notificaciones (codigo, nombre, descripcion, canal, asunto, cuerpo, variables_disponibles, requiere_confirmacion, activo)
values
  (
    'CITA_FIRMA_WHATSAPP',
    'Citatorio de Firma en Protocolo (WhatsApp)',
    'Notificación inmediata con fecha y requerimientos para la firma de escritura.',
    'whatsapp',
    null,
    'Estimado(a) {{nombre_cliente}}, le saludamos de la {{notaria}}. Le confirmamos su cita para firma de la Escritura No. {{numero_instrumento}} ({{acto}}) programada para el {{fecha_cita}}. Por favor presentarse con su identificación oficial vigente original.',
    array['nombre_cliente', 'notaria', 'numero_instrumento', 'acto', 'fecha_cita'],
    true,
    true
  ),
  (
    'CITA_FIRMA_CORREO',
    'Citatorio Notarial para Firma en Protocolo (Correo)',
    'Convocatoria formal por correo electrónico con detalles de la cita para otorgamiento y firma.',
    'correo',
    'Citatorio para Firma de Escritura No. {{numero_instrumento}} - {{notaria}}',
    'Estimado(a) {{nombre_cliente}}:\n\nPor medio del presente le notificamos que su instrumento notarial No. {{numero_instrumento}} correspondiente al acto de {{acto}} se encuentra listo para firma en protocolo.\n\nFecha y hora de su cita: {{fecha_cita}}\nLugar: Instalaciones de la {{notaria}}.\n\nFavor de acudir con su identificación oficial vigente original (INE o Pasaporte).\n\nAtentamente,\n{{notaria}}',
    array['nombre_cliente', 'notaria', 'numero_instrumento', 'acto', 'fecha_cita'],
    true,
    true
  ),
  (
    'TRAMITE_RPP_INGRESADO_WHATSAPP',
    'Trámite Ingresado al RPP (WhatsApp)',
    'Aviso automático de ingreso formal de testimonios ante el Registro Público.',
    'whatsapp',
    null,
    'Estimado(a) {{nombre_cliente}}, le informamos que su trámite de la Escritura No. {{numero_instrumento}} ha sido ingresado al Registro Público de la Propiedad con el folio {{folio_tramite}}. Le mantendremos informado de su avance.',
    array['nombre_cliente', 'numero_instrumento', 'folio_tramite', 'notaria'],
    false,
    true
  ),
  (
    'TRAMITE_RPP_INGRESADO_CORREO',
    'Aviso de Ingreso a RPP (Correo)',
    'Comunicado formal por correo con número de folio de entrada registral.',
    'correo',
    'Actualización de Trámite RPP - Escritura No. {{numero_instrumento}}',
    'Estimado(a) {{nombre_cliente}}:\n\nLe notificamos que el trámite relativo a su Escritura No. {{numero_instrumento}} ({{acto}}) ha sido formalmente ingresado ante el Registro Público de la Propiedad con el folio oficial {{folio_tramite}}.\n\nContinuamos con el seguimiento puntual de su inscripción registral.\n\nAtentamente,\n{{notaria}}',
    array['nombre_cliente', 'numero_instrumento', 'acto', 'folio_tramite', 'notaria'],
    false,
    true
  ),
  (
    'TRAMITE_CATASTRO_WHATSAPP',
    'Trámite Catastral en Gestión (WhatsApp)',
    'Notificación de gestoría y avalúo catastral.',
    'whatsapp',
    null,
    'Aviso Notarial: Su trámite ante {{dependencia}} para la Escritura No. {{numero_instrumento}} está en proceso con folio {{folio_tramite}}. Saludos desde {{notaria}}.',
    array['nombre_cliente', 'dependencia', 'numero_instrumento', 'folio_tramite', 'notaria'],
    false,
    true
  ),
  (
    'TRAMITE_CATASTRO_CORREO',
    'Aviso de Trámite Catastral (Correo)',
    'Notificación por correo de trámites ante oficinas catastrales municipales.',
    'correo',
    'Seguimiento Catastral - Escritura No. {{numero_instrumento}}',
    'Estimado(a) {{nombre_cliente}}:\n\nLe informamos que el avalúo y trámite catastral correspondiente a su instrumento No. {{numero_instrumento}} se encuentra en gestión ante {{dependencia}} bajo el número de expediente {{folio_tramite}}.\n\nAtentamente,\n{{notaria}}',
    array['nombre_cliente', 'dependencia', 'numero_instrumento', 'folio_tramite', 'notaria'],
    false,
    true
  ),
  (
    'ORDEN_PAGO_EMITIDA_WHATSAPP',
    'Nueva Orden de Pago Emitida (WhatsApp)',
    'Aviso de derechos e impuestos listos para pago.',
    'whatsapp',
    null,
    'Estimado(a) {{nombre_cliente}}, se ha generado una orden de pago por un importe de ${{monto}} para los derechos e impuestos de su Escritura No. {{numero_instrumento}}. Puede consultar el desglose o realizar su transferencia con las instrucciones adjuntas.',
    array['nombre_cliente', 'monto', 'numero_instrumento', 'notaria'],
    false,
    true
  ),
  (
    'ORDEN_PAGO_EMITIDA_CORREO',
    'Emisión de Orden de Pago (Correo)',
    'Notificación con datos bancarios y desglose de liquidación de gastos/impuestos.',
    'correo',
    'Orden de Pago Generada - Instrumento No. {{numero_instrumento}}',
    'Estimado(a) {{nombre_cliente}}:\n\nLe notificamos la emisión de la orden de pago por concepto de derechos, impuestos o gastos notariales por un importe de ${{monto}} M.N. correspondiente a la Escritura No. {{numero_instrumento}}.\n\nFavor de remitir el comprobante de liquidación una vez efectuada la transferencia.\n\nAtentamente,\n{{notaria}}',
    array['nombre_cliente', 'monto', 'numero_instrumento', 'notaria'],
    false,
    true
  ),
  (
    'PAGO_LIQUIDADO_WHATSAPP',
    'Confirmación de Pago Recibido (WhatsApp)',
    'Acuse de acreditación de recursos en cuenta de la notaría.',
    'whatsapp',
    null,
    'Confirmación de Pago: Hemos recibido y acreditado con éxito su pago por ${{monto}} para el expediente de la Escritura No. {{numero_instrumento}}. Gracias por su atención. {{notaria}}',
    array['nombre_cliente', 'monto', 'numero_instrumento', 'notaria'],
    false,
    true
  ),
  (
    'PAGO_LIQUIDADO_CORREO',
    'Recibo y Acreditación de Pago (Correo)',
    'Confirmación por correo con recibo o comprobante contable adjunto.',
    'correo',
    'Comprobante de Pago Acreditado - Escritura No. {{numero_instrumento}}',
    'Estimado(a) {{nombre_cliente}}:\n\nHemos registrado satisfactoriamente la liquidación de ${{monto}} M.N. aplicados a su cuenta de gastos y honorarios de la Escritura No. {{numero_instrumento}}.\n\nAdjuntamos su comprobante de pago oficial.\n\nAtentamente,\n{{notaria}}',
    array['nombre_cliente', 'monto', 'numero_instrumento', 'notaria'],
    false,
    true
  ),
  (
    'TESTIMONIO_LISTO_WHATSAPP',
    'Primer Testimonio Listo para Entrega (WhatsApp)',
    'Aviso de conclusión de trámite e inscripción para recoger testimonio en notaría.',
    'whatsapp',
    null,
    '¡Buenas noticias {{nombre_cliente}}! El Primer Testimonio de su Escritura No. {{numero_instrumento}} debidamente inscrito ya está disponible en nuestras oficinas de {{notaria}} para su entrega. Puede pasar a recogerlo en nuestro horario habitual.',
    array['nombre_cliente', 'numero_instrumento', 'notaria'],
    true,
    true
  ),
  (
    'REQUERIMIENTO_DOCUMENTAL_WHATSAPP',
    'Requerimiento de Documentación Pendiente (WhatsApp)',
    'Solicitud puntual de documentos faltantes para complementar el expediente previo a firma.',
    'whatsapp',
    null,
    'Estimado(a) {{nombre_cliente}}, para continuar con la integración de su expediente de la Escritura No. {{numero_instrumento}}, solicitamos amablemente el envío de la documentación pendiente requerida. Dudas o aclaraciones a su disposición en {{notaria}}.',
    array['nombre_cliente', 'numero_instrumento', 'notaria'],
    true,
    true
  )
on conflict (codigo) do update
  set nombre = excluded.nombre,
      descripcion = excluded.descripcion,
      canal = excluded.canal,
      asunto = excluded.asunto,
      cuerpo = excluded.cuerpo,
      variables_disponibles = excluded.variables_disponibles,
      requiere_confirmacion = excluded.requiere_confirmacion,
      activo = excluded.activo;

-- 6. Habilitar Row Level Security (RLS)
alter table public.plantillas_notificaciones enable row level security;
alter table public.notificaciones_bitacora enable row level security;

-- Políticas de Plantillas
drop policy if exists "plantillas_notificaciones_select" on public.plantillas_notificaciones;
create policy "plantillas_notificaciones_select" on public.plantillas_notificaciones
  for select using (true);

drop policy if exists "plantillas_notificaciones_admin_modify" on public.plantillas_notificaciones;
create policy "plantillas_notificaciones_admin_modify" on public.plantillas_notificaciones
  for all to authenticated
  using (
    auth.role() = 'authenticated'
  )
  with check (
    auth.role() = 'authenticated'
  );

-- Políticas de Bitácora
drop policy if exists "notificaciones_bitacora_select" on public.notificaciones_bitacora;
create policy "notificaciones_bitacora_select" on public.notificaciones_bitacora
  for select using (true);

drop policy if exists "notificaciones_bitacora_authenticated_all" on public.notificaciones_bitacora;
create policy "notificaciones_bitacora_authenticated_all" on public.notificaciones_bitacora
  for all to authenticated
  using (
    auth.role() = 'authenticated'
  )
  with check (
    auth.role() = 'authenticated'
  );

-- 7. Grants
grant select, insert, update, delete on public.plantillas_notificaciones to authenticated, service_role;
grant select, insert, update, delete on public.notificaciones_bitacora to authenticated, service_role;
grant select on public.plantillas_notificaciones to anon;
grant select on public.notificaciones_bitacora to anon;

notify pgrst, 'reload schema';
