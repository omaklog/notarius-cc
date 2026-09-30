# Implementation Plan: 10-honorarios (Honorarios Notariales, Cotizaciones, Anticipos y Liquidación)

**Branch**: `10-honorarios` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/10-honorarios/spec.md`

---

## Summary

Implementación integral del módulo de Honorarios Notariales, Cotizaciones, Anticipos y Liquidación de Clientes. Administra los ingresos propios de la notaría derivados de la fe pública notarial y gastos de gestión interna con estricta separación contable respecto a las órdenes de pago de derechos de terceros (Constitución §7). Incluye:
- Cotización con partidas libres y cálculo en tiempo real de subtotales e IVA (16%).
- Registro de anticipos y pagos del cliente (pago único o en parcialidades) con emisión de recibos y saldos en tiempo real.
- Emisión de la **Hoja de Liquidación Consolidada** (estado de cuenta integral para el cliente que desglosa honorarios propios vs derechos de terceros en pantalla y PDF).
- Infraestructura y modelo de datos normalizado preparado para timbrado fiscal CFDI 4.0 con control administrativo de UUID en esta fase.
- Componente de pestaña `HonorariosTab.vue` en el detalle de la escritura ([`escrituras/[id].vue`](file:///Users/cosmic-chimps/IdeaProjects/pruebas%20de%20concepto/notarius-cc/app/pages/escrituras/%5Bid%5D.vue)) y tablero global de cobranza `/honorarios` basado en maquetas Stitch (`612bb806035745b995e147c0c1808bda` y `90171980400741849b0d3e3488715e75`).

---

## Technical Context

**Language/Version**: TypeScript 5.x / Vue 3 / Nuxt 3 (SSR/SPA)  
**Primary Dependencies**: Vuetify 3 (UI), Pinia (estado), Supabase Client, jsPDF (para generación de Hoja de Liquidación en PDF), date-fns  
**Storage**: PostgreSQL (Supabase) con tablas `honorarios_cuentas`, `honorarios_partidas`, `honorarios_pagos`, y bucket `expedientes` para comprobantes y facturas  
**Testing**: Vitest + Vue Test Utils (`npm test`)  
**Target Platform**: Web moderna (Desktop First notarial, responsive)  
**Project Type**: Web application (Nuxt 3 + Supabase)  
**Performance Goals**: Cálculo aritmético en frontend en tiempo real (< 50ms), consultas de cuentas con RLS en < 150ms  
**Constraints**: Estricta separación de cuentas de derechos vs honorarios (§7); apego a las maquetas Stitch `612bb806035745b995e147c0c1808bda` y `90171980400741849b0d3e3488715e75`; protección de modificación de montos vía permiso `honorarios.modificar_monto`; cero regresiones en los 250 tests existentes  
**Scale/Scope**: Módulo completo con migración SQL, composables, componentes de pestaña, modales, página global y suite de tests unitarios  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **§1 & §3 Entidad Raíz**: ✅ La cuenta de honorarios depende de la escritura matriz (`escrituras.id`).
- **§5 Conservación Documental**: ✅ Comprobantes de pago y facturas se asocian al repositorio `expediente_documentos` (conservación 10 años).
- **§7 Separación Contable**: ✅ Estricta separación entre dinero de paso (`ordenes_pago`) e ingresos propios (`honorarios_*`). Tablas y modelos completamente desacoplados.
- **§7 Auditoría**: ✅ Registro de `created_by`, `updated_by`, timestamps y trazabilidad de cobros.
- **§7 Roles y Permisos**: ✅ Integración con el catálogo dinámico de permisos (`honorarios.ver`, `honorarios.crear`, `honorarios.editar`, `honorarios.modificar_monto`).
- **§8 Diseño Previo con Stitch**: ✅ Pantallas generadas previamente en Stitch con tokens institucionales (`#1B3A5F`, `#A9762E`):
  - Screen ID `612bb806035745b995e147c0c1808bda`: Pestaña `HonorariosTab.vue` en Escrituras.
  - Screen ID `90171980400741849b0d3e3488715e75`: Tablero consolidado `/honorarios`.

---

## Project Structure

### Documentation (this feature)

```text
specs/10-honorarios/
├── plan.md              # Este plan de implementación
├── research.md          # Investigación y decisiones de arquitectura (Phase 0)
├── data-model.md        # Diagramas y especificación de tablas/funciones SQL (Phase 1)
├── quickstart.md        # Guía paso a paso de verificación (Phase 1)
├── contracts/
│   └── honorarios-interface.md # Tipos TypeScript y contratos de componentes (Phase 1)
├── checklists/
│   └── requirements.md  # Checklist de calidad validado
└── tasks.md             # Tareas ordenadas (Phase 2 - speckit-tasks)
```

### Source Code

```text
supabase/migrations/
└── 20260805000000_honorarios.sql

app/
├── types/
│   └── honorarios.ts
├── composables/
│   ├── useHonorarios.ts
│   └── useHonorariosCalculos.ts
├── utils/
│   └── pdfHojaLiquidacion.ts
├── components/
│   └── honorarios/
│       ├── HonorariosTab.vue
│       ├── HonorariosPartidasTable.vue
│       ├── HonorariosPagosTable.vue
│       ├── HonorariosKpisBar.vue
│       ├── HonorariosCfdiCard.vue
│       ├── modal/
│       │   ├── HonorariosPartidaModal.vue
│       │   ├── HonorariosPagoModal.vue
│       │   ├── HojaLiquidacionModal.vue
│       │   └── HonorariosCfdiModal.vue
├── pages/
│   ├── honorarios/
│   │   └── index.vue
│   └── escrituras/
│       └── [id].vue (reemplazo del PlaceholderTab en tab honorarios)

tests/unit/
├── composables/
│   ├── useHonorariosCalculos.spec.ts
│   └── useHonorarios.spec.ts
├── components/honorarios/
│   ├── HonorariosPartidasTable.spec.ts
│   ├── HonorariosPagosTable.spec.ts
│   └── HonorariosTab.spec.ts
└── utils/
    └── pdfHojaLiquidacion.spec.ts
```

---

## Plan de Ejecución por Fases

### Fase 0: Investigación y Fundamentos (Completada)
- Análisis de la separación contable con órdenes de pago.
- Definición del modelo de partidas libres con IVA y descuentos.
- Generación de pantallas en Stitch MCP con tokens notariales.

### Fase 1: Diseño y Contratos (Completada)
- Modelo de base de datos relacional y funciones PL/pgSQL (`data-model.md`).
- Interfaces TypeScript y contratos de componentes (`contracts/honorarios-interface.md`).
- Escenarios de validación rápida (`quickstart.md`).

### Fase 2: Tareas y Desglose Operativo (`/speckit-tasks`)
- Generación de `tasks.md` ordenado por dependencias:
  1. Base de datos y migración Supabase (`20260805000000_honorarios.sql`).
  2. Tipos TypeScript y composable de cálculos puros (`useHonorariosCalculos.ts`).
  3. Composable de interacción con Supabase (`useHonorarios.ts`).
  4. Generador de PDF de Hoja de Liquidación Consolidada (`pdfHojaLiquidacion.ts`).
  5. Componentes Vue y modales de la pestaña `HonorariosTab.vue`.
  6. Integración en `escrituras/[id].vue` (reemplazo de `PlaceholderTab`).
  7. Vista global de tesorería y cobranza `/honorarios/index.vue`.
  8. Pruebas unitarias completas y verificación de no regresión.
