# Tasks: 10-honorarios (Honorarios Notariales, Cotizaciones, Anticipos y Liquidación)

**Branch**: `10-honorarios` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup & Data Foundation

**Purpose**: Estructura de base de datos relacional y políticas RLS

- [x] T001 Crear migración `supabase/migrations/20260805000000_honorarios.sql` con tablas `honorarios_cuentas`, `honorarios_partidas`, `honorarios_pagos`, restricciones de integridad, triggers de recálculo aritmético automático `fn_recalcular_honorarios_cuenta` y consecutivo de recibos `fn_siguiente_folio_recibo`
- [x] T002 Aplicar políticas RLS (Row Level Security) y permisos dinámicos (`honorarios.ver`, `honorarios.crear`, `honorarios.editar`, `honorarios.modificar_monto`) en la migración SQL

---

## Phase 2: Foundational Layer (Tipos TypeScript y Composables)

**Purpose**: Tipos e infraestructura de cálculo en frontend compartida por todas las historias

- [x] T003 [P] Crear definiciones de tipos e interfaces TypeScript en `app/types/honorarios.ts` conforme a `contracts/honorarios-interface.md`
- [x] T004 [P] Implementar composable de cálculo aritmético puro `app/composables/useHonorariosCalculos.ts` (subtotales gravado/exento, IVA 16%, descuentos, total pagado, saldo pendiente, transiciones de estatus)
- [x] T005 [P] Crear pruebas unitarias para el motor de cálculo en `tests/unit/composables/useHonorariosCalculos.spec.ts`
- [x] T006 Implementar composable principal de integración con Supabase `app/composables/useHonorarios.ts` (fetchCuenta, guardarPartida, eliminarPartida, registrarPago, actualizarCfdi, fetchKpisCobranza)

---

## Phase 3: User Story 1 - Cotización con Partidas Libres e IVA 16% (Priority: P1) 🎯 MVP

**Goal**: Permitir al abogado o titular capturar partidas libres con concepto, monto e IVA, visualizando subtotales en tiempo real y gestionando la cotización del instrumento

**Independent Test**: Acceder a una escritura, abrir el diálogo de partida libre, capturar honorarios de $30,000 MXN con IVA y copias de $2,500 MXN exentas, verificar que calcula subtotal gravado, subtotal exento, IVA 16% ($4,800) y total de $37,300 MXN en estado `cotizado`.

### Implementation for User Story 1
- [x] T007 [P] [US1] Crear componente `app/components/honorarios/modal/HonorariosPartidaModal.vue` para captura/edición de partida libre (concepto, monto MXN, switch IVA 16%, orden, es_descuento)
- [x] T008 [P] [US1] Crear componente `app/components/honorarios/HonorariosPartidasTable.vue` con tabla interactiva de partidas, subtotales, switch de IVA y acciones editar/eliminar (respetando permiso `honorarios.modificar_monto`)
- [x] T009 [US1] Crear prueba unitaria `tests/unit/components/honorarios/HonorariosPartidasTable.spec.ts`

---

## Phase 4: User Story 2 - Pagos, Anticipos, Métodos de Pago y Saldos (Priority: P2)

**Goal**: Registrar pagos del cliente (pago único o anticipos en parcialidades) con folio consecutivo, método de pago, referencia y recálculo automático de saldo deudor

**Independent Test**: Registrar un anticipo de $20,000 MXN vía SPEI con clave de rastreo, constatar que el saldo disminuye en tiempo real, el estatus transiciona a `anticipo_parcial` y se genera el recibo `REC-2026-0001`. Al liquidar el saldo restante, la cuenta pasa automáticamente a `liquidado`.

### Implementation for User Story 2
- [x] T010 [P] [US2] Crear componente `app/components/honorarios/modal/HonorariosPagoModal.vue` para asentar anticipo o pago único con selector de método (`transferencia_spei`, `tarjeta_credito_debito`, `cheque`, `efectivo`), monto, referencia, concepto y semáforo preventivo LFPIORPI de control de efectivo
- [x] T011 [P] [US2] Crear componente `app/components/honorarios/HonorariosPagosTable.vue` con relación de cobros, folios de recibo, montos, funcionario receptor y botón de descarga de recibo
- [x] T012 [US2] Crear prueba unitaria `tests/unit/components/honorarios/HonorariosPagosTable.spec.ts`

---

## Phase 5: User Story 3 - Hoja de Liquidación Consolidada y Control CFDI 4.0 (Priority: P3)

**Goal**: Generar el estado de cuenta integral del cliente (Notaría vs Derechos de Terceros) en pantalla y PDF, y gestionar administrativamente la información fiscal CFDI 4.0

**Independent Test**: Abrir la Hoja de Liquidación de una escritura con honorarios y órdenes de pago de derechos (RPP/Catastro), verificar el desglose transparente de ambos rubros, el gran total y el saldo neto; capturar datos fiscales del cliente y UUID del CFDI marcando el estatus como `facturada`.

### Implementation for User Story 3
- [x] T013 [P] [US3] Implementar generador de PDF de estado de cuenta `app/utils/pdfHojaLiquidacion.ts` usando jsPDF (desglose formal Notaría vs Derechos de Terceros y balance general)
- [x] T014 [P] [US3] Crear prueba unitaria `tests/unit/utils/pdfHojaLiquidacion.spec.ts`
- [x] T015 [P] [US3] Crear componente `app/components/honorarios/modal/HojaLiquidacionModal.vue` con vista previa interactiva del estado de cuenta integral y botón de descarga/impresión PDF
- [x] T016 [P] [US3] Crear componente `app/components/honorarios/HonorariosCfdiCard.vue` y modal `app/components/honorarios/modal/HonorariosCfdiModal.vue` para captura de RFC, razón social, régimen, uso CFDI, método SAT (PUE/PPD) y folio fiscal UUID

---

## Phase 6: Pestaña en Escritura e Integración Global de Cobranza

**Purpose**: Integración de la pestaña en el Hub Notarial y desarrollo del tablero `/honorarios`

- [x] T017 [P] Crear componente de KPIs superiores `app/components/honorarios/HonorariosKpisBar.vue` (Honorarios Notaría, Derechos Terceros, Gran Total, Recibido, Saldo Neto con badge de estado)
- [x] T018 Crear componente de pestaña `app/components/honorarios/HonorariosTab.vue` integrando KPIs, tabla de partidas, tabla de pagos, tarjeta CFDI y botón de Hoja de Liquidación, conforme a la maqueta Stitch `612bb806035745b995e147c0c1808bda`
- [x] T019 Reemplazar `<PlaceholderTab />` en el tab `honorarios` de `app/pages/escrituras/[id].vue` por `<HonorariosTab :escritura-id="escrituraId" :estatus-escritura="escritura.estatus" />`
- [x] T020 Desarrollar la vista global de cobranza `app/pages/honorarios/index.vue` con tarjetas KPI mensuales, filtros de búsqueda y tabla de cuentas conforme a la maqueta Stitch `90171980400741849b0d3e3488715e75`

---

## Phase 7: Polish & Verification

**Purpose**: Verificación de calidad, pruebas unitarias y garantía de cero regresiones

- [x] T021 Crear prueba unitaria `tests/unit/components/honorarios/HonorariosTab.spec.ts`
- [x] T022 Ejecutar la suite completa de pruebas unitarias (`npm test`) y verificar que los 250 tests existentes más los nuevos tests de honorarios pasen al 100%
- [x] T023 Validar los escenarios del archivo `quickstart.md`
