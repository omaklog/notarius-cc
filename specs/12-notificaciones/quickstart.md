# Quickstart: 12-notificaciones (Sistema Notarial de Notificaciones Multicanal y Avisos a Comparecientes)

Este documento describe los escenarios paso a paso para validar de forma integral el funcionamiento del módulo de Notificaciones.

---

## Prerrequisitos
- Usuario autenticado con rol administrativo o gestor con permisos `notificaciones.ver`, `notificaciones.reenviar` y `notificaciones.configurar_plantillas`.
- Base de datos con migración `20260813000000_notificaciones.sql` aplicada.

---

## Escenario 1: Monitoreo y Métricas en el Centro de Notificaciones
1. Iniciar sesión con `notario@notaria.local`.
2. Navegar a `/notificaciones` desde el menú lateral (Grupo "Sistema" > "Notificaciones").
3. **Verificación visual**:
   - Se muestra la cabecera "Centro de Notificaciones y Avisos a Comparecientes".
   - Se despliegan las 4 tarjetas de KPIs: *Total Enviados*, *Tasa de Entrega*, *WhatsApp Business*, *Fallidos / Por Reintentar*.
   - Se muestra la tabla con la bitácora de mensajes con badges de estatus (*Enviado, Entregado, Leído, Fallido*) e iconos de canal.

---

## Escenario 2: Redacción y Despacho de Notificación Manual
1. En `/notificaciones`, pulsar el botón primario **"+ Redactar Notificación"**.
2. En el modal emergente:
   - Seleccionar un compareciente existente (o capturar nombre y teléfono/correo).
   - Vincular opcionalmente una escritura (ej. Instrumento `#48102`).
   - Seleccionar canal: **WhatsApp** o **Correo Electrónico**.
   - Seleccionar la plantilla *"Citatorio Notarial para Firma en Protocolo"*.
   - Constatar que las variables se interpolan en la previsualización en tiempo real.
3. Pulsar **"Despachar Notificación"**.
4. **Resultado esperado**:
   - Aparece un mensaje toast de confirmación.
   - La nueva notificación aparece en el primer renglón de la tabla con estatus `entregado` o `enviado`.

---

## Escenario 3: Reenvío Inmediato en 1 Clic
1. En la tabla de bitácora, ubicar un registro en estatus `fallido` o seleccionar uno existente.
2. Hacer clic en el botón de acción rápida **"Reenviar"** (icono `mdi-refresh` / `mdi-send`).
3. **Resultado esperado**:
   - El sistema procesa el reenvío inmediato.
   - El contador de reintentos incrementa a `2`.
   - El estatus se actualiza y se emite notificación de éxito.

---

## Escenario 4: Personalización de Plantillas Dinámicas
1. En `/notificaciones`, pulsar **"Configurar Plantillas"**.
2. Seleccionar la plantilla *"Aviso de Trámite Ingresado a RPP"*.
3. Modificar el texto del cuerpo agregando la variable `{{folio_tramite}}` y pulsar **"Guardar Plantilla"**.
4. **Resultado esperado**:
   - La plantilla se persiste en Supabase.
   - Al redactar un nuevo mensaje con esa plantilla, el nuevo texto y token aparecen disponibles.

## Escenario 5: Consulta Contextual desde la Escritura
1. Navegar a `/escrituras/` y abrir la escritura `#48102` (`/escrituras/esc-101`).
2. En la cabecera superior, junto al botón de protocolización, pulsar el botón de campana o icono **"Avisos Enviados"**.
3. **Resultado esperado**:
   - Se abre el diálogo `NotificacionesHistorialDialog`.
   - Se muestran únicamente los avisos despachados vinculados a ese instrumento notarial específico.

---

## Escenario 6: Despacho Contextual desde Pestañas Operativas
1. En la escritura `#48102`:
   - Ir a la pestaña **Órdenes de Pago**: en la tabla de órdenes de pago, hacer clic en el botón de acción "Notificar" (`mdi-bell-outline` o `mdi-whatsapp`).
   - Ir a la pestaña **Honorarios**: en la tabla de cobros/pagos de honorarios, hacer clic en "Notificar Pago".
   - Ir a la pestaña **Georreferenciación**: en la cabecera o acciones del predio, pulsar "Citar para Ubicación Predial".
2. **Resultado esperado**:
   - Se abre de forma limpia `RedactarNotificacionModal` con el compareciente de la escritura ya preseleccionado, su teléfono/correo precargado, la plantilla correspondiente seleccionada (`ORDEN_PAGO_EMITIDA`, `PAGO_LIQUIDADO`, citatorio para ubicación predial) y los tokens (`{{monto}}`, `{{folio_tramite}}`, `{{acto}}`) resueltos.
   - El usuario puede adjuntar el comprobante local o comprobante de pago bancario y confirmar el envío.

---

## Escenario 7: Despacho por WhatsApp en macOS / Windows con Protocolo Nativo
1. Redactar una notificación con canal **WhatsApp** para un compareciente con número móvil registrado.
2. Pulsar **"Despachar Notificación"**.
3. **Resultado esperado**:
   - En macOS / Windows con WhatsApp Desktop instalado, el navegador solicita o abre directamente la aplicación de escritorio (`whatsapp://send?phone=...&text=...`), situando al usuario en la conversación del compareciente con el texto formal ya redactado y el enlace al documento adjunto.
   - En la interfaz se presenta además la opción de respaldo "Abrir en WhatsApp Web" (`https://web.whatsapp.com/send?...`) por si se prefiere la pestaña del navegador.
   - La bitácora asienta el registro con estatus `enviado` y metadatos del protocolo disparado.

---

## Escenario 8: Búsqueda y Autocompletado de Clientes en Tablero Central
1. En `/notificaciones`, abrir el modal **"+ Redactar Notificación"**.
2. En el campo autocompletado de compareciente/cliente, escribir parte del nombre (ej. "García").
3. Seleccionar el cliente de la lista desplegable.
4. **Resultado esperado**:
   - Se autollenan automáticamente los campos de nombre, teléfono y correo electrónico.
   - Se despliega el selector de escrituras activas del cliente para vincular opcionalmente el instrumento deseado en un solo clic.

