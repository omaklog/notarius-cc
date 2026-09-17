# Implementation Plan: 05-cumplimiento-pld (Cumplimiento PLD / UIF y Fiscalización Notarial)

**Branch**: `05-cumplimiento-pld` | **Date**: 2026-09-15 | **Spec**: [specs/05-cumplimiento-pld/spec.md](spec.md)

**Input**: Feature specification from `/specs/05-cumplimiento-pld/spec.md`

**Note**: This document outlines the technical architecture, data structures, and implementation phases for the Compliance PLD/UIF module in Notarius.

---

## Summary

Implementar el módulo de Cumplimiento PLD / Prevención de Lavado de Dinero conforme al Art. 17 y Art. 32 de la LFPIORPI y a la Constitución del Sistema (§5). El módulo introduce:
1. **Screening de listas de restricción obligatorias** (LPB UIF/SHCP, OFAC SDN, ONU Sanciones y SAT 69-B EFOS) con enlaces directos a portales oficiales y archivo de capturas de pantalla con sellado de tiempo de 10 años en Supabase Storage.
2. **Reutilización asistida de dictámenes previos** (< 90 días) con confirmación explícita del usuario sin duplicar archivos.
3. **Cálculo dinámico de umbrales UMA** (identificación y aviso ordinario SAT) consultando `uma_historico` conforme a la fecha del acto notarial.
4. **Control estricto de liquidación en efectivo** (Art. 32 LFPIORPI) con bloqueo automático por exceso de efectivo en UMA.
5. **Debida diligencia reforzada para PEPs** con autorización controlada por roles RBAC (`notario_titular` o `administrador`).
6. **Sustitución canónica definitiva del stub en `fn_validar_protocolizacion`** que asegura que ninguna escritura sea protocolizada con irregularidades PLD.
7. **Pestaña notarial de alta fidelidad `PldTab.vue`** y modales correspondientes basados en el prototipado previo realizado en Stitch (MCP).

---

## Technical Context

**Language/Version**: TypeScript 5.x (Strict mode) / Vue 3.x (Composition API con `<script setup>`) / SQL (PostgreSQL 15+ en Supabase).

**Primary Dependencies**:
- Frontend: Nuxt 3, Vuetify 3, Pinia, @vueuse/core, VeeValidate + Yup.
- Backend: Supabase Postgres, Supabase Storage (`pld-evidencias`), Supabase Auth, Row Level Security (RLS).
- UI Prototyping: Stitch MCP (Notaría 42 design system).

**Storage**:
- PostgreSQL: Tablas `pld_listas_catalogo`, `pld_consultas`, `pld_evaluaciones_escritura`, `pld_pep_diligencias`, y columnas en `actos_juridicos`.
- Supabase Storage: Bucket privado `pld-evidencias` con RLS.

**Testing**: Vitest + Vue Test Utils para componentes y composables frontend; migraciones y funciones SQL probadas en Supabase local.

**Target Platform**: Navegador web de escritorio (1280px+ optimizado para notaría).

**Project Type**: Aplicación Web Notarial (Nuxt 3 SSR/SPA híbrida + Supabase Backend).

**Performance Goals**:
- Cálculo reactivo de umbrales UMA y límites de efectivo en < 50ms.
- Evaluación del Gate de Protocolización en Postgres en < 150ms.
- Carga de la pestaña de PLD en < 300ms.

**Constraints**:
- Conservación inmutable de evidencias por 10 años conforme a la LFPIORPI (Art. 18 Fracc. IV) y NOM-151.
- Restricción estricta de protocolización: fallo inmediato si hay screening incompleto, bloqueo activo, PEP no autorizado o exceso de efectivo.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Cumplimiento en este Feature | Estado |
|---|---|---|
| **§1. Escritura como entidad raíz** | Todas las evaluaciones, consultas y expedientes PLD orbitan alrededor de la escritura y sus comparecientes vinculados. | **PASSED** |
| **§2. Stack tecnológico** | Vue 3 + Nuxt 3 + Vuetify + Pinia + Supabase (Postgres + Storage + RLS) + Vitest. | **PASSED** |
| **§5. Marco regulatorio PLD/UIF** | Screening manual asistido con enlaces directos, adjunto obligatorio de captura de pantalla, umbrales en UMA por fecha del acto, control de efectivo Art. 32, diligencia reforzada PEP y bloqueo estricto. | **PASSED** |
| **§6. Protocolización atómica irreversible** | Reemplazo definitivo del stub en `fn_validar_protocolizacion` impidiendo el cambio a `protocolizada` si no se satisfacen todas las reglas PLD. | **PASSED** |
| **§7. Convenciones generales** | TypeScript estricto, RLS en todas las tablas, soft-delete e inmutabilidad con timestamps de autoría. | **PASSED** |
| **§8. Diseño visual obligatorio en Stitch** | Diseños previos creados y registrados en Stitch con la paleta notarial (#1B3A5F, #A9762E, #F0F2F4). | **PASSED** |

---

## Project Structure

### Documentation (this feature)

```text
specs/05-cumplimiento-pld/
├── spec.md              # Feature specification clarificada
├── checklists/
│   └── requirements.md  # Checklist de calidad (16/16 aprobado)
├── research.md          # Investigación y decisiones arquitectónicas
├── data-model.md        # Esquema de base de datos y entidades
├── contracts/
│   ├── pld-types.ts     # Contratos e interfaces TypeScript
│   └── pld-database-functions.sql # Signaturas de funciones SQL
├── quickstart.md        # Guía de verificación paso a paso
├── plan.md              # Este documento de planificación
└── tasks.md             # Tareas ejecutables (/speckit-tasks)
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   └── 20260730000000_cumplimiento_pld.sql # Tablas pld_*, bucket storage, RLS y funciones
│
app/
├── types/
│   └── pld.ts                              # Contratos y tipos de datos PLD
├── stores/
│   └── pld.ts                              # Pinia Store para estado y screening PLD
├── composables/
│   └── usePldCalculations.ts               # Composable de cálculo UMA y topes de efectivo
├── components/
│   └── pld/
│       ├── PldSemaforoBanner.vue           # Banner superior de semáforo global
│       ├── PldUmbralesCard.vue             # Tarjeta de análisis UMA y control de efectivo
│       ├── PldComparecientesTable.vue      # Tabla notarial de comparecientes y cotejos
│       ├── PldScreeningModal.vue           # Modal de cotejo manual y adjunto de evidencias
│       └── PldPepApprovalModal.vue         # Modal de aprobación de excepción PEP (RBAC)
│   └── escrituras/
│       └── tabs/
│           └── PldTab.vue                  # Pestaña integrada en el detalle de la escritura
│
tests/
├── unit/
│   ├── composables/
│   │   └── usePldCalculations.spec.ts      # Pruebas unitarias de cálculo UMA y efectivo
│   ├── stores/
│   │   └── pld.spec.ts                     # Pruebas unitarias del Store de Pinia
│   └── components/
│       ├── PldUmbralesCard.spec.ts         # Pruebas de renderizado de umbrales
│       ├── PldComparecientesTable.spec.ts  # Pruebas de tabla y estados
│       └── PldScreeningModal.spec.ts       # Pruebas de captura de evidencias y validación
```

**Structure Decision**:
Sigue la arquitectura estándar de Notarius: backend relacional en Supabase con funciones transaccionales y RLS, store centralizado en Pinia, componentes modulares en `app/components/pld/` reutilizados dentro de `app/components/escrituras/tabs/PldTab.vue`, y pruebas unitarias exhaustivas en `tests/unit/`.

---

## Complexity Tracking

> **Sin violaciones a la constitución.** Todas las decisiones se apegan a los principios de desarrollo notarial.
