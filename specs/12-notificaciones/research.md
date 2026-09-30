# Research: 12-notificaciones (Sistema Notarial de Notificaciones Multicanal y Avisos a Comparecientes)

## Decision 1: Abstracción de Proveedores, Enlace Nativo a WhatsApp Desktop/Web y Archivos Adjuntos
- **Decision**: Diseñar el motor de despacho mediante el patrón Strategy/Adapter en el backend/server de Nuxt (`server/utils/notificaciones/`) con soporte específico para WhatsApp Desktop nativo, WhatsApp Web y adjuntos:
  - **Canal WhatsApp**: Generación e invocación prioritaria del protocolo nativo `whatsapp://send?phone=${telefono}&text=${mensajeCodificado}` para entornos macOS y Windows. En macOS, abrir simplemente `https://web.whatsapp.com` no despierta la aplicación instalada en el sistema operativo; al disparar el protocolo `whatsapp://`, el sistema operativo transfiere el foco directamente a la aplicación nativa instalada de WhatsApp Desktop. Se provee un botón y enlace de fallback inmediato a WhatsApp Web (`https://web.whatsapp.com/send?phone=...&text=...` y `https://api.whatsapp.com/send?...`) en caso de que el usuario prefiera trabajar en pestaña del navegador o no tenga la app instalada. Al despachar, el sistema precarga el mensaje formal con enlace a los archivos adjuntos y registra automáticamente el evento en `notificaciones_bitacora`.
  - **Archivos Adjuntos**: Soporte para que el usuario adjunte archivos locales desde su computadora (PDFs, imágenes, comprobantes de pago, etc.). Los archivos se cargan al bucket `expedientes/notificaciones/` en Supabase Storage y su URL de descarga segura se anexa al mensaje, permitiendo además al gestor arrastrar el archivo o compartir el enlace directo en el chat.
  - **Correo y SMS**: Envío mediante adaptador simulado en pruebas/desarrollo y conectores preparados para Resend y Twilio en producción.
- **Rationale**: WhatsApp Desktop/Web es la herramienta operativa estándar en las notarías mexicanas, eliminando costos recurrentes por mensaje de Meta API y autorizaciones de plantillas complejas, al tiempo que permite adjuntar archivos directamente y mantener un registro de auditoría legal centralizado en Supabase.
- **Alternatives considered**:
  - Solo URL web.whatsapp.com: Descartado porque no abre la app de escritorio en macOS/Windows cuando el usuario ya la tiene instalada.
  - API Cloud de WhatsApp Business de pago con plantillas rígidas: Descartado por costos y restricción de ventanas de 24 horas.
  - Solo enlaces de texto sin adjuntos: Descartado porque las notarías constantemente envían carátulas, órdenes de pago y acuses.

## Decision 2: Modelo de Datos para Plantillas y Bitácora Inmutable
- **Decision**: Crear dos tablas relacionales en Supabase:
  1. `public.plantillas_notificaciones`: Código único, nombre, canal predeterminado (`correo`, `whatsapp`, `sms`), asunto, cuerpo con variables mustache `{{...}}`, evento disparador opcional, flag `requiere_confirmacion` (esquema híbrido) y `activo`.
  2. `public.notificaciones_bitacora`: Registro inmutable por mensaje con `escritura_id` (opcional), `compareciente_id` (opcional), `canal`, `destinatario_nombre`, `destinatario_contacto`, `asunto`, `cuerpo_renderizado`, `estatus` (`pendiente`, `enviado`, `entregado`, `leido`, `fallido`), `error_detalle`, `metadata` (JSONB para IDs de mensaje externo, timestamps de acuse), `creado_por` y timestamps.
- **Rationale**: Garantiza auditoría notarial completa de qué se notificó a cada compareciente, en qué fecha y hora, y qué respuesta técnica devolvió la plataforma de entrega.
- **Alternatives considered**:
  - Almacenar los mensajes como texto libre no estructurado en una bitácora general: Descartado por dificultar la trazabilidad, reenvío y métricas de entrega.

## Decision 3: Motor Seguro de Interpolación de Variables Notariales
- **Decision**: Implementar una utilería de renderizado `renderizarPlantillaNotarial(cuerpo, variables)` que sustituya de forma segura tokens predefinidos:
  - `{{nombre_cliente}}`: Nombre formal del compareciente.
  - `{{numero_instrumento}}`: Número oficial de la escritura.
  - `{{acto}}`: Tipo de acto jurídico (ej. Compraventa, Donación).
  - `{{dependencia}}`: Dependencia de trámite (ej. RPP, Catastro Estatal).
  - `{{folio_tramite}}`: Folio de volante o boleta registral.
  - `{{monto}}`: Importe formateado en moneda MXN.
  - `{{fecha_cita}}`: Fecha y hora legible de la firma en notaría.
  - `{{notaria}}`: Nombre institucional del despacho (ej. Notaría Pública No. 42).
- **Rationale**: Previene riesgos de inyección de plantillas y garantiza que los mensajes generados siempre tengan un tono solemne y formal acorde a la fe pública notarial.
- **Alternatives considered**:
  - Motores de plantillas complejos (Handlebars, EJS): Sobrecomplejidad innecesaria para textos notariales que solo requieren sustitución paramétrica de valores.

## Decision 4: Experiencia de Usuario y Navegación (Diseño Stitch `213b26bc2b654c5298a2c0e91340a29b`)
- **Decision**: Desarrollar la vista global en `app/pages/notificaciones/index.vue` y un componente modal `app/components/notificaciones/modal/NotificacionesHistorialDialog.vue` para consulta contextual desde `escrituras/[id].vue`.
  - Tarjetas de KPIs: Total Enviados (mes), Tasa de Entrega (%), Canal WhatsApp, Fallidos / Por Reintentar.
  - Tabla interactiva con filtros por estado, canal, búsqueda textual y rango de fecha.
  - Visor lateral de mensaje con previsualización fidedigna (tipo burbuja de WhatsApp o correo formal).
  - Botón de reenvío en 1 clic.
  - Modal para redactar aviso manual con selector de destinatario y plantilla.
  - Modal/vista de gestión de plantillas.
- **Rationale**: Respeta la elección de diseño del usuario (Opción A) y la maqueta generada con Stitch cumpliendo con los lineamientos de la Constitución Notarial (§8).
- **Alternatives considered**:
  - Forzar una pestaña adicional fija en `escrituras/[id].vue`: Descartado para no recodificar ni romper la estabilidad de las 8 pestañas existentes.

## Decision 5: Permisos y Seguridad Row Level Security (RLS)
- **Decision**: Utilizar los permisos existentes en `public.permisos`:
  - `notificaciones.ver`: Lectura de la bitácora y plantillas.
  - `notificaciones.reenviar`: Ejecución de reintentos y despacho de avisos manuales.
  - `notificaciones.configurar_plantillas`: Edición del catálogo de plantillas.
  Políticas RLS en Postgres con `fn_has_permiso`.
- **Rationale**: Integración nativa con el sistema de roles RBAC ya implementado en la plataforma.

## Decision 6: Acciones Contextuales en Pestañas (Órdenes de Pago, Honorarios y Georreferenciación)
- **Decision**: Incorporar un botón de acción "Notificar" en las listas operativas de:
  1. `app/components/escrituras/tabs/OrdenesPagoTab.vue`: Permite notificar la emisión de una orden o su liquidación mediante las plantillas `ORDEN_PAGO_EMITIDA` o `PAGO_LIQUIDADO`, resolviendo automáticamente el folio de orden, dependencia y monto.
  2. `app/components/escrituras/tabs/HonorariosTab.vue` / `HonorariosPagosTable.vue`: Permite notificar cobro o acuse de liquidación de honorarios notariales mediante `PAGO_LIQUIDADO_WHATSAPP` o `HONORARIOS_COBRO`.
  3. `app/components/escrituras/tabs/GeorreferenciacionTab.vue`: Permite notificar al compareciente un citatorio o aviso para acudir a la notaría a ubicar físicamente el predio o verificar linderos/colindancias.
  - En todos los casos, el botón invoca `RedactarNotificacionModal.vue` pasando `escrituraId`, `comparecienteId`, `destinatarioContacto`, `plantillaCodigo` y variables precalculadas, sin modificar la lógica interna ni los estados contables/catastrales de las pestañas (§3 Constitución).
- **Rationale**: Ahorra tiempo operativo al gestor y evita errores manuales de captura al pre-llenar automáticamente los importes, folios y datos de contacto del compareciente de la escritura.
- **Alternatives considered**:
  - Enviar directamente sin confirmación: Descartado porque el gestor frecuentemente necesita agregar instrucciones adicionales o adjuntar recibos bancarios/croquis locales.

## Decision 7: Búsqueda y Autocompletado de Clientes/Comparecientes en el Tablero Central
- **Decision**: En `RedactarNotificacionModal.vue`, cuando no se proporciona una escritura fija (invocación desde `/notificaciones`), el formulario presenta un campo `v-autocomplete` conectado a la tabla `comparecientes`.
  - Al seleccionar un compareciente, el modal autocompleta su nombre, teléfono celular (o WhatsApp) y correo electrónico.
  - Adicionalmente, consulta dinámicamente las escrituras activas vinculadas a dicho compareciente (mediante `escritura_comparecientes` join `escrituras`) y despliega un selector secundario para que el gestor pueda asociar el instrumento en 1 clic si el aviso corresponde a un expediente específico.
- **Rationale**: Brinda máxima flexibilidad al despachar notificaciones generales o institucionales desde el panel central sin obligar al usuario a recordar folios o escribir manualmente números de teléfono.

