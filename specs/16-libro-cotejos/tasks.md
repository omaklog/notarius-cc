# Tasks: 16-libro-cotejos (Libro de Cotejos y Certificaciones Fuera de Protocolo)

**Input**: Design artifacts from `specs/16-libro-cotejos/` (`spec.md`, `plan.md`, `data-model.md`, `research.md`, `contracts/`, `quickstart.md`)  
**Prerequisites**: Módulo de Identidad Notarial (`useConfiguracionNotarial.ts`) y esquema base de usuarios/permisos.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Definición de tipos TypeScript, contratos e integración en la estructura de navegación del sistema.

- [x] T001 [P] Crear interfaces y DTOs TypeScript para libros, actas, filtros y métricas en `app/types/cotejos.ts`
- [x] T002 [P] Configurar el acceso al módulo "Libro de Cotejos" en la ruta `/cotejos` con icono `mdi-book-check-outline` y permiso `cotejos:ver` en `app/composables/useNavItems.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema PostgreSQL, procedimiento atómico de folios por libro, bucket de Supabase Storage y composable central.

**⚠️ CRITICAL**: Ninguna interfaz de usuario puede operar hasta completar esta fase.

- [x] T003 Crear migración PostgreSQL `supabase/migrations/20260816000000_libro_cotejos.sql` con las tablas `public.libros_cotejo` y `public.actas_cotejo`, el procedimiento atómico `fn_registrar_acta_cotejo` con bloqueo `FOR UPDATE`, el bucket `cotejos-documentos` en Supabase Storage, políticas RLS y registro de permisos en `public.permisos`
- [x] T004 Implementar el composable reactivo `app/composables/useCotejos.ts` con gestión de libros, actas, métricas computadas, llamadas RPC a `fn_registrar_acta_cotejo`, cancelación de actas, apertura/cierre de libros, subida de documentos y generación de fórmulas legales notariales
- [x] T005 [P] Crear pruebas unitarias del composable en `tests/unit/composables/useCotejos.spec.ts` validando carga de libros, registro atómico, cálculo de métricas y generación de fórmulas notariales

**Checkpoint**: Base de datos, storage y lógica de negocio listos para conectar las vistas del módulo.

---

## Phase 3: User Story 1 - Registro y Autorización Consecutiva de Actas de Cotejo (Priority: P1) 🎯 MVP

**Goal**: Permitir a los auxiliares y notarios registrar y autorizar actas de cotejo con numeración consecutiva atómica por libro, capturando solicitante, documento exhibido, fojas y tantos.

**Independent Test**: Navegar a `/cotejos`, hacer clic en "+ Nuevo Cotejo", capturar los datos requeridos, guardar y constatar que se asienta con el número de acta correlativo exacto en el libro activo y estatus `autorizado`.

### Implementation for User Story 1

- [x] T006 [US1] Construir el modal de captura ágil `app/components/cotejos/CotejoRegistroModal.vue` con validación Yup/VeeValidate para solicitante, documento original exhibido, fojas y tantos
- [x] T007 [US1] Construir la página principal `app/pages/cotejos/index.vue` con diseño Stitch Notarial (`#1B3A5F`, `#A9762E`), tarjeta del libro activo con barra de progreso, tarjetas de métricas (KPIs) y tabla de actas de cotejo
- [x] T008 [P] [US1] Crear pruebas unitarias de la vista principal y registro en `tests/unit/pages/cotejos/index.spec.ts`

**Checkpoint**: MVP funcional: Asignación correlativa blindada y tabla de actas 100% operativa.

---

## Phase 4: User Story 2 - Emisión e Impresión Canónica de la Razón Notarial de Cotejo (Priority: P2)

**Goal**: Generar e imprimir la Razón Notarial de Cotejo (en formato Hoja Suelta y en Etiqueta Adhesiva Certificada al calce) con membrete oficial, datos del instrumento, logotipo y facsímil del Sello de Autorizar desde `useConfiguracionNotarial.ts`.

**Independent Test**: Abrir la acción "Imprimir Razón de Cotejo" en cualquier acta autorizada, verificar en la vista previa los datos institucionales dinámicos, la declaración solemne de cotejo con número de fojas, el sello notarial y la maquetación limpia en `@media print`.

### Implementation for User Story 2

- [x] T009 [US2] Construir el componente imprimible `app/components/cotejos/CotejoRazonImprimible.vue` con alternancia entre Hoja Carta y Etiqueta Adhesiva, inyección de `useConfiguracionNotarial` y reglas de impresión `@media print`
- [x] T010 [US2] Integrar el modal de visualización e impresión de razón notarial en la tabla de actas de `app/pages/cotejos/index.vue`
- [x] T011 [P] [US2] Crear pruebas unitarias para el componente imprimible en `tests/unit/components/cotejos/CotejoRazonImprimible.spec.ts`

**Checkpoint**: Generación e impresión de razones notariales de cotejo con plena validez oficial validada.

---

## Phase 5: User Story 3 - Digitalización y Resguardo Documental de Evidencias (Priority: P3)

**Goal**: Adjuntar y consultar las digitalizaciones de los documentos originales exhibidos y copias certificadas en el bucket privado `cotejos-documentos` de Supabase Storage.

**Independent Test**: En el detalle de un acta, cargar un PDF o imagen del documento cotejado; verificar que se transfiere al bucket de Storage y se puede visualizar y descargar directamente desde la plataforma.

### Implementation for User Story 3

- [x] T012 [US3] Construir el modal `app/components/cotejos/CotejoDetalleModal.vue` con visualizador de datos del acta, bitácora de auditoría y sección de carga/previsualización de evidencias en Supabase Storage
- [x] T013 [US3] Conectar el modal de detalle y gestión de evidencias en las acciones de fila de `app/pages/cotejos/index.vue`

**Checkpoint**: Resguardo documental digitalizado integrado y consultable por acta.

---

## Phase 6: User Story 4 - Gestión de Libros de Cotejo, Búsqueda Histórica y Cierre Solemne (Priority: P4)

**Goal**: Permitir la búsqueda y filtrado reactivo de cotejos, la cancelación justificada de actas con motivo en bitácora, la apertura de nuevos libros y el cierre formal de tomos con emisión del Acta Solemne de Clausura.

**Independent Test**: Filtrar la tabla de actas por solicitante y estatus; cancelar un acta registrando el motivo legal; abrir el diálogo de cierre de tomo, verificar el cálculo del balance de actas y confirmar el cierre formal impidiendo nuevos asientos.

### Implementation for User Story 4

- [x] T014 [US4] Implementar filtros reactivos por solicitante, tipo de documento y estatus en `app/pages/cotejos/index.vue`
- [x] T015 [US4] Implementar el flujo de cancelación justificada de acta en `app/pages/cotejos/index.vue` preservando el folio correlativo y registrando motivo legal y auditoría
- [x] T016 [US4] Construir el modal `app/components/cotejos/LibroCierreModal.vue` para cálculo de balance de actas (autorizadas vs canceladas) y emisión del Acta Solemne de Clausura de Tomo
- [x] T017 [US4] Construir el modal `app/components/cotejos/LibroAperturaModal.vue` para la apertura formal de nuevos libros de cotejos cuando se agota el tomo activo

**Checkpoint**: Ciclo completo de administración de tomos, cancelaciones y búsqueda histórica concluido.

---

## Phase 7: Polish, Verificación Integral y Cero Regresiones

**Purpose**: Actualización de pruebas de navegación, validación de la guía rápida y ejecución de la suite global de tests.

- [x] T018 Actualizar la prueba unitaria de navegación `tests/unit/composables/useNavItems.spec.ts` para verificar los 11 módulos de negocio y la presencia de Libro de Cotejos en el grupo *Operación*
- [x] T019 [P] Validar paso a paso todos los escenarios del archivo `specs/16-libro-cotejos/quickstart.md`
- [x] T020 Ejecutar la suite global de pruebas unitarias (`npm test`) verificando que los 445 tests previos más las nuevas pruebas del módulo de cotejos pasen al 100% sin ninguna regresión

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: Sin dependencias, arranca de inmediato.
- **Phase 2 (Foundational)**: Depende de Phase 1; bloquea todas las User Stories.
- **Phase 3 (User Story 1 - MVP)**: Depende de Phase 2.
- **Phase 4 (User Story 2)**: Depende de Phase 2 y Phase 3.
- **Phase 5 (User Story 3)**: Depende de Phase 2 y Phase 3.
- **Phase 6 (User Story 4)**: Depende de Phase 2 y Phase 3.
- **Phase 7 (Polish & Tests)**: Depende de todas las fases anteriores.

### Parallel Opportunities
- T001 y T002 en Phase 1 son paralelizables [P].
- T005 en Phase 2 es paralelizable [P].
- T008, T011 en pruebas unitarias son paralelizables [P].
- T019 y T020 en Phase 7 son ejecutables de forma consecutiva tras completar componentes.

---

## Implementation Strategy: MVP First

1. **Paso 1**: Completar Phase 1 y Phase 2 (Tipos TypeScript, migración PostgreSQL atómica con `fn_registrar_acta_cotejo`, bucket y composable `useCotejos.ts`).
2. **Paso 2**: Completar Phase 3 (Modal de captura `CotejoRegistroModal.vue` y página principal `index.vue`) → **MVP 100% funcional y testeable**.
3. **Paso 3**: Completar Phase 4 (Componente imprimible `CotejoRazonImprimible.vue` con sello y membrete dinámico).
4. **Paso 4**: Completar Phase 5 (Gestión de digitalizaciones y visor en `CotejoDetalleModal.vue`).
5. **Paso 5**: Completar Phase 6 (Filtros, cancelaciones justificadas y cierre solemne en `LibroCierreModal.vue`).
6. **Paso 6**: Ejecutar Phase 7 (Verificación global con 465 tests en verde y cero regresiones).
