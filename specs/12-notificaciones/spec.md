# Feature Specification: 12-notificaciones (Sistema Notarial de Notificaciones Multicanal y Avisos a Comparecientes)

**Feature Branch**: `12-notificaciones`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "sistema transversal de notificaciones para clientes y notaría (correo, WhatsApp, SMS sobre trámites, pagos, firmas y alertas)"

## Clarifications

### Session 2026-09-22
- Q: ¿Cómo se gestionará el despacho de WhatsApp y el soporte de archivos adjuntos? → A: Se utilizará integración directa con WhatsApp Web (`https://web.whatsapp.com/send?phone=...&text=...`). El usuario podrá redactar comentarios o usar eventos/plantillas, adjuntar archivos desde su computadora (almacenados en Supabase Storage y enlazados), y abrir el chat de WhatsApp con el número del cliente y el mensaje pre-cargado.

### Session 2026-09-23
- Q: ¿Cómo debe gestionar el sistema el despacho por WhatsApp para abrir prioritariamente la aplicación de escritorio instalada en Mac sin perder la alternativa de WhatsApp Web? → A: Se utilizará el protocolo nativo `whatsapp://send?phone=${tel}&text=${msg}` para abrir directamente la app de escritorio de WhatsApp en macOS/Windows, manteniendo un enlace/selector de fallback a WhatsApp Web (`https://web.whatsapp.com/send?...`).
- Q: ¿Cómo debe comportarse la acción de notificar al pulsar el botón contextual en las listas de Órdenes de Pago, Honorarios y Georreferenciación? → A: Se abrirá el modal de redacción con los datos del compareciente de la escritura (nombre, contacto WhatsApp/correo), la plantilla preseleccionada y variables ya interpoladas (importes, folios o cita predial), permitiendo al gestor revisar, personalizar o adjuntar comprobantes locales antes de disparar el envío.
- Q: ¿Cómo debe operar la selección de destinatarios al redactar una notificación desde el panel central (/notificaciones)? → A: Se utilizará un campo de autocompletado conectado al catálogo de comparecientes/clientes que, al ser seleccionado, rellena automáticamente el nombre, teléfono celular, correo electrónico y despliega un selector con sus escrituras activas para vincular el instrumento en un solo clic.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Centro Centralizado de Notificaciones y Bitácora de Envíos (Priority: P1) 🎯 MVP

Como gestor notarial o abogado responsable, quiero acceder a un centro unificado de notificaciones (`/notificaciones`) donde pueda consultar en tiempo real todos los mensajes emitidos a comparecientes y clientes (por correo electrónico, WhatsApp o SMS), conocer su estatus de entrega, y disponer de la capacidad de reenviar cualquier notificación fallida o solicitada nuevamente por el cliente.

**Why this priority**: Es la base operativa indispensable para que el personal de la notaría tenga certeza y trazabilidad absoluta sobre qué avisos han sido despachados a los comparecientes, con qué contenido exacto, por qué canal y cuál es su estado de recepción.

**Independent Test**: Navegar a `/notificaciones`, visualizar la bitácora con filtros por estado (`enviado`, `entregado`, `leído`, `fallido`) y canal; seleccionar un mensaje fallido y accionar "Reenviar Notificación", constatando que se despacha nuevamente y se actualiza la bitácora con el nuevo intento de entrega.

**Acceptance Scenarios**:
1. **Given** un usuario autenticado con permiso `notificaciones.ver`, **When** accede a la ruta `/notificaciones`, **Then** el sistema muestra la bitácora de mensajes clasificada por canal, destinatario, fecha, escritura asociada y estatus de entrega.
2. **Given** una notificación en estado `fallido` o `enviado`, **When** el usuario con permiso `notificaciones.reenviar` pulsa el botón "Reenviar", **Then** el sistema procesa el reenvío inmediato, genera un nuevo registro de intento en la bitácora y notifica al usuario el resultado.
3. **Given** la bitácora con múltiples registros, **When** el usuario filtra por canal (ej. "WhatsApp") o busca por nombre de compareciente / número de escritura, **Then** la tabla responde dinámicamente mostrando únicamente los registros coincidentes.

---

### User Story 2 - Despacho Transversal por Eventos Notariales y Mensajería Directa (Priority: P2)

Como abogado o gestor, quiero que el sistema despache notificaciones automáticas o semiautomáticas a los comparecientes ante hitos clave del instrumento (avance de trámites ante dependencias, emisión y liquidación de órdenes de pago, confirmación de pagos de honorarios, citas de firma o testimonio listo), así como contar con un modal de "Enviar Aviso Notarial" para enviar un mensaje ad-hoc a los comparecientes de una escritura específica.

**Why this priority**: Reduce drásticamente la carga de llamadas telefónicas y consultas repetitivas de los clientes sobre "¿cómo va mi trámite?" o "¿ya quedó mi pago?", manteniendo una comunicación institucional proactiva y transparente.

**Independent Test**: Liquidar una orden de pago o registrar el ingreso de un trámite en Catastro/RPP para una escritura con comparecientes con teléfono/correo válidos, y verificar que en el centro de notificaciones se genera el mensaje con el folio y datos de la operación listo o despachado al destinatario correspondiente.

**Acceptance Scenarios**:
1. **Given** una orden de pago liquidada o un trámite que cambia a estatus "Ingresado en Dependencia", **When** se confirma el evento en el sistema, **Then** se dispara automáticamente la notificación correspondiente al compareciente con el folio oficial y fecha compromiso estimada.
2. **Given** una escritura en proceso, **When** el abogado pulsa "Redactar Aviso al Compareciente" desde el centro de notificaciones o la escritura, selecciona al destinatario y canal, y redacta o escoge una plantilla, **Then** el mensaje se despacha y queda vinculado al expediente y a la bitácora central.
3. **Given** un compareciente que carece de correo electrónico pero tiene número celular registrado, **When** se genera una notificación, **Then** el sistema selecciona automáticamente el canal móvil (WhatsApp o SMS) para asegurar la entrega.

---

### User Story 3 - Administración de Plantillas Notariales Dinámicas (Priority: P3)

Como administrador de la notaría, quiero configurar y personalizar las plantillas de notificación por canal y tipo de evento notarial (utilizando variables dinámicas como `{{nombre_compareciente}}`, `{{numero_instrumento}}`, `{{acto_juridico}}`, `{{dependencia}}`, `{{folio_tramite}}`, `{{monto}}`, `{{fecha_cita}}`), para garantizar que todos los mensajes salientes cumplan con el lenguaje formal, membrete y rigor legal del despacho.

**Why this priority**: Permite estandarizar la comunicación institucional, adaptar los textos a las políticas de cada notario y habilitar o deshabilitar qué eventos deben notificar sin requerir cambios de código.

**Independent Test**: Abrir la pestaña o diálogo de "Plantillas de Notificación", editar el texto de la plantilla "Trámite Ingresado a RPP", agregar una variable dinámica, guardar los cambios y emitir una prueba de previsualización para constatar que las variables se interpolan correctamente.

**Acceptance Scenarios**:
1. **Given** un usuario con permiso `notificaciones.configurar_plantillas`, **When** accede a la configuración de plantillas, **Then** visualiza las plantillas clasificadas por tipo de evento (`tramite_avance`, `pago_recibido`, `cita_firma`, `testimonio_listo`, `aviso_general`) y canal.
2. **Given** una plantilla seleccionada, **When** el administrador edita el asunto y cuerpo incorporando variables dinámicas y pulsa "Guardar", **Then** la plantilla se actualiza y los futuros envíos de ese evento reflejan el nuevo formato.
3. **Given** el editor de plantillas, **When** se pulsa "Previsualizar con datos de ejemplo", **Then** el sistema muestra cómo verá el cliente final el correo con membrete o el mensaje de WhatsApp.

---

## Edge Cases

- **Compareciente sin datos de contacto**: ¿Qué ocurre si un compareciente no tiene registrado ni correo electrónico ni teléfono móvil? El sistema debe advertir la falta de datos de contacto, registrar la incidencia en la bitácora como no enviable y sugerir actualizar los datos del compareciente en su expediente.
- **Falla del proveedor de mensajería (SMS/WhatsApp/Email)**: Si la API de envío externo experimenta una desconexión o rechazo (ej. número telefónico no habilitado en WhatsApp o buzón de correo rebotado), el estado transiciona a `fallido` con la descripción del error técnico visible para el gestor, habilitando el botón de reenvío por un canal alternativo.
- **Límite de caracteres en SMS**: Si una plantilla o mensaje se despacha por SMS, el texto debe ajustarse o truncar de forma inteligente para no exceder los límites estándar de telecomunicaciones (160 caracteres), o priorizar WhatsApp cuando el texto sea extenso.
- **Privacidad y Datos Personales Sensibles**: Los mensajes de notificación a clientes no deben exponer claves bancarias privadas, RFC de terceros ni dictámenes PLD confidenciales; únicamente datos transaccionales de trámite (folios, fechas, montos liquidados y recordatorios de citas).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE proveer un módulo central de notificaciones en la ruta `/notificaciones` accesible para usuarios con el permiso `notificaciones.ver`.
- **FR-002**: La bitácora de notificaciones DEBE registrar cada mensaje emitido con: identificador, canal utilizado (`correo`, `whatsapp`, `sms`), destinatario (nombre, email/teléfono), escritura o trámite asociado, asunto, contenido, estatus (`pendiente`, `enviado`, `entregado`, `leido`, `fallido`), proveedor de despacho, fecha/hora y registro del usuario emisor o evento automático.
- **FR-003**: El sistema DEBE permitir el reenvío manual de notificaciones fallidas o solicitudes de reemisión por usuarios con permiso `notificaciones.reenviar`.
- **FR-004**: El sistema DEBE soportar la parametrización de plantillas dinámicas con interpolación de variables del instrumento (`{{nombre_cliente}}`, `{{numero_instrumento}}`, `{{acto}}`, `{{dependencia}}`, `{{folio_tramite}}`, `{{monto}}`, `{{fecha_cita}}`, `{{notaria}}`).
- **FR-005**: Los usuarios con permiso `notificaciones.configurar_plantillas` DEBEN poder editar, activar o inactivar plantillas de notificación y previsualizar el resultado formateado antes de su uso.
- **FR-006**: El sistema DEBE proveer un modal o interfaz para "Redactar Notificación Notarial" directa a los comparecientes de una escritura seleccionada.
- **FR-007**: El sistema DEBE operar con un esquema híbrido configurable por plantilla: cada plantilla define si el despacho ante eventos (avance de trámites, liquidación de pagos, órdenes de pago) se ejecuta de forma automática desatendida o si requiere confirmación/autorización previa por parte del usuario (como en citas de firma y avisos delicados).
- **FR-008**: Los canales de comunicación soportados DEBEN priorizar Correo Electrónico y WhatsApp Web (`web.whatsapp.com`) como canales principales y oficiales de la notaría, manteniendo soporte de SMS como canal secundario/alternativo cuando el compareciente no disponga de smartphone o correo electrónico.
- **FR-009**: El sistema DEBE ofrecer acceso al historial de notificaciones tanto en el Tablero Central (`/notificaciones`) como mediante un diálogo rápido "Notificaciones Enviadas" accesible directamente desde la barra de acciones de la escritura en `app/pages/escrituras/[id].vue`, permitiendo auditar los avisos del instrumento sin cambiar de contexto.
- **FR-010**: El sistema DEBE permitir al usuario adjuntar archivos locales desde su computadora (PDFs, imágenes, facturas o comprobantes de pago) al redactar o confirmar una notificación, almacenándolos en Supabase Storage en el bucket `expedientes/notificaciones/` y generando su enlace seguro de acceso.
- **FR-011**: Al despachar por WhatsApp, el sistema DEBE invocar prioritariamente el protocolo nativo de la aplicación de escritorio (`whatsapp://send?phone=${telefono}&text=${mensajeCodificado}`) para entornos macOS y Windows, proveyendo fallback inmediato a WhatsApp Web (`https://web.whatsapp.com/send?...` y `https://api.whatsapp.com/send?...`), incluyendo el texto formal, comentarios del gestor y enlace a los archivos adjuntos, registrando automáticamente la notificación en `notificaciones_bitacora`.
- **FR-012**: En las pestañas contextuales de **Órdenes de Pago**, **Honorarios** y **Georreferenciación** de la escritura, cada partida relevante o hito DEBE contar con un botón de acción "Notificar", el cual invoca el modal de redacción con el destinatario compareciente vinculado, su información de contacto (WhatsApp o correo) y la plantilla específica precargada (`ORDEN_PAGO_EMITIDA`, `PAGO_LIQUIDADO`, citatorio para ubicación predial) con sus variables resueltas.
- **FR-013**: El modal de redacción en el Tablero Central (`/notificaciones`) DEBE proveer un campo de búsqueda autocompletada sobre el catálogo de clientes/comparecientes registrados, autocompletando nombre, teléfono celular y correo electrónico, y permitiendo vincular una de sus escrituras activas mediante un selector.


---

## Key Entities

- **`notificaciones_bitacora`**: Registro inmutable de cada mensaje despachado o intentado, con canal, destinatario, contenido, archivos adjuntos (metadatos con nombre, URL y tamaño), estado de entrega, escritura vinculada y timestamps de ciclo de vida.
- **`plantillas_notificaciones`**: Catálogo configurable de plantillas por evento y canal, con asunto, cuerpo de texto con variables interpolables y estatus activo.
- **`notificaciones_eventos_config`**: Mapeo entre eventos del sistema (ej. `tramite.ingresado`, `orden_pago.liquidada`, `honorarios.pago_registrado`, `cita.programada`) y las plantillas predeterminadas.

---

## Assumptions

- En entornos locales o de desarrollo sin credenciales comerciales activas (ej. Twilio, Resend o WhatsApp Business Cloud API), el sistema utilizará un adaptador de despacho simulado con respuesta realista y registro completo en base de datos para no bloquear las pruebas.
- Los comparecientes con teléfono celular registrado en su expediente físico o moral tienen consentimiento implícito para recibir avisos de gestoría notarial conforme a las políticas de privacidad del despacho.
- Las notificaciones son de carácter informativo sobre el estado del trámite y comprobantes de pago; no sustituyen las notificaciones judiciales ni los requerimientos perentorios legales que exijan cédula física notificada en domicilio.

---

## Success Criteria

1. **Visibilidad Total de la Bitácora**: El 100% de las notificaciones despachadas por el sistema quedan registradas en la bitácora de `/notificaciones` con su estatus, destinatario y canal identificables en menos de 2 segundos de búsqueda.
2. **Capacidad de Reenvío en 1 Clic**: Un usuario autorizado puede reenviar un mensaje fallido en menos de 5 segundos sin necesidad de volver a redactar el contenido.
3. **Personalización Segura**: El motor de plantillas sustituye con precisión el 100% de las variables dinámicas del instrumento sin dejar etiquetas sin resolver o errores de sintaxis en el mensaje final.
4. **Cero Regresiones**: La integración del módulo de notificaciones no altera el comportamiento de las 8 pestañas del expediente ni degrada la suite de pruebas unitarias existentes (326 pruebas en verde).
