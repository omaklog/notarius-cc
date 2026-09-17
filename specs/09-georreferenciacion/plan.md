# Implementation Plan: Feature 09 — Georreferenciación de Predios e Inmuebles Notariales

## 1. Arquitectura Técnica

- **Base de Datos**: PostgreSQL + Supabase con tabla `public.predios`.
- **Integración GIS en Frontend**:
  - `leaflet` y `@types/leaflet`.
  - Componente `PredioMapaLeaflet.vue` renderizado únicamente en cliente mediante `<ClientOnly>`.
  - Capas: OpenStreetMap estándar y ESRI World Imagery (satelital de alta resolución).
  - Geocodificación: OpenStreetMap Nominatim con filtrado de país (`countrycodes=mx`).
- **Cálculos Geodésicos**:
  - Utilidad matemática `app/utils/geometriaUtils.ts` para cálculo de área esférica (fórmula WGS84 en $m^2$) y distancias Haversine por tramo.
- **Expediente Digital**:
  - Sube imágenes de fachada al bucket `expedientes` bajo `escrituras/{escrituraId}/fachada_{predioId}_{timestamp}.jpg`.
  - Vinculación con `expediente_documentos`.

## 2. Fases de Ejecución

1. **Fase 1: Infraestructura y Base de Datos**:
   - Migración `20260809000000_predios_georreferenciacion.sql`.
   - Ajuste de `fn_validar_protocolizacion` para verificar predios en traslativos.
2. **Fase 2: Dependencias y Utilidades Geométricas**:
   - Instalación de `leaflet` y `@types/leaflet`.
   - Implementación de `app/utils/geometriaUtils.ts`.
   - Pruebas unitarias de cálculo de área y distancias.
3. **Fase 3: Capa de Datos y Composable**:
   - `app/types/predios.ts`.
   - `app/composables/usePredios.ts`.
   - Pruebas unitarias de composable.
4. **Fase 4: Componentes de UI**:
   - `PredioMapaLeaflet.vue` (mapa, capas OSM/satélite, buscador y trazo manual).
   - `PredioColindanciasForm.vue` (orientaciones, distancias y texto libre).
   - `PredioFachadaUpload.vue` (subida de foto e integración a expediente).
   - `GeorreferenciacionTab.vue` (gestión de múltiples predios / lotes).
5. **Fase 5: Integración en el Hub y Verificación**:
   - Conexión en `app/pages/escrituras/[id].vue`.
   - Pruebas unitarias completas de componentes.
   - Ejecución de `npm test` asegurando 100% pasando.
