# Tasks: 08-ordenes-pago — Órdenes de Pago de Derechos a Terceros, Líneas de Captura y Conciliación

**Feature**: `08-ordenes-pago`  
**Date**: 2026-09-16  
**Status**: Completed

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Definición de tipos, utilidades de semáforo de vigencia y formateo monetario MXN.

- [x] T001 [P] Crear tipos e interfaces TypeScript en `app/types/ordenesPago.ts` conforme a contratos.
- [x] T002 [P] Implementar utilidades isomórficas de semáforo de vigencia y formato de moneda en `app/utils/ordenesPagoUtils.ts`.
- [x] T003 [P] Crear pruebas unitarias para `ordenesPagoUtils.ts` en `tests/unit/components/ordenesPago/ordenesPagoUtils.spec.ts`.

---

## Phase 2: Foundational (Database Schema & Backend Migration)

**Purpose**: Estructura de base de datos relacional, secuencias, triggers de sincronización y composable base.

**⚠️ CRITICAL**: Ninguna User Story puede completarse sin la base de datos y el composable base listos.

- [x] T004 Crear migración SQL `supabase/migrations/20260803000000_ordenes_pago.sql` con tabla `ordenes_pago`, triggers de folio automático (`fn_tr_orden_pago_folio`), sincronización con trámites (`fn_tr_orden_pago_sync_tramite`), vista `v_ordenes_pago_resumen` y políticas RLS.
- [x] T005 Implementar el composable reactivo `app/composables/useOrdenesPago.ts` con manejo de estados, operaciones CRUD, liquidación, cancelación y cálculo de resumen financiero.
- [x] T006 [P] Crear pruebas unitarias para `useOrdenesPago` en `tests/unit/components/ordenesPago/useOrdenesPago.spec.ts`.

**Checkpoint**: Base de datos, tipos y composable listos para implementar las User Stories.

---

## Phase 3: User Story 1 - Registro y Gestión de Órdenes de Pago en la Escritura (Priority: P1) 🎯 MVP

**Goal**: Permitir el registro asistido de órdenes de pago por derechos gubernamentales vinculadas a la escritura y trámite, con línea de captura, fecha de vencimiento y semáforo visual.

**Independent Test**: En la pestaña "Órdenes de Pago" de una escritura, registrar una orden para "RPP" por $18,450 MXN con línea de captura y vigencia; verificar que se lista correctamente, calcula el semáforo y muestra la alerta ámbar informativa de saldo pendiente sin bloquear la protocolización.

- [x] T007 [US1] Crear componente modal `app/components/ordenesPago/OrdenPagoFormModal.vue` para alta/edición asistida de órdenes de pago con líneas de captura, vigencias y procedencia de fondos.
- [x] T008 [US1] Crear componente de pestaña `app/components/escrituras/tabs/OrdenesPagoTab.vue` con tarjetas de resumen financiero, alerta ámbar informativa de saldo pendiente y tabla interactiva con semáforos.
- [x] T009 [US1] Montar `OrdenesPagoTab.vue` en `app/pages/escrituras/[id].vue` reemplazando el `PlaceholderTab` de la pestaña `ordenes`.
- [x] T010 [P] [US1] Crear pruebas unitarias en `tests/unit/components/ordenesPago/OrdenesPagoTab.spec.ts` validando renderizado, resumen financiero, alerta no bloqueante y alta de órdenes.

**Checkpoint**: MVP de Órdenes de Pago funcional y probado de forma independiente.

---

## Phase 4: User Story 2 - Liquidación Bancaria, Comprobante y Conciliación Financiera (Priority: P2)

**Goal**: Permitir al cajero o responsable administrativo asentar el pago efectivo de la orden con método bancario (SPEI, cheque, tarjeta), clave de rastreo bancaria y custodia de comprobante en Storage.

**Independent Test**: Seleccionar una orden pendiente, asentar liquidación SPEI con clave de rastreo y comprobante PDF; verificar que pasa a estado `pagado`, semáforo `azul`, comprobante vinculado al expediente digital y trámite sincronizado con chip "Derechos Pagados".

- [x] T011 [US2] Crear componente modal `app/components/ordenesPago/OrdenPagoLiquidarModal.vue` para captura de método de pago, clave de rastreo bancaria, fecha de liquidación y adjunto de comprobante.
- [x] T012 [US2] Integrar la liquidación en `OrdenesPagoTab.vue` y `useOrdenesPago.ts` gestionando subida a Storage `expedientes` e inserción en `expediente_documentos`.
- [x] T013 [US2] Sincronizar el estatus de trámite en frontend para que al liquidar una orden vinculada, el chip del trámite refleje inmediatamente "Derechos Pagados".
- [x] T014 [P] [US2] Crear pruebas unitarias en `tests/unit/components/ordenesPago/OrdenPagoLiquidarModal.spec.ts` validando el flujo de liquidación y reglas de comprobante.

**Checkpoint**: User Stories 1 y 2 completamente funcionales e integradas.

---

## Phase 5: User Story 3 - Tablero Consolidado de Tesorería Notarial y Vencimiento de Líneas (Priority: P3)

**Goal**: Supervisión global en `/ordenes-pago` de todas las órdenes activas en la notaría, con filtros por dependencia, vigencia, estado y KPIs de tesorería y caja.

**Independent Test**: Navegar a `/ordenes-pago`, comprobar las tarjetas KPI de tesorería, filtrar por líneas por vencer y acceder directamente a una escritura desde el tablero.

- [x] T015 [US3] Crear componente de filtros `app/components/ordenesPago/OrdenesPagoFiltros.vue` con búsqueda reactiva, filtro por dependencia, estado y semáforo de vigencia.
- [x] T016 [US3] Crear la página del tablero notarial `app/pages/ordenes-pago/index.vue` con KPIs de tesorería, tabla consolidada de órdenes y accesos directos a escrituras.
- [x] T017 [US3] Agregar enlace a `/ordenes-pago` en la barra de navegación principal del sistema (`app/composables/useNavItems.ts`).
- [x] T018 [P] [US3] Crear pruebas unitarias para el tablero y filtros en `tests/unit/components/ordenesPago/OrdenesPagoDashboard.spec.ts`.

**Checkpoint**: Todas las User Stories (P1, P2, P3) implementadas y funcionales.

---

## Phase 6: Polish & Verification

**Purpose**: Verificación integral, cero regresiones y validación de escenarios quickstart.

- [x] T019 Ejecutar suite completa de Vitest (`npm test`) asegurando 100% de tests pasando (202 tests en 46 archivos de prueba) con 0 fallos.
- [x] T020 Validar escenarios de `specs/08-ordenes-pago/quickstart.md` y documentar en `walkthrough.md`.

---

## Dependencies & Execution Order

```
Phase 1: Setup (T001, T002, T003) - COMPLETADA ✅
     │
     ▼
Phase 2: Foundational (T004, T005, T006) - COMPLETADA ✅
     │
     ▼
Phase 3: User Story 1 (T007, T008, T009, T010) 🎯 MVP - COMPLETADA ✅
     │
     ▼
Phase 4: User Story 2 (T011, T012, T013, T014) - COMPLETADA ✅
     │
     ▼
Phase 5: User Story 3 (T015, T016, T017, T018) - COMPLETADA ✅
     │
     ▼
Phase 6: Polish & Verification (T019, T020) - COMPLETADA ✅
```
