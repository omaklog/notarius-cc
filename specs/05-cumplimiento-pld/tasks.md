# Tasks: 05-cumplimiento-pld (Cumplimiento PLD / UIF y Fiscalización Notarial)

**Input**: Design documents from `/specs/05-cumplimiento-pld/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/
**Tests**: Incluye pruebas unitarias con Vitest y Vue Test Utils para composables, stores y componentes visuales.
**Organization**: Tareas agrupadas por fases y por User Story (US1 a US4) para posibilitar implementación independiente y pruebas modulares.

---

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Ejecutable en paralelo (archivos independientes, sin dependencias bloqueantes)
- **[Story]**: Historia de usuario a la que pertenece ([US1], [US2], [US3], [US4])

---

## Phase 1: Setup (Infraestructura y Contratos)

**Purpose**: Definir los contratos e interfaces TypeScript y aprovisionar el bucket seguro en Supabase Storage.

- [X] T001 Definir contratos de tipos e interfaces PLD en `app/types/pld.ts`
- [X] T002 [P] Configurar el bucket privado `pld-evidencias` con políticas RLS de acceso en `supabase/migrations/20260730000000_cumplimiento_pld.sql`

---

## Phase 2: Foundational (Esquema de Base de Datos y Base Reactiva)

**Purpose**: Crear el esquema relacional en Postgres, catálogo de listas y lógica reactiva base antes de implementar historias de usuario.

**⚠️ CRITICAL**: Ninguna historia de usuario puede avanzar hasta que esta fase esté completada y aplicada en la base de datos.

- [X] T003 Crear migración relacional `supabase/migrations/20260730000000_cumplimiento_pld.sql` con tablas `pld_listas_catalogo` (con seeders LPB, OFAC, ONU, SAT 69-B), `pld_consultas`, `pld_evaluaciones_escritura`, `pld_pep_diligencias`, ampliación de columnas en `actos_juridicos` y políticas RLS
- [X] T004 [P] Implementar composable reactivo `app/composables/usePldCalculations.ts` para cálculo UMA, topes de efectivo (Art. 32 LFPIORPI) y calificación de aviso SAT
- [X] T005 [P] Crear prueba unitaria para composable en `tests/unit/composables/usePldCalculations.spec.ts`
- [X] T006 Implementar Pinia Store `app/stores/pld.ts` con carga de catálogos, estado de consultas, subida de capturas a storage y cálculo reactivo
- [X] T007 [P] Crear prueba unitaria para Pinia Store en `tests/unit/stores/pld.spec.ts`

**Checkpoint**: Base de datos y estado reactivo listos. La implementación de historias de usuario puede comenzar.

---

## Phase 3: User Story 1 - Screening y Cotejo de Comparecientes contra Listas Negras (Priority: P1) 🎯 MVP

**Goal**: Cotejar cada otorgante contra las 4 listas oficiales (LPB, OFAC, ONU, SAT 69-B), adjuntar evidencias obligatorias con sellado de tiempo de 10 años, documentar homonimias con prueba oficial y permitir importación asistida (< 90 días).

**Independent Test**: Vincular compareciente a escritura, abrir modal de cotejo, capturar dictámenes con screenshot para las 4 listas, marcar limpio y comprobar estatus "Verificado". Validar que falso positivo exige documento de contraste y probar reutilización asistida de screening vigente.

- [X] T008 [P] [US1] Implementar funciones SQL `public.fn_obtener_screening_vigente` y `public.fn_importar_screening_pld` en `supabase/migrations/20260730000000_cumplimiento_pld.sql`
- [X] T009 [P] [US1] Implementar componente `app/components/pld/PldScreeningModal.vue` con checklist de 4 listas oficiales, enlaces directos a portales (`↗`), selectores normativos, carga de capturas de pantalla y banner de importación asistida
- [X] T010 [P] [US1] Crear prueba unitaria para modal de screening en `tests/unit/components/pld/PldScreeningModal.spec.ts`
- [X] T011 [US1] Integrar subida de comprobantes a Storage con cálculo de hash SHA-256 e inserción transaccional en `app/stores/pld.ts`
- [X] T012 [P] [US1] Implementar componente `app/components/pld/PldComparecientesTable.vue` con visualización notarial de otorgantes, RFC monoespaciado, semáforos de listas, acreditación de Beneficiario Controlador y botones de acción
- [X] T013 [P] [US1] Crear prueba unitaria para tabla de comparecientes en `tests/unit/components/pld/PldComparecientesTable.spec.ts`

**Checkpoint**: User Story 1 (MVP) completamente funcional e independientemente verificable.

---

## Phase 4: User Story 2 - Evaluación de Umbrales en UMA y Control de Efectivo Art. 32 (Priority: P2)

**Goal**: Calcular en tiempo real la UMA histórica según fecha de celebración del acto, determinar obligaciones de identificación y aviso mensual SAT, y fiscalizar el tope legal de efectivo con bloqueo estricto por exceso.

**Independent Test**: Capturar monto de operación y fecha en una compraventa; comprobar que calcula veces UMA históricas, emite advertencia de aviso ordinario SAT si supera 16,050 UMA y activa alerta roja si el monto en efectivo excede 8,025 UMA.

- [X] T014 [P] [US2] Implementar función SQL `public.fn_evaluar_pld_escritura(p_escritura_id uuid)` en `supabase/migrations/20260730000000_cumplimiento_pld.sql` para cálculo de UMA histórica, avisos y control de efectivo
- [X] T015 [P] [US2] Implementar componente `app/components/pld/PldUmbralesCard.vue` con grid de 3 tarjetas: Cálculo Económico UMA, Dictamen de Avisos SAT y Control de Límite de Efectivo Art. 32
- [X] T016 [P] [US2] Crear prueba unitaria para `PldUmbralesCard.vue` en `tests/unit/components/pld/PldUmbralesCard.spec.ts`
- [X] T017 [US2] Integrar recálculo reactivo y persistencia de evaluaciones en `app/stores/pld.ts`

**Checkpoint**: Historias de Usuario 1 y 2 integradas y operando conjuntamente.

---

## Phase 5: User Story 3 - Tratamiento de PEPs y Debida Diligencia Reforzada (Priority: P3)

**Goal**: Gestionar comparecientes con condición PEP (directo o asimilado), capturar cuestionario de procedencia de fondos y autorizar la excepción mediante modal con validación estricta de permisos RBAC (`notario_titular` o `administrador`).

**Independent Test**: Marcar compareciente como PEP, verificar que solicita procedencia de fondos y no permite autorizar la excepción a auxiliares; iniciar sesión como Notario Titular y aprobar la debida diligencia comprobando la liberación del bloqueo.

- [X] T018 [P] [US3] Implementar función SQL `public.fn_aprobar_diligencia_pep(p_diligencia_id uuid, p_notas text)` en `supabase/migrations/20260730000000_cumplimiento_pld.sql` con validación de rol RBAC
- [X] T019 [P] [US3] Implementar componente `app/components/pld/PldPepApprovalModal.vue` para captura de procedencia de fondos y aprobación por Notario Titular
- [X] T020 [P] [US3] Crear prueba unitaria para `PldPepApprovalModal.vue` en `tests/unit/components/pld/PldPepApprovalModal.spec.ts`
- [X] T021 [US3] Integrar flujo de diligencia PEP en `app/stores/pld.ts` y tabla de otorgantes

**Checkpoint**: Historias 1, 2 y 3 operando de forma integral.

---

## Phase 6: User Story 4 - Gate de Protocolización Definitivo y Pestaña Notarial `PldTab.vue` (Priority: P4)

**Goal**: Reemplazar definitivamente el stub en `fn_validar_protocolizacion`, integrar la pestaña `PldTab.vue` en el detalle de la escritura y enlazar el semáforo global con la habilitación del botón Protocolizar.

**Independent Test**: Abrir la pestaña Cumplimiento PLD en `/escrituras/:id`, validar que el semáforo global refleja el estado del instrumento. Comprobar que cualquier compareciente pendiente/bloqueado o exceso de efectivo bloquea el botón Protocolizar; verificar que al tener 100% de cumplimiento el botón se habilita con sello verde notarial.

- [X] T022 [US4] Reemplazar el stub en `public.fn_validar_protocolizacion(p_escritura_id uuid)` en `supabase/migrations/20260730000000_cumplimiento_pld.sql` con la verificación definitiva de screening, PEPs, límites de efectivo y Beneficiario Controlador
- [X] T023 [P] [US4] Implementar componente `app/components/pld/PldSemaforoBanner.vue` con visualización institucional del estatus global de la escritura
- [X] T024 [US4] Implementar componente de pestaña `app/components/escrituras/tabs/PldTab.vue` ensamblando semáforo, tarjetas de umbrales, tabla notarial y modales
- [X] T025 [P] [US4] Crear prueba unitaria para `PldTab.vue` en `tests/unit/components/escrituras/tabs/PldTab.spec.ts`
- [X] T026 [US4] Vincular el refresco reactivo de la pestaña PLD con el botón Protocolizar en `app/pages/escrituras/[id].vue`

**Checkpoint**: Todas las historias de usuario implementadas y conectadas al ciclo de vida del instrumento notarial.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificación integral, aseguramiento de calidad y ejecución de tests.

- [X] T027 Aplicar migración `supabase/migrations/20260730000000_cumplimiento_pld.sql` y verificar permisos RLS en Supabase local
- [X] T028 [P] Ejecutar la suite completa de pruebas unitarias Vitest (`npm run test:unit`) asegurando 100% de tests pasando
- [X] T029 Ejecutar verificación de los 7 escenarios de `specs/05-cumplimiento-pld/quickstart.md`
