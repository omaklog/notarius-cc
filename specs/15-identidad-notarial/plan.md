# Implementation Plan: 15-identidad-notarial (Identidad Notarial, Fe Pública y Configuración Institucional)

**Branch**: `15-identidad-notarial` | **Date**: 2026-09-25 | **Spec**: [specs/15-identidad-notarial/spec.md](spec.md)

**Input**: Feature specification from `specs/15-identidad-notarial/spec.md`

---

## Summary

Implementar el módulo central de **Identidad Notarial y Configuración Institucional** de la Notaría Pública en `notarius-cc`. Incluye la tabla singleton en PostgreSQL `public.configuracion_notarial`, el bucket privado/público `notaria-identidad` en Supabase Storage para activos gráficos (logotipo institucional y facsímil del Sello Notarial de Autorizar), el composable `useConfiguracionNotarial.ts` con caché en memoria y reactividad transversal, y la interfaz administrativa en `/administracion-general/identidad-notarial` con diseño Stitch Notarial (`#1B3A5F`, `#A9762E`), junto con su inyección en la barra superior de navegación y los reportes imprimibles.

---

## Technical Context

- **Language/Version**: TypeScript 5.x / Vue 3 (Composition API `<script setup lang="ts">`) / Nuxt 3.
- **Primary Dependencies**: Vuetify 3 (paleta Stitch Notarial), Supabase Client (`@nuxtjs/supabase`).
- **Storage**: PostgreSQL (tabla singleton `public.configuracion_notarial`) + Supabase Storage (bucket `notaria-identidad`).
- **Testing**: Vitest + `@vue/test-utils` (pruebas unitarias para composable y componentes UI).
- **Target Platform**: Aplicación web responsiva (desktop y tablet para personal del despacho notarial).
- **Project Type**: Web Application (Nuxt 3 SSR/SPA).
- **Performance Goals**: Respuesta de consulta de configuración < 50ms (vía caché local); previsualización de activos gráficos instantánea.
- **Constraints**: 0 regresiones en la suite global de pruebas (los 424 tests actuales deben mantenerse en verde al 100%).
- **Scale/Scope**: 1 tabla singleton, 1 bucket de storage, 1 composable, 1 vista administrativa con tabs/cards, 1 acceso en dashboard de administración y 2 integraciones de consumo (AppNavbar y reportes de índices).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **§1 Visión general**: Cumple. La configuración notarial provee el marco institucional a todas las escrituras y actos del sistema.
- **§2 Stack tecnológico**: Cumple. Utiliza Nuxt 3, Vuetify 3, Supabase y Vitest sin dependencias no autorizadas.
- **§3 Pestañas autónomas por contrato**: Cumple. No altera la interfaz externa ni el contrato de las pestañas preexistentes en `[id].vue`.
- **§7 Convenciones generales**: Cumple. Tipado estricto en TypeScript, composables idiomáticos y pruebas unitarias completas.
- **§8 Diseño con Stitch**: Cumple. Aplica tokens oficiales (`#1B3A5F`, `#A9762E`, `#F8FAFC`) y ergonomía compacta notarial.

---

## Project Structure

### Documentation (this feature)

```text
specs/15-identidad-notarial/
├── plan.md              # Este plan de implementación
├── research.md          # Decisiones de arquitectura y singleton
├── data-model.md        # Esquema relacional y DTOs TypeScript
├── quickstart.md        # Guía de validación paso a paso
├── contracts/           # Contratos de composable y vistas
│   └── identidad-interface.md
└── checklists/
    └── requirements.md  # Checklist de calidad de especificación (PASS)
```

### Source Code (repository root)

```text
app/
├── types/
│   └── configuracion.ts                        # DTOs e interfaces de identidad notarial
├── composables/
│   └── useConfiguracionNotarial.ts             # Composable central con caché reactiva
├── pages/
│   └── administracion-general/
│       ├── index.vue                           # Inclusión de la tarjeta de Identidad Notarial
│       └── identidad-notarial.vue              # Vista administrativa con pestañas Stitch
├── components/
│   └── layout/
│       └── AppNavbar.vue                       # Inyección de nombre y logotipo dinámicos
supabase/
└── migrations/
    └── 20260815000000_identidad_notarial.sql   # Migración PostgreSQL con singleton, bucket y RLS
tests/
└── unit/
    ├── composables/
    │   └── useConfiguracionNotarial.spec.ts    # Pruebas unitarias del composable
    └── pages/
        └── administracion-general/
            └── identidad-notarial.spec.ts      # Pruebas unitarias de la vista administrativa
```

---

## Plan Phases

- **Phase 1: Setup & Data Layer**: Crear tipos `configuracion.ts` y migración SQL con la tabla singleton `configuracion_notarial`, bucket `notaria-identidad` y políticas RLS.
- **Phase 2: Composable Central**: Implementar `useConfiguracionNotarial.ts` con métodos de lectura, actualización, subida de activos y pruebas unitarias.
- **Phase 3: Vista de Administración**: Construir la página `app/pages/administracion-general/identidad-notarial.vue` con pestañas de Ficha, Domicilio, Identidad Visual y Leyendas, y vincular la tarjeta en `/administracion-general/index.vue`.
- **Phase 4: Inyección y Consumo Institucional**: Integrar los datos reactivos en `AppNavbar.vue` y en los reportes imprimibles (`ReporteIndiceVolumenImprimible.vue`).
- **Phase 5: Verificación y Cero Regresiones**: Ejecutar la suite completa de pruebas unitarias (`npm test`) verificando 424+ tests en verde.
