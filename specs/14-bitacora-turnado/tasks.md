# Tasks: 14-bitacora-turnado (Bitácora de Turnado y Cadena de Custodia: Redactor ↔ Gestor)

**Input**: Design artifacts from `specs/14-bitacora-turnado/` (`spec.md`, `plan.md`, `data-model.md`, `research.md`, `contracts/`, `quickstart.md`)  
**Prerequisites**: Entidades base del sistema (`escrituras`, `profiles`, `tramites_escritura`, `cat_dependencias_oficiales`) de especificaciones previas.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tipos TypeScript base y configuración de permisos de turnado y custodia.

- [X] T001 [P] Crear archivo de tipos `app/types/turnado.ts` con los modelos TypeScript (`TurnadoEventoItem`, `TurnadoTipoEvento`, `TurnadoRolCustodio`, `TurnarTramitePayload`, `CustodiaActualResumen`)
- [X] T002 [P] Verificar y asegurar los permisos requeridos para turnado (`tramites:turnar`, `tramites:editar`) en `app/composables/useNavItems.ts` y contratos de seguridad

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de base de datos PostgreSQL, función almacenada atómica y composable central de turnado.

**⚠️ CRITICAL**: Ninguna interfaz de usuario de turnado puede operar hasta completar esta fase.

- [X] T003 Crear migración PostgreSQL `supabase/migrations/20260814000000_bitacora_turnado.sql` con las columnas de custodia en `public.tramites_escritura`, la tabla inmutable `public.bitacora_turnado_tramites`, la función almacenada `public.fn_registrar_turnado` y políticas RLS
- [X] T004 Implementar composable `app/composables/useTurnadoTramites.ts` con estado reactivo, consultas a Supabase y ejecución de la función RPC de turnado
- [X] T005 [P] Crear pruebas unitarias del composable en `tests/unit/composables/useTurnadoTramites.spec.ts` validando llamadas RPC, cálculo de horas y manejo de errores

**Checkpoint**: Base de datos, tipos y composable listos para conectar componentes visuales.

---

## Phase 3: User Story 1 - Turnado Formal y Asignación de Custodia Operativa (Priority: P1) 🎯 MVP

**Goal**: Permitir al Abogado Redactor turnar formalmente un trámite al Gestor Notarial con instrucciones, documentos de soporte y sello de tiempo, transfiriendo de inmediato la custodia operativa al Gestor.

**Independent Test**: En la pestaña de trámites de una escritura, accionar "Turnar a Gestor" en un trámite, seleccionar al gestor destinatario e instrucciones; constatar que el semáforo cambia a *"En manos del Gestor: [Nombre]"* y que el evento se asienta en la base de datos.

### Implementation for User Story 1
- [X] T006 [P] [US1] Construir el componente semáforo `app/components/tramites/CustodiaTramiteBadge.vue` con diseño Stitch Notarial (`#1B3A5F`, `#B45309`, `#2F6F4E`), avatar de custodio y tiempo transcurrido
- [X] T007 [P] [US1] Construir el componente modal `app/components/tramites/TurnadoTramiteModal.vue` para captura de destinatario, selección de gestor, instrucciones y confirmación de turnado
- [X] T008 [US1] Integrar `CustodiaTramiteBadge.vue` y el botón de acción "Turnar a Gestor" en la tabla/cards de `app/components/escrituras/tabs/TramitesTab.vue` sin alterar contratos preexistentes
- [X] T009 [P] [US1] Crear pruebas unitarias para `CustodiaTramiteBadge.vue` y `TurnadoTramiteModal.vue` en `tests/unit/components/tramites/turnado/`

**Checkpoint**: MVP funcional desplegable: Turnado formal de trámites Redactor → Gestor operativo y testeado.

---

## Phase 4: User Story 2 - Devolución por Solventación (Prevención / Observación) y Re-turnado (Priority: P2)

**Goal**: Permitir al Gestor Notarial devolver formalmente un trámite al Abogado Redactor cuando una dependencia emite una prevención o requerimiento, transfiriendo la responsabilidad al Redactor como trámite detenido, y permitir al Redactor re-turnar al Gestor tras subsanar la observación.

**Independent Test**: En un trámite en custodia del Gestor, presionar "Devolver al Redactor por Solventación", capturar motivo obligatorio y fecha límite; verificar que el semáforo cambia a *"Detenido por Solventación — En manos del Redactor: [Nombre]"*. Luego, como redactor, pulsar "Solventar y Re-turnar" comprobando que la custodia regresa al gestor.

### Implementation for User Story 2
- [X] T010 [US2] Extender `TurnadoTramiteModal.vue` con la acción "Devolver al Redactor por Solventación" exigiendo motivo detallado de prevención, oficio y fecha límite legal
- [X] T011 [US2] Extender `TurnadoTramiteModal.vue` con la acción "Solventar y Re-turnar al Gestor" permitiendo capturar notas de subsanación y documentos adjuntos
- [X] T012 [US2] Conectar los flujos de devolución por prevención y solventación en `app/components/escrituras/tabs/TramitesTab.vue`
- [X] T013 [P] [US2] Crear pruebas unitarias para el flujo de devolución por prevención y solventación en `tests/unit/components/tramites/turnado/TurnadoSolventacion.spec.ts`

**Checkpoint**: Ciclo completo de devoluciones por prevención y solventación integrado y validado.

---

## Phase 5: User Story 3 - Conclusión Parcial de Trámite y Entrega al Redactor (Priority: P3)

**Goal**: Permitir al Gestor Notarial asentar la salida favorable de un trámite concluido y devolver formalmente el expediente y documentos obtenidos al Redactor para continuar la integración o firma de la escritura.

**Independent Test**: Al concluir un trámite en dependencia, el Gestor captura los datos de salida y presiona "Entregar Trámite Concluido al Redactor". Constatar que el trámite se marca como concluido favorablemente y la custodia regresa al Redactor.

### Implementation for User Story 3
- [X] T014 [US3] Extender `TurnadoTramiteModal.vue` con la acción "Entregar Trámite Concluido al Redactor" y captura de observaciones de salida
- [X] T015 [US3] Conectar la acción de entrega concluida en `app/components/escrituras/tabs/TramitesTab.vue`
- [X] T016 [P] [US3] Crear pruebas unitarias para entrega de trámite concluido en `tests/unit/components/tramites/turnado/TurnadoConcluido.spec.ts`

**Checkpoint**: Flujo de conclusión y entrega formal al redactor 100% operativo.

---

## Phase 6: User Story 4 - Bitácora Histórica, Timeline y Filtros en `/tramites` (Priority: P4)

**Goal**: Proveer una línea de tiempo (timeline) cronológica e inalterable de todos los movimientos de turnado con cálculo de horas y días hábiles en cada mano, más filtros de custodia activa en el catálogo global de trámites.

**Independent Test**: Hacer clic en "Ver Bitácora de Turnado" en cualquier trámite y constatar el timeline con emisor, receptor, motivo y duración en cada etapa. Navegar a `/tramites` y aplicar el filtro de "Custodia Actual" (*En manos del Gestor*, *En manos del Redactor*, *Concluidos*).

### Implementation for User Story 4
- [X] T017 [P] [US4] Construir componente `app/components/tramites/BitacoraTurnadoTimeline.vue` con visualización Stitch cronológica de movimientos, avatares, motivos y horas en custodia
- [X] T018 [P] [US4] Construir drawer lateral `app/components/tramites/BitacoraTurnadoDrawer.vue` para inspección rápida del historial de turnado sin abandonar la pantalla actual
- [X] T019 [US4] Integrar botón de acceso "Ver Bitácora de Custodia" en `app/components/escrituras/tabs/TramitesTab.vue` enlazado a `BitacoraTurnadoDrawer.vue`
- [X] T020 [US4] Integrar filtro rápido de *"Custodia Actual"* (`Todos`, `En manos del Gestor`, `En manos del Redactor / Solventación`, `Concluidos`) y buscador por custodio en `app/pages/tramites/index.vue`
- [X] T021 [P] [US4] Crear pruebas unitarias para `BitacoraTurnadoTimeline.vue` y `BitacoraTurnadoDrawer.vue` en `tests/unit/components/tramites/turnado/BitacoraTimeline.spec.ts`

**Checkpoint**: Bitácora histórica, timeline y auditoría global plenamente integrados.

---

## Phase 7: Polish, Verificación Integral y Cero Regresiones

**Purpose**: Validación end-to-end de escenarios y ejecución de la suite completa de pruebas.

- [X] T022 [P] Validar paso a paso todos los escenarios del archivo `specs/14-bitacora-turnado/quickstart.md`
- [X] T023 Ejecutar la suite global de pruebas unitarias (`npm test`) verificando que los 404 tests previos más las nuevas pruebas de turnado pasen al 100% sin ninguna regresión

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: Sin dependencias, arranca de inmediato.
- **Phase 2 (Foundational)**: Depende de Phase 1; bloquea todas las User Stories.
- **Phase 3 (User Story 1 - MVP)**: Depende de Phase 2.
- **Phase 4 (User Story 2)**: Depende de Phase 3; extiende modales y flujos de prevención.
- **Phase 5 (User Story 3)**: Depende de Phase 3; añade conclusión y entrega.
- **Phase 6 (User Story 4)**: Depende de Phase 2 y Phase 3; visualiza la bitácora y agrega filtros globales.
- **Phase 7 (Polish & Tests)**: Depende de todas las fases anteriores.

### Parallel Opportunities
- T001 y T002 en Phase 1 son paralelizables [P].
- T006, T007 y T009 en Phase 3 pueden desarrollarse en paralelo [P].
- T017, T018 y T021 en Phase 6 son paralelizables [P].
- T022 y T023 en Phase 7 son paralelizables [P].

---

## Implementation Strategy: MVP First

1. **Paso 1**: Completar Phase 1 y Phase 2 (Migración PostgreSQL con función atómica, tipos y composable).
2. **Paso 2**: Completar Phase 3 (Semáforo de custodia, modal de turnado inicial e integración en `TramitesTab.vue`) → **MVP funcional entregable**.
3. **Paso 3**: Completar Phase 4 (Devolución por prevención y solventación).
4. **Paso 4**: Completar Phase 5 (Conclusión y entrega formal).
5. **Paso 5**: Completar Phase 6 (Timeline cronológico y filtros en `/tramites`).
6. **Paso 6**: Ejecutar Phase 7 (Verificación global con 404+ tests en verde).
