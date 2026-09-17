# Tasks: 06-expedientes (Expedientes Digitales Notariales, Requisitos por Acto y Cotejo Notarial)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización de utilerías y tipos base para el expediente digital notarial.

- [X] T001 Crear definiciones de tipos TypeScript e interfaces del dominio en app/types/expedientes.ts
- [X] T002 [P] Implementar utilería de empaquetado ZIP con manifiesto en app/utils/zipExpediente.ts
- [X] T003 [P] Implementar utilería para generación de carátula notarial y compilación de PDF en app/utils/pdfExpediente.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura de base de datos, catálogos, RLS y servicios que bloquean todas las historias de usuario.

**⚠️ CRITICAL**: No puede comenzar el desarrollo de historias de usuario hasta completar esta fase.

- [X] T004 Crear migración SQL 20260801000000_expedientes_digitales.sql con tablas cat_tipos_documento_notarial, acto_juridico_requisitos_documentales, ampliación de expediente_documentos, expediente_dispensas_documentales, expediente_descargas_log y RLS
- [X] T005 [P] Aplicar migración en base de datos Supabase local y verificar recarga de esquema en supabase/migrations/20260801000000_expedientes_digitales.sql
- [X] T006 [P] Actualizar vista dinámica public.v_expediente_escritura con proyección de cotejo y catálogos en supabase/migrations/20260801000000_expedientes_digitales.sql
- [X] T007 Implementar composable reactivo useExpedientes en app/composables/useExpedientes.ts para consulta de matriz, semáforos, cotejo y auditoría

**Checkpoint**: Base de datos y composables fundamentales listos. La implementación de historias de usuario puede comenzar.

---

## Phase 3: User Story 1 - Catálogo de Requisitos por Acto y Semáforo de Integración Documental (Priority: P1) 🎯 MVP

**Goal**: Presentar la lista de requisitos documentales exigibles según el acto jurídico de la escritura, evaluando el estado de cada documento y calculando el semáforo de integración.

**Independent Test**: Abrir una escritura de Compraventa, verificar que fn_evaluar_requisitos_expediente retorna la lista de requisitos obligatorios vs opcionales y el semáforo visual correcto.

### Tests for User Story 1

- [X] T008 [P] [US1] Pruebas unitarias para evaluación de requisitos y cálculo de semáforo en test/unit/expedientes_requisitos.spec.ts

### Implementation for User Story 1

- [X] T009 [US1] Implementar función RPC public.fn_evaluar_requisitos_expediente en supabase/migrations/20260801000000_expedientes_digitales.sql
- [X] T010 [US1] Implementar componente de resumen y semáforo ExpedienteResumenCard.vue en app/components/expedientes/ExpedienteResumenCard.vue
- [X] T011 [US1] Implementar componente de matriz de requisitos ExpedienteChecklistRequisitos.vue en app/components/expedientes/ExpedienteChecklistRequisitos.vue

**Checkpoint**: User Story 1 funcional de forma independiente como MVP básico.

---

## Phase 4: User Story 2 - Repositorio Documental, Categorización y Visor en Línea (Priority: P2)

**Goal**: Custodia, subida y visualización en línea de documentos PDF e imágenes mediante URLs firmadas seguras en Supabase Storage sin descarga forzada.

**Independent Test**: Subir un archivo PDF al expediente, abrir el visor modal integrado y comprobar la previsualización interactiva con URL firmada temporal.

### Tests for User Story 2

- [X] T012 [P] [US2] Pruebas unitarias para el visor y URLs firmadas de expedientes en test/unit/expedientes_visor.spec.ts

### Implementation for User Story 2

- [X] T013 [US2] Extender useExpedienteDocumentos en app/composables/useExpedienteDocumentos.ts para tipificación de documentos y soporte de visor
- [X] T014 [US2] Implementar componente de visor modal integrado ExpedienteVisorModal.vue en app/components/expedientes/ExpedienteVisorModal.vue
- [X] T015 [US2] Implementar tabla interactiva ExpedienteDocumentosTable.vue con casillas de selección múltiple y badges de origen en app/components/expedientes/ExpedienteDocumentosTable.vue

**Checkpoint**: User Stories 1 y 2 funcionan integradas e independientemente.

---

## Phase 5: User Story 3 - Fe Notarial de Cotejo contra Original Exhibido (Priority: P3)

**Goal**: Certificar con fe pública notarial que un documento digitalizado fue cotejado contra su original físico o copia certificada, estampando sello de usuario y fecha inmutable.

**Independent Test**: Seleccionar un documento, asentar fe de cotejo en modal y verificar que la BD y la interfaz muestran la insignia dorada con el abogado y fecha de cotejo.

### Tests for User Story 3

- [X] T016 [P] [US3] Pruebas unitarias para fe de cotejo notarial en test/unit/expedientes_cotejo.spec.ts

### Implementation for User Story 3

- [X] T017 [US3] Implementar función RPC public.fn_asentar_cotejo_notarial en supabase/migrations/20260801000000_expedientes_digitales.sql
- [X] T018 [US3] Implementar modal de captura de fe de cotejo ExpedienteCotejoModal.vue en app/components/expedientes/ExpedienteCotejoModal.vue

**Checkpoint**: Fe notarial de cotejo completamente operativa y trazable.

---

## Phase 6: User Story 4 - Descarga Selectiva en ZIP, PDF Compilado Único y Gate de Protocolización (Priority: P4)

**Goal**: Descargar documentos seleccionados en ZIP estructurado, compilar PDF único con carátula notarial foliada, registrar eventos de auditoría y validar gate de protocolización con dispensa notarial.

**Independent Test**: Seleccionar documentos para descarga en ZIP, compilar PDF consolidado, verificar evento de auditoría y comprobar bloqueo de protocolización ante faltantes sin dispensa.

### Tests for User Story 4

- [X] T019 [P] [US4] Pruebas unitarias para descarga selectiva, PDF compilado, auditoría, dispensa y gate de protocolización en test/unit/expedientes_descarga_gate.spec.ts

### Implementation for User Story 4

- [X] T020 [US4] Implementar funciones RPC public.fn_registrar_descarga_expediente y public.fn_registrar_dispensa_documental en supabase/migrations/20260801000000_expedientes_digitales.sql
- [X] T021 [US4] Actualizar función public.fn_validar_protocolizacion con la sección I de validación de expediente y cotejo crítico en supabase/migrations/20260801000000_expedientes_digitales.sql
- [X] T022 [US4] Implementar modal de autorización de dispensa notarial ExpedienteDispensaModal.vue en app/components/expedientes/ExpedienteDispensaModal.vue

**Checkpoint**: Ciclo completo de expedientes digitales, auditoría de descargas y gate de protocolización funcional.

---

## Phase 7: Integración y Pestaña Canónica Notaría 42

**Purpose**: Ensamblaje integral de la pestaña de Expediente en la interfaz de la escritura siguiendo el diseño canónico de Stitch.

- [X] T023 Reemplazar y renovar completamente app/components/escrituras/tabs/ExpedienteTab.vue integrando ExpedienteResumenCard, ExpedienteChecklistRequisitos, ExpedienteDocumentosTable, ExpedienteVisorModal, ExpedienteCotejoModal y ExpedienteDispensaModal conforme al diseño Stitch Screen ID 1346003097bb4754b378618af37aff59

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificación de calidad, pruebas integrales y cero regresiones.

- [X] T024 [P] Consolidar suite de pruebas unitarias integradas en test/unit/expedientes.spec.ts cubriendo todos los flujos de expedientes
- [X] T025 Ejecutar suite completa de Vitest para garantizar 100% de tests pasando sin regresiones
- [X] T026 Ejecutar validación end-to-end de escenarios descritos en specs/06-expedientes/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias previas - inicia de inmediato.
- **Foundational (Phase 2)**: Depende de Phase 1 - BLOQUEA todas las historias de usuario.
- **User Stories (Phase 3+)**: Dependen de Phase 2 completada:
  - User Story 1 (P1): Requisitos y semáforo (MVP).
  - User Story 2 (P2): Repositorio y visor interactivo.
  - User Story 3 (P3): Fe notarial de cotejo.
  - User Story 4 (P4): Descargas, compilación, auditoría y gate de protocolización.
- **Integración (Phase 7)**: Depende de las 4 historias de usuario.
- **Polish (Phase 8)**: Depende de la integración completada.

### Parallel Opportunities

- T002 y T003 pueden desarrollarse en paralelo con T001.
- T005 y T006 pueden desarrollarse en paralelo tras T004.
- Los tests unitarios iniciales marcados con [P] (T008, T012, T016, T019) pueden escribirse en paralelo para TDD.
