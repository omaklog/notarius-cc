# Implementation Plan: 13-reportes (Panel Ejecutivo, Reportes Operativos e Índices Notariales por Volumen)

**Branch**: `13-reportes` | **Date**: 2026-09-25 | **Spec**: [specs/13-reportes/spec.md](specs/13-reportes/spec.md)

**Input**: Feature specification from `specs/13-reportes/spec.md`

## Summary

Implementar el Centro de Reportes Notariales (`/reportes`) que proporciona:
1. **Dashboard Ejecutivo del Mes**: KPIs del mes (escrituras abiertas, firmadas, en trámite, canceladas), balance de carga por abogado redactor (gráfica de barras) y Top 5 de actos jurídicos con más demanda (gráfica de dona), con selector reactivo de periodo.
2. **Reporte General Consolidado de Escrituras y Gestoría**: Tabla integral con filtros por estatus, buscador, métricas de trámites asignados al gestor vs liberados, y exportación a CSV/Excel.
3. **Gestión de Índices Notariales del Protocolo por Volumen**: Subsección organizada en Cards por volumen con semáforo de foliado completo vs pendiente, detalle para capturar/actualizar páginas inicial y final de cada instrumento, y reporte imprimible oficial con cabecera notarial, detalle de comparecientes con rol, estatus de validez y certificación de cierre de volumen para firma del Notario Titular.

---

## Technical Context

**Language/Version**: TypeScript 5+ / Vue 3.5 / Nuxt 3.16  
**Primary Dependencies**: Vuetify 3 (componentes UI), Nuxt Supabase (`@nuxtjs/supabase`), Pinia  
**Storage**: Supabase Postgres (lecturas agregadas y mutación de `pagina_inicial` y `pagina_final` en `public.escrituras`)  
**Testing**: Vitest + Vue Test Utils + happy-dom  
**Target Platform**: Navegadores modernos desktop (Chrome, Safari macOS, Edge) + CSS `@media print` para exportación N veces a PDF/papel  
**Project Type**: Aplicación Web Nuxt 3 (SSR/SPA híbrido)  
**Performance Goals**: Carga de agregaciones y cálculo de KPIs en < 500ms; renderizado reactivo de gráficas nativas SVG sin parpadeo  
**Constraints**: Respetar contratos de pestañas preexistentes (§3 Constitución Notarial); no utilizar librerías de canvas pesadas que rompan en Vitest  
**Scale/Scope**: ~10k escrituras/año, decenas de volúmenes, cientos de comparecientes  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **§1 Visión Notarial**: La escritura sigue siendo el eje central; el reporte consolida y transparenta la vida de los instrumentos del protocolo.
- ✅ **§2 Stack Tecnológico**: Uso estricto de Vue 3, Nuxt 3, Vuetify y Supabase; sin añadir dependencias no autorizadas.
- ✅ **§3 Principio de Pestañas Autónomas por Contrato**: `/reportes` es una vista global independiente; no modifica los contratos ni componentes de `app/components/escrituras/tabs/`.
- ✅ **§4 Seguridad y RLS**: Acceso general protegido por `reportes:ver_operativos`; datos contables restringidos por `reportes:ver_financieros`.
- ✅ **§7 Testing y Cero Regresiones**: Suite completa de pruebas unitarias debe mantenerse al 100% (377+ tests).
- ✅ **§8 Prototipado y Diseño (Stitch MCP)**: Las pantallas y visuales del dashboard e índices se alinean a la paleta institucional notarial (`#1B3A5F`, `#A9762E`).

---

## Project Structure

### Documentation (this feature)

```text
specs/13-reportes/
├── spec.md              # Especificación funcional y de negocio
├── plan.md              # Este plan de implementación
├── research.md          # Investigación técnica y decisiones de diseño
├── data-model.md        # Modelos de datos y DTOs TypeScript
├── quickstart.md        # Guía de verificación paso a paso
├── contracts/           # Contratos de interfaces y servicios
│   └── reportes-interface.md
└── tasks.md             # Tareas ejecutables (generado por /speckit-tasks)
```

### Source Code

```text
app/
├── types/
│   └── reportes.ts                                        # Tipos y contratos TypeScript
├── composables/
│   └── useReportesNotariales.ts                           # Agregaciones, consultas, foliado y exportación
├── components/
│   └── reportes/
│       ├── ReportesKpisBar.vue                            # Tarjetas de resumen del mes
│       ├── ReportesGraficaRedactores.vue                  # Gráfica SVG de carga por redactor
│       ├── ReportesGraficaActosTop.vue                    # Gráfica SVG de dona Top 5 actos
│       ├── ReporteGeneralEscriturasTable.vue              # Tabla general con métricas de gestoría
│       ├── indices/
│       │   ├── VolumenesCardsGrid.vue                     # Cuadrícula de Cards de volúmenes con semáforo
│       │   ├── VolumenDetalleFoliadoModal.vue             # Modal/tabla para capturar páginas inicial y final
│       │   └── ReporteIndiceVolumenImprimible.vue         # Plantilla oficial imprimible con certificación
└── pages/
    └── reportes/
        └── index.vue                                      # Vista principal con navegación por pestañas

tests/unit/
├── composables/
│   └── useReportesNotariales.spec.ts                      # Pruebas del composable y cálculos
├── components/
│   └── reportes/
│       ├── ReportesKpisBar.spec.ts                        # Pruebas de tarjetas de KPIs
│       ├── ReportesGraficas.spec.ts                       # Pruebas de gráficas SVG
│       ├── ReporteGeneralEscriturasTable.spec.ts          # Pruebas de tabla general y filtros
│       └── indices/
│           ├── VolumenesCardsGrid.spec.ts                 # Pruebas de cards de volumen y semáforo
│           ├── VolumenDetalleFoliadoModal.spec.ts         # Pruebas de edición de folios
│           └── ReporteIndiceVolumenImprimible.spec.ts     # Pruebas de reporte imprimible y certificación
└── pages/
    └── reportes/
        └── index.spec.ts                                  # Pruebas de la página principal
```

---

## Planned Phases & Implementation Strategy

### Phase 2: Stitch UI Design (§8 Constitución Notarial)
- Generar o verificar wireframes de:
  1. Dashboard Ejecutivo con gráficos sobrios y tarjetas de KPIs.
  2. Grid de Cards de Volúmenes con badges de estado de foliado.
  3. Reporte de Índice Notarial Imprimible en formato canónico de protocolo.

### Phase 3: Base de Datos, Tipos y Composable
- Crear `app/types/reportes.ts` con todos los DTOs.
- Implementar `app/composables/useReportesNotariales.ts` conectando consultas agregadas a Supabase (`escrituras`, `profiles`, `actos_juridicos`, `tramites`, `comparecientes`).
- Implementar métodos de exportación a CSV con codificación UTF-8.

### Phase 4: Dashboard Ejecutivo del Mes (User Story 1 - MVP)
- Construir `ReportesKpisBar.vue` (4 tarjetas con comparativa del mes).
- Construir `ReportesGraficaRedactores.vue` (barras SVG reactivas con balance de carga).
- Construir `ReportesGraficaActosTop.vue` (gráfico de dona SVG interactivo con leyenda y porcentajes).

### Phase 5: Reporte General de Escrituras y Gestoría (User Story 2)
- Construir `ReporteGeneralEscriturasTable.vue` con filtros de estatus (`firmadas`, `en_tramite`, `canceladas`), buscador y conteo de trámites asignados vs liberados.
- Conectar acción de exportación a CSV.

### Phase 6: Índices Notariales del Protocolo por Volumen (User Story 3)
- Construir `VolumenesCardsGrid.vue` con tarjetas de volumen, rango de instrumentos y badge de semáforo de foliado.
- Construir `VolumenDetalleFoliadoModal.vue` para captura rápida y validación de `pagina_inicial` y `pagina_final`.
- Construir `ReporteIndiceVolumenImprimible.vue` con encabezado oficial, formato tabular de protocolo, comparecientes con rol, estatus de validez y certificación notarial de cierre de volumen para firma.

### Phase 7: Integración en Página Principal y Navegación
- Construir `app/pages/reportes/index.vue` integrando pestañas (*Dashboard*, *Escrituras*, *Índices por Volumen*, *Finanzas*).
- Verificar enlace en `useNavItems.ts` y protección de rutas.

### Phase 8: Verificación Completa y Cero Regresiones
- Desarrollar suite de pruebas unitarias en `tests/unit/components/reportes/`.
- Ejecutar `npm test` verificando que los 377+ tests previos más las nuevas pruebas pasen al 100%.
