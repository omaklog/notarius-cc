# Implementation Plan: 08-ordenes-pago (Órdenes de Pago de Derechos a Terceros, Líneas de Captura y Conciliación)

**Branch**: `08-ordenes-pago` | **Date**: 2026-09-16 | **Spec**: [specs/08-ordenes-pago/spec.md](spec.md)

**Input**: Requerimientos del módulo de Órdenes de Pago de Derechos a Terceros conforme a la Constitución del Sistema Notarial (§1, §3, §4, §5, §7, §8), diseño Stitch completado (Screen ID: `302bb93f49bf430d8fc2e28b73543efe`) y acuerdos de clarificación (alerta no bloqueante para protocolización, captura asistida con línea oficial y fondos de paso).

---

## Summary

Implementación integral del módulo de Órdenes de Pago de Derechos a Terceros, Líneas de Captura y Conciliación de Tesorería. Administra el "dinero de paso" gubernamental (RPP, Catastro, SACMEX, Tesorería/ISAI, SAT, SE) con estricta separación contable respecto a honorarios (§7). Incluye semáforo dinámico de vigencia de líneas de captura, sincronización bidireccional con el módulo de trámites (`tramites_escritura.orden_pago_id`), liquidación bancaria SPEI con clave de rastreo, custodia probatoria de comprobantes en Supabase Storage (§5), alerta informativa no bloqueante en la escritura ante saldos pendientes, integración de la pestaña `OrdenesPagoTab.vue` en la escritura y tablero consolidado de tesorería y caja `/ordenes-pago`.

---

## Technical Context

**Language/Version**: TypeScript 5+ / Node.js 20+ / SQL (PostgreSQL 15+ PL/pgSQL)  
**Primary Dependencies**: Nuxt 3, Vue 3, Vuetify 3, Supabase JS Client, Pinia, Lucide / MDI Icons  
**Storage**: PostgreSQL (tablas relacionales, triggers y vista consolidada) + Supabase Storage (`expedientes` bucket)  
**Testing**: Vitest + Happy DOM + Vue Test Utils (`npm test`)  
**Target Platform**: Navegador web moderno (Desktop / Tablet)  
**Project Type**: Web application (Nuxt 3 SPA / SSR) + Supabase Backend  
**Performance Goals**: Tablero `/ordenes-pago` y pestaña reactiva con filtrado en < 200 ms; cálculo instantáneo de semáforo de vencimiento  
**Constraints**: Estricta separación de cuentas de derechos vs honorarios (§7); apego a la maqueta Stitch `302bb93f49bf430d8fc2e28b73543efe`; no bloquear protocolización por derechos pendientes; cero regresiones en los 174 tests existentes  
**Scale/Scope**: Trazabilidad de miles de órdenes de pago anuales con secuencias de folios `ORD-YYYY-NNNN`  

---

## Constitution Check

*GATE: Evaluado contra la Constitución del Sistema de Administración Notarial v1.3.0*

1. **§1. Escritura Pública como Entidad Raíz**:  
   - ✅ Toda orden de pago pertenece obligatoriamente a una escritura matriz (`escritura_id` NOT NULL con `ON DELETE CASCADE`). La pestaña vive dentro de `/escrituras/[id]`.
2. **§2. Stack Tecnológico**:  
   - ✅ Vue 3 + Nuxt 3 + Vuetify en frontend; Supabase (PostgreSQL, RLS, Storage) en backend; Vitest para testing.
3. **§5. Conservación**:  
   - ✅ Comprobantes de transferencia SPEI y boletas de pago se custodian en Supabase Storage bajo la carpeta `/escrituras/{id}/ordenes_pago/` y se vinculan a `expediente_documentos`.
4. **§7. Separación Contable y Trazabilidad**:  
   - ✅ La tabla `ordenes_pago` maneja exclusivamente dinero de paso hacia dependencias oficiales; nunca se mezcla con cobro de honorarios. Se auditan `created_by`, `pagado_por`, `created_at` y `updated_at`.
5. **§8. Diseño Visual Obligatorio con Stitch (MCP)**:  
   - ✅ Pantalla generada en proyecto Stitch `2333330112401314472` (Screen ID: `302bb93f49bf430d8fc2e28b73543efe`) con la paleta notarial oficial (`#1B3A5F`, `#A9762E`, `#2F6F4E`, `#B23A34`, `#F0F2F4`).
6. **Regla del Usuario (Protocolización No Bloqueante)**:  
   - ✅ Las órdenes de pago pendientes no bloquean la protocolización en `fn_validar_protocolizacion`. Despliegan alerta visual informativa en la escritura y en la pestaña correspondiente.

---

## Project Structure

### Documentation (this feature)

```text
specs/08-ordenes-pago/
├── spec.md              # Especificación funcional y criterios de aceptación
├── plan.md              # Este plan de implementación
├── research.md          # Investigación de arquitectura y decisiones
├── data-model.md        # Modelo relacional de Postgres, triggers y vistas
├── contracts/
│   └── ordenes-pago-interface.md # Tipos TypeScript y contratos de composables y componentes
├── quickstart.md        # Guía de validación y escenarios de prueba
└── checklists/
    └── requirements.md  # Checklist de calidad de la especificación
```

### Source Code (repository root)

```text
supabase/migrations/
└── 20260803000000_ordenes_pago.sql        # Migración de ordenes_pago, triggers, vistas y RLS

app/
├── types/
│   └── ordenesPago.ts                     # Tipos, interfaces y estados de órdenes de pago
├── utils/
│   └── ordenesPagoUtils.ts                # Semáforo de vigencia y formateo de moneda MXN
├── composables/
│   └── useOrdenesPago.ts                  # Composable reactivo para órdenes de pago y tesorería
├── components/
│   ├── ordenesPago/
│   │   ├── OrdenPagoFormModal.vue         # Modal de alta y edición de órdenes de pago
│   │   ├── OrdenPagoLiquidarModal.vue     # Modal de liquidación bancaria SPEI y comprobante
│   │   └── OrdenesPagoFiltros.vue         # Filtros combinados por estado, dependencia y vigencia
│   └── escrituras/
│       └── tabs/
│           └── OrdenesPagoTab.vue         # Pestaña canónica en detalle de escritura
└── pages/
    ├── escrituras/
    │   └── [id].vue                       # Montaje de OrdenesPagoTab (reemplaza PlaceholderTab)
    └── ordenes-pago/
        └── index.vue                      # Tablero global notarial de tesorería y caja

tests/unit/
└── components/
    └── ordenesPago/
        ├── ordenesPagoUtils.spec.ts       # Pruebas del cálculo de semáforos y formateos
        ├── useOrdenesPago.spec.ts         # Pruebas unitarias del composable
        └── OrdenesPagoTab.spec.ts         # Pruebas de renderizado, modales y resumen financiero
```

---

## Complexity Tracking

| Decisión | Justificación | Alternativa Descartada y Razón |
|---|---|---|
| Trigger de sincronización bidireccional entre `ordenes_pago` y `tramites_escritura` | Evita inconsistencias de clave foránea manual cuando el usuario crea una orden ligada a un trámite | Actualización manual en capa de frontend (descartada por riesgo de desincronización y concurrencia) |
| Vista `v_ordenes_pago_resumen` con semáforo precalculado | Agiliza las consultas tanto del tablero global `/ordenes-pago` como de la pestaña de la escritura | Cálculo exclusivo en cliente (descartado para permitir filtrado server-side por estado de vigencia) |
