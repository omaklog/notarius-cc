# Tasks: 12-notificaciones (Sistema Notarial de Notificaciones Multicanal y Avisos a Comparecientes)

**Branch**: `12-notificaciones` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup & Data Foundation

**Purpose**: Estructura de base de datos relacional, catálogos iniciales, almacenamiento y políticas de seguridad RLS

- [X] T001 Crear migración `supabase/migrations/20260813000000_notificaciones.sql` con tablas `plantillas_notificaciones`, `notificaciones_bitacora` (con `archivos_adjuntos jsonb`), índices y políticas RLS con `fn_has_permiso`
- [X] T002 Sembrar en la migración el catálogo de 12 plantillas notariales oficiales (citatorio de firma, requerimiento documental, trámite RPP, Catastro, orden de pago emitida, honorarios liquidados, testimonio listo)

---

## Phase 2: Foundational Layer (Tipos, Utilerías de Interpolación y Backend Nuxt)

**Purpose**: Infraestructura de cálculo, generador de enlaces WhatsApp Web, subida de archivos y endpoints de servidor

- [X] T003 [P] Crear definiciones de tipos e interfaces TypeScript en `app/types/notificaciones.ts` conforme a `contracts/notificaciones-interface.md`
- [X] T004 [P] Implementar utilería de interpolación de variables notariales y generador de URL para WhatsApp Web en `app/utils/interpoladorNotificaciones.ts`
- [X] T005 [P] Crear pruebas unitarias del interpolador en `tests/unit/utils/interpoladorNotificaciones.spec.ts`
- [X] T006 [P] Implementar abstracción de proveedores de mensajería y adaptador simulado en `server/utils/notificaciones/provider.ts`
- [X] T007 [P] Implementar endpoint Nuxt `server/api/notificaciones/enviar.post.ts` con manejo de adjuntos y registro en bitácora
- [X] T008 [P] Crear pruebas unitarias para `enviar.post.ts` en `tests/unit/server/api/notificaciones/enviar.spec.ts`
- [X] T009 [P] Implementar endpoint Nuxt `server/api/notificaciones/reenviar.post.ts`
- [X] T010 [P] Crear pruebas unitarias para `reenviar.post.ts` en `tests/unit/server/api/notificaciones/reenviar.spec.ts`
- [X] T011 Implementar composable reactivo `app/composables/useNotificaciones.ts`
- [X] T012 Crear pruebas unitarias para `useNotificaciones.ts` en `tests/unit/composables/useNotificaciones.spec.ts`

---

## Phase 3: User Story 1 - Centro Centralizado de Notificaciones y Bitácora de Envíos (Priority: P1) 🎯 MVP

**Goal**: Proveer el centro unificado en `/notificaciones` con métricas de entrega, bitácora interactiva por canal (WhatsApp, Correo, SMS), visor de mensajes y reenvío inmediato en 1 clic

**Independent Test**: Navegar a `/notificaciones`, verificar las 4 tarjetas de KPIs, filtrar por canal y estatus, seleccionar un mensaje para verlo en el visor lateral y accionar el botón de reenvío en 1 clic.

### Implementation for User Story 1
- [X] T013 [P] [US1] Crear componente `app/components/notificaciones/NotificacionesKpisBar.vue` (Total Enviados, Tasa Entrega %, WhatsApp, Fallidos)
- [X] T014 [P] [US1] Crear pruebas unitarias para `NotificacionesKpisBar.vue` en `tests/unit/components/notificaciones/NotificacionesKpisBar.spec.ts`
- [X] T015 [P] [US1] Crear tabla interactiva `app/components/notificaciones/NotificacionesTable.vue` con filtros por canal, estatus, búsqueda y botón de reenvío en 1 clic
- [X] T016 [P] [US1] Crear pruebas unitarias para `NotificacionesTable.vue` en `tests/unit/components/notificaciones/NotificacionesTable.spec.ts`
- [X] T017 [P] [US1] Crear drawer visor de detalle `app/components/notificaciones/NotificacionesVisorDrawer.vue` con visualización tipo chat/correo, acuses y enlaces a archivos adjuntos
- [X] T018 [US1] Crear la página central `app/pages/notificaciones/index.vue` conforme a la maqueta Stitch `213b26bc2b654c5298a2c0e91340a29b`
- [X] T019 [US1] Crear prueba unitaria para la página central en `tests/unit/pages/notificaciones/index.spec.ts`

---

## Phase 4: User Story 2 - Despacho Transversal por Eventos, Redacción Directa y WhatsApp Web (Priority: P2)

**Goal**: Permitir la redacción directa de avisos notariales con adjuntos de la computadora, apertura inmediata de WhatsApp Web con texto precargado y consulta contextual del historial en la escritura

**Independent Test**: Abrir el modal de redacción, adjuntar un archivo PDF de ejemplo, seleccionar canal WhatsApp, pulsar "Enviar", verificar que se abre WhatsApp Web con el mensaje pre-llenado y que en la cabecera de la escritura `#48102` el diálogo rápido muestra la notificación registrada.

### Implementation for User Story 2
- [X] T020 [P] [US2] Crear modal `app/components/notificaciones/modal/RedactarNotificacionModal.vue` con selector de compareciente, plantilla, subida de archivos locales y botón de WhatsApp Web
- [X] T021 [P] [US2] Crear pruebas unitarias para `RedactarNotificacionModal.vue` en `tests/unit/components/notificaciones/RedactarNotificacionModal.spec.ts`
- [X] T022 [US2] Crear diálogo contextual `app/components/notificaciones/modal/NotificacionesHistorialDialog.vue` para consulta y redacción rápida desde la escritura
- [X] T023 [US2] Integrar botón de acceso rápido a notificaciones en la barra superior de `app/pages/escrituras/[id].vue`
- [X] T024 [US2] Crear pruebas unitarias para `NotificacionesHistorialDialog.vue` en `tests/unit/components/notificaciones/NotificacionesHistorialDialog.spec.ts`

---

## Phase 5: User Story 3 - Administración de Plantillas Notariales Dinámicas (Priority: P3)

**Goal**: Configurar, personalizar y previsualizar las plantillas de notificación oficiales por evento y canal, definiendo el esquema híbrido (automático vs confirmación previa)

**Independent Test**: Abrir el modal de configuración de plantillas, editar el cuerpo de una plantilla agregando variables `{{...}}`, cambiar el flag de confirmación, guardar y validar que la previsualización refleja los cambios.

### Implementation for User Story 3
- [X] T025 [P] [US3] Crear modal `app/components/notificaciones/modal/ConfigurarPlantillasModal.vue` con editor de plantillas, selector de variables y previsualización en vivo
- [X] T026 [US3] Integrar botón de apertura de `ConfigurarPlantillasModal.vue` en la cabecera de `app/pages/notificaciones/index.vue`
- [X] T027 [US3] Crear prueba unitaria para `ConfigurarPlantillasModal.vue` en `tests/unit/components/notificaciones/ConfigurarPlantillasModal.spec.ts`

---

## Phase 6: Polish & Verification

**Purpose**: Verificación de calidad, pruebas unitarias integrales y garantía de cero regresiones

- [X] T028 Ejecutar la suite completa de pruebas unitarias (`npm test`) y verificar que los 326 tests existentes más los nuevos tests de notificaciones pasen al 100%
- [X] T029 Validar los escenarios del archivo `quickstart.md`

---

## Phase 7: User Story 2 (Incremento Clarificación) - Protocolo WhatsApp Desktop, Acciones Contextuales y Autocompletado de Clientes (Priority: P1)

**Goal**: Soportar invocación directa de WhatsApp Desktop vía protocolo nativo `whatsapp://send` con fallback web en Mac y Windows, integrar botones de acción contextual en las listas de Órdenes de Pago, Honorarios y Georreferenciación pre-llenando la redacción con plantillas resueltas, y proveer autocompletado de comparecientes con selector de sus escrituras activas en el panel central.

**Independent Test**:
1. En `/notificaciones`, redactar una notificación a un compareciente y verificar que al enviar se dispara `whatsapp://send` para abrir la app de escritorio y se ofrece el enlace de WhatsApp Web como respaldo.
2. En la búsqueda de comparecientes del modal, teclear el nombre de un cliente, constatar que autocompleta teléfono y correo, y permite seleccionar una de sus escrituras activas.
3. En la escritura, abrir las pestañas Órdenes de Pago, Honorarios y Georreferenciación; accionar el botón "Notificar" y verificar que abre `RedactarNotificacionModal` con destinatario, contacto y plantilla correspondiente precargada.

### Implementation for User Story 2 (Incremento)
- [X] T030 [P] [US2] Extender `app/types/notificaciones.ts` agregando `whatsapp_native_url` a `ResultadoDespachoNotificacion` y metadatos de compareciente y escrituras activas
- [X] T031 [P] [US2] Implementar generador de protocolo nativo `whatsapp://send` prioritario con fallback web en `app/utils/interpoladorNotificaciones.ts`
- [X] T032 [P] [US2] Actualizar pruebas unitarias en `tests/unit/utils/interpoladorNotificaciones.spec.ts` para cubrir `whatsapp://send` y `whatsapp_web_url`
- [X] T033 [US2] Integrar en `app/components/notificaciones/modal/RedactarNotificacionModal.vue` autocompletado de comparecientes, selector reactivo de sus escrituras activas y disparo con protocolo nativo `whatsapp://`
- [X] T034 [P] [US2] Actualizar pruebas unitarias en `tests/unit/components/notificaciones/RedactarNotificacionModal.spec.ts` para verificar autocompletado y despacho de escritorio
- [X] T035 [US2] Integrar botón de acción contextual "Notificar" en `app/components/escrituras/tabs/OrdenesPagoTab.vue` enlazado a `RedactarNotificacionModal.vue`
- [X] T036 [US2] Integrar botón de acción contextual "Notificar Pago" en `app/components/escrituras/tabs/HonorariosTab.vue` enlazado a `RedactarNotificacionModal.vue`
- [X] T037 [US2] Integrar botón de acción contextual "Citar para Ubicación Predial" en `app/components/escrituras/tabs/GeorreferenciacionTab.vue` enlazado a `RedactarNotificacionModal.vue`
- [X] T038 [P] [US2] Actualizar pruebas unitarias en `tests/unit/components/ordenesPago/OrdenesPagoTab.spec.ts`, `tests/unit/components/honorarios/HonorariosTab.spec.ts` y `tests/unit/components/escrituras/tabs/GeorreferenciacionTab.spec.ts` para validar acciones de notificación
- [X] T039 Ejecutar verificación completa de la suite de pruebas (`npm test`) garantizando 100% éxito sin regresiones

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup & Data)**: Completada [X].
- **Phase 2 (Foundational)**: Completada [X].
- **Phase 3 (User Story 1 - MVP)**: Completada [X].
- **Phase 4 (User Story 2)**: Completada [X].
- **Phase 5 (User Story 3)**: Completada [X].
- **Phase 6 (Polish)**: Completada [X].
- **Phase 7 (Incremento Clarificación)**: Lista para ejecutar. Depende de las bases ya construidas en Phases 1-6.
  - T030, T031, T032 pueden ejecutarse en paralelo [P].
  - T033 depende de T030 y T031.
  - T034 depende de T033.
  - T035, T036, T037 dependen de T033 y pueden ejecutarse de manera desacoplada.
  - T038 depende de T035, T036, T037.
  - T039 es la verificación final global.

---

## Implementation Strategy: MVP First

1. Completar Phase 1 y Phase 2 (Infraestructura, motor de WhatsApp Web, tipos y composable). [COMPLETADO]
2. Completar Phase 3 (Centro de Notificaciones y bitácora interactiva) -> **MVP funcional desplegable**. [COMPLETADO]
3. Incorporar Phase 4 (Redacción con adjuntos locales y diálogo en el hub de la escritura). [COMPLETADO]
4. Incorporar Phase 5 (Gestión de plantillas dinámicas). [COMPLETADO]
5. Ejecutar Phase 6 (Verificación integral previa con 367 tests). [COMPLETADO]
6. Ejecutar Phase 7 (Protocolo nativo WhatsApp Desktop en macOS/Windows, autocompletado de comparecientes en modal y botones de notificación contextual en Órdenes de Pago, Honorarios y Georreferenciación).

