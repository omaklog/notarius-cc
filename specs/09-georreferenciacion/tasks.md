# Tasks: 09-georreferenciacion — Georreferenciación de Predios e Inmuebles Notariales

**Feature**: `09-georreferenciacion`  
**Date**: 2026-09-17  
**Status**: Completed

---

## Phase 1: Setup & Foundational (Dependencies & Utilities)

**Purpose**: Instalación de librerías GIS, tipos TypeScript y utilidades matemáticas de cálculo de superficie y distancias.

- [x] T001 [P] Instalar dependencias `leaflet` y `@types/leaflet` en `package.json`.
- [x] T002 [P] Definir tipos e interfaces TypeScript en `app/types/predios.ts`.
- [x] T003 [P] Implementar utilidades geodésicas (cálculo de área de polígono en $m^2$, distancias Haversine por tramo, centroide y orientación de rumbos) en `app/utils/geometriaUtils.ts`.
- [x] T004 [P] Crear pruebas unitarias para `geometriaUtils.ts` en `tests/unit/utils/geometriaUtils.spec.ts`.

---

## Phase 2: Database Schema & Gate de Protocolización

**Purpose**: Creación de tabla `public.predios`, índices, RLS y actualización de la Regla G en `fn_validar_protocolizacion`.

- [x] T005 Crear migración SQL `supabase/migrations/20260809000000_predios_georreferenciacion.sql` con tabla `public.predios`, trigger `fn_set_updated_at`, políticas RLS y regla G de validación de protocolización.
- [x] T006 Implementar composable reactivo `app/composables/usePredios.ts` con operaciones CRUD, selección de lote activo, guardado de polígono y subida de fotografía de fachada.
- [x] T007 [P] Crear pruebas unitarias para `usePredios.ts` en `tests/unit/composables/usePredios.spec.ts`.

---

## Phase 3: User Story 1 & 2 - Mapa Interactivo y Delimitación Poligonal

**Purpose**: Mapa Leaflet bajo ClientOnly con OpenStreetMap, vista satelital, buscador geográfico y trazo manual de vértices.

- [x] T008 [US1] Implementar componente de mapa `app/components/georreferenciacion/PredioMapaLeaflet.vue` con capas OSM y Satelital, buscador Nominatim y herramienta de trazo manual de polígonos.
- [x] T009 [US2] Implementar componente de formulario de colindancias orientadas `app/components/georreferenciacion/PredioColindanciasForm.vue` con selector de orientación (`Norte`, `Sur`, etc.), longitud calculada y texto libre.
- [x] T010 [US4] Implementar componente `app/components/georreferenciacion/PredioFachadaUpload.vue` para subir fotografía de fachada al bucket `expedientes`.
- [x] T011 [P] Crear pruebas unitarias para `PredioColindanciasForm.vue` en `tests/unit/components/georreferenciacion/PredioColindanciasForm.spec.ts`.

---

## Phase 4: User Story 5 & 6 - Gestión de Múltiples Predios y Tab Notarial

**Purpose**: Integración de pestaña `GeorreferenciacionTab.vue` con selector de lotes múltiples, cálculo de superficie aproximada y conexión con el Hub de Escrituras.

- [x] T012 [US5] Implementar componente `app/components/escrituras/tabs/GeorreferenciacionTab.vue` con selector de predios/lotes (subdivisiones), panel dividido mapa/datos, ficha técnica y emisión de `@status-change`.
- [x] T013 [US6] Montar `GeorreferenciacionTab.vue` en `app/pages/escrituras/[id].vue` reemplazando `<PlaceholderTab />` en la pestaña `georreferenciacion`.
- [x] T014 [P] Crear pruebas unitarias para `GeorreferenciacionTab.vue` en `tests/unit/components/escrituras/tabs/GeorreferenciacionTab.spec.ts`.

---

## Phase 5: Verification & Quality Gate

**Purpose**: Verificación global con Vitest, pruebas de regresión y sincronización de base de datos.

- [x] T015 Ejecutar suite completa `npm test` verificando que todas las suites pasen al 100%.
- [x] T016 Actualizar documentación y walkthrough con el nuevo módulo de georreferenciación.
