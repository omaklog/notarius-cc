# Tasks: 07-tramites — Trámites Notariales, Fases Procesales y Dependencias RPP/Catastro

**Feature**: `07-tramites`  
**Input**: [specs/07-tramites/spec.md](spec.md), [specs/07-tramites/plan.md](plan.md), [specs/07-tramites/data-model.md](data-model.md), [specs/07-tramites/contracts/tramites-interface.md](contracts/tramites-interface.md)

---

## Phase 1: Setup & Foundational (Base de Datos, Tipos y Utilerías)

**Purpose**: Creación del esquema relacional, catálogos base, funciones en Postgres, tipos TypeScript y utilería de cálculo de días hábiles.

- [x] T001 [P] Crear tipos e interfaces TypeScript para el módulo en `app/types/tramites.ts`
- [x] T002 [P] Implementar utilería isomórfica de cálculo de días hábiles y semáforo en `app/utils/diasHabiles.ts`
- [x] T003 Crear migración SQL `supabase/migrations/20260802000000_tramites_notariales.sql` con:
  - Tablas `cat_dependencias_oficiales`, `cat_tipos_tramite_notarial`, `tramites_escritura`, `tramite_prevenciones`
  - Seed de las 6 dependencias oficiales autorizadas (NOTARIA, CATASTRO_EST, CATASTRO_MUN, RPP, CONTROL_INT, INFONAVIT) y tipos de trámites
  - Función PL/pgSQL `fn_calcular_dias_habiles` y trigger de fecha límite automática
  - Vista relacional `v_tramites_resumen` con semáforo y días restantes
  - Políticas RLS y permisos correspondientes
- [x] T004 Implementar composable base `app/composables/useTramites.ts` con métodos de carga de catálogos y operaciones reactivas

**Checkpoint**: Esquema y servicios base listos para la implementación de componentes y lógica de negocio.

---

## Phase 2: User Story 1 - Gestión del Ciclo de Vida de Trámites por Escritura (Priority: P1) 🎯 MVP

**Goal**: Permitir al personal notarial dar seguimiento al ciclo de vida de los trámites de una escritura clasificados por fase procesal, capturar folios de volante y gestionar transiciones de estado.

- [x] T005 [P] [US1] Implementar componente visual de fases procesales `app/components/tramites/TramitesTimeline.vue`
- [x] T006 [P] [US1] Implementar modal de captura y edición de trámites `app/components/tramites/TramiteFormModal.vue`
- [x] T007 [US1] Implementar componente canónico de pestaña de trámites `app/components/escrituras/tabs/TramitesTab.vue` con tabla de trámites, badges de estado, generador de plantilla y acciones
- [x] T008 [US1] Reemplazar `PlaceholderTab` por `TramitesTab` en `app/pages/escrituras/[id].vue`
- [x] T009 [US1] Crear pruebas unitarias del ciclo de vida y UI de trámites en `tests/unit/components/tramites/TramitesTab.spec.ts`

**Checkpoint**: P1 (MVP) completado y verificado de forma independiente.

---

## Phase 3: User Story 2 - Control de Dependencias, Plazos y Semáforo de Vencimiento (Priority: P2)

**Goal**: Calcular automáticamente las fechas compromiso de resolución en días hábiles excluyendo fines de semana, desplegar semáforos de plazos (`verde`, `amarillo`, `rojo`) y soportar enlace opcional a órdenes de pago.

- [x] T010 [P] [US2] Extender `app/composables/useTramites.ts` con lógica de cálculo reactivo de semáforos, chips de urgencia y enlace opcional de orden de pago (`orden_pago_id`)
- [x] T011 [US2] Integrar en `app/components/tramites/TramitesTab.vue` los chips de semáforo de plazos, días hábiles restantes e indicador de estado financiero de derechos
- [x] T012 [US2] Crear pruebas unitarias para el cálculo de días hábiles y semáforos en `tests/unit/components/tramites/tramites.spec.ts`

**Checkpoint**: US1 + US2 funcionando con semáforos de plazos automáticos y pruebas pasando.

---

## Phase 4: User Story 3 - Gestión de Prevenciones Registrales y Gate de Protocolización (Priority: P3)

**Goal**: Gestionar suspensiones y observaciones de autoridades registrales con sus plazos legales y garantizar que ninguna escritura con trámites previos pendientes pueda protocolizarse.

- [x] T013 [P] [US3] Actualizar `fn_validar_protocolizacion` en `supabase/migrations/20260802000000_tramites_notariales.sql` con la Sección J (Trámites Previos Requeridos) conforme a la regla de negocio
- [x] T014 [P] [US3] Implementar modal de prevención y subsanación `app/components/tramites/TramitePrevencionModal.vue`
- [x] T015 [US3] Conectar el flujo de prevención y subsanación en `app/components/escrituras/tabs/TramitesTab.vue` y desplegar el banner normativo de bloqueo de protocolización
- [x] T016 [US3] Agregar pruebas de verificación del gate de protocolización y flujo de prevenciones en `tests/unit/components/tramites/tramites.spec.ts`

**Checkpoint**: Prevenciones registrales y gate estricto de protocolización operativos y respaldados por tests.

---

## Phase 5: User Story 4 - Tablero Global Notarial para Gestores y Notario (Priority: P4)

**Goal**: Proveer una vista ejecutiva consolidada en `/tramites` con métricas, filtros combinados y acceso expedito a las gestiones de toda la notaría.

- [x] T017 [P] [US4] Implementar barra de filtros y búsqueda `app/components/tramites/TramitesFiltros.vue`
- [x] T018 [US4] Implementar la página del tablero consolidado `app/pages/tramites/index.vue` con KPIs de estado, tabla con semáforos y accesos directos
- [x] T019 [US4] Crear pruebas unitarias del tablero global en `tests/unit/components/tramites/TramitesDashboard.spec.ts`

**Checkpoint**: Tablero notarial operativo con filtros y navegación bidireccional.

---

## Phase 6: Polish y Verificación Inicial

- [x] T020 Ejecutar suite completa de Vitest (`npm test`) asegurando 100% de tests pasando y cero regresiones sobre los 157 tests base
- [x] T021 Validar escenarios del `quickstart.md`
- [x] T022 Actualizar bitácora y walkthrough con el resumen de cambios e integración del módulo

---

## Phase 7: User Story 5 - Tarjetas por Dependencia con Historial Cronológico y Catálogo Administrable (Priority: P2)

**Goal**: Implementar las Tarjetas por Dependencia de Gobierno a dos columnas con menú filtrado de pasos exclusivos, acordeón inline de historial completo repetible, modal breve de confirmación/notas con enlace a Órdenes de Pago, y botón superior `+ Iniciar Gestión en Dependencia`.

- [x] T023 [US5] Actualizar migración `supabase/migrations/20260804000000_pasos_tramites_y_dependencias.sql`: eliminar restricción `unique(escritura_id, paso_id)` en `tramite_pasos_escritura`, asegurar soporte de bitácora repetible y definir vistas `v_tramite_pasos_historial` y `v_tramite_dependencias_resumen`.
- [x] T024 [P] [US5] Actualizar interfaces en `app/types/tramites.ts` (`PasoTramite`, `HistorialPasoEscritura`, `DependenciaTramiteCard`, `PayloadAgregarPaso`).
- [x] T025 [US5] Actualizar composable `app/composables/useTramites.ts` agregando `cargarTarjetasDependencias`, `cargarHistorialDependencia`, `obtenerPasosPorDependencia`, `agregarPasoHistorial`, e `iniciarGestionDependencia`.
- [x] T026 [P] [US5] Implementar componente modal compacto `app/components/tramites/TramitePasoModal.vue` para confirmación de paso, fecha, folio de volante, notas y enlace opcional a Órdenes de Pago.
- [x] T027 [P] [US5] Implementar componente modal `app/components/tramites/TramiteNuevaDependenciaModal.vue` para seleccionar e incorporar autoridades no activas.
- [x] T028 [US5] Implementar componente `app/components/tramites/TramitesDependenciasCards.vue` con diseño a dos columnas (columna izquierda: nombre de la dependencia y último paso actual; columna derecha: botones de acción para agregar paso e historial completo) y acordeón inline desplegable.
- [x] T029 [US5] Integrar `TramitesDependenciasCards.vue` y el botón superior `+ Iniciar Gestión en Dependencia` dentro de `app/components/escrituras/tabs/TramitesTab.vue`.
- [x] T030 [US5] Actualizar y expandir pruebas unitarias en `tests/unit/components/tramites/TramitesTab.spec.ts` y `tests/unit/components/tramites/tramites.spec.ts` para validar el flujo de tarjetas por dependencia, acordeón inline y bitácora repetible.
- [x] T031 [US5] Ejecutar la suite completa de pruebas Vitest (`npx vitest run`) y verificar que todas las pruebas pasen sin errores ni regresiones.

---

## Dependencies & Execution Order

```
Phase 1..6 (Completadas)
   │
   ▼
Phase 7: US5 - Tarjetas por Dependencia e Historial Repetible
   ├── T023 (Migración SQL de bitácora repetible y vistas)
   ├── T024 (Tipos e interfaces TypeScript)
   ├── T025 (Composable useTramites)
   ├── T026 & T027 (Modales de Paso y Nueva Dependencia [P])
   ├── T028 (Componente TramitesDependenciasCards.vue)
   ├── T029 (Integración en TramitesTab.vue)
   ├── T030 (Pruebas unitarias)
   └── T031 (Verificación completa de suite Vitest)
```
