# Implementation Plan: 07-tramites (Trámites Notariales, Dependencias y Tarjetas de Gestoría)

**Branch**: `07-tramites` | **Date**: 2026-09-16 | **Spec**: [specs/07-tramites/spec.md](spec.md)

**Input**: Requerimientos del módulo de Trámites Notariales conforme a la Constitución del Sistema (§1, §3, §4, §7, §8), maqueta Stitch `bcd2e7c2f8d64eba94af5ad90d70111b` (Tarjetas a dos columnas con acordeón inline desplegable y modal compacto) y aclaraciones resueltas de bitácora histórica repetible.

---

## Summary

Implementación integral de la gestión de trámites y ventanilla notarial mediante **Tarjetas estructuradas por Dependencia de Gobierno a dos columnas** (columna izquierda: nombre oficial y último paso alcanzado; columna derecha: botones de acción para agregar paso con menú filtrado y botón de historial completo con acordeón inline desplegable). El modelo de datos en `tramite_pasos_escritura` opera como una bitácora cronológica repetible (permitiendo sucesivos ingresos, rechazos y pagos de derechos), despliegue bajo demanda con botón superior `+ Iniciar Gestión en Dependencia`, enlace fluido a órdenes de pago (módulo 08), catálogo administrable en `/administracion-general/tramites-pasos`, y mantenimiento del gate de protocolización estricto ante trámites previos pendientes.

---

## Technical Context

**Language/Version**: TypeScript 5+ / Node.js 20+ / SQL (PostgreSQL 15+ PL/pgSQL)  
**Primary Dependencies**: Nuxt 3, Vue 3, Vuetify 3, Supabase JS Client, Pinia, Lucide / MDI Icons  
**Storage**: PostgreSQL (tablas `cat_dependencias_oficiales`, `cat_pasos_tramite`, `tramite_pasos_escritura`, `tramites_escritura`, `tramite_prevenciones`, vistas agregadas) + Supabase Storage (`expedientes` bucket)  
**Testing**: Vitest + Happy DOM + Vue Test Utils (`npm test`)  
**Target Platform**: Navegador web moderno (Desktop / Tablet)  
**Project Type**: Web application (Nuxt 3 SPA / SSR) + Supabase Backend  
**Performance Goals**: Carga y renderizado de tarjetas en < 150 ms; filtrado de pasos por dependencia instantáneo en cliente; 0 lag al expandir acordeones  
**Constraints**: Diseño a dos columnas por tarjeta conforme a Stitch Screen ID `bcd2e7c2f8d64eba94af5ad90d70111b`; menú de pasos filtrado por autoridad; bitácora repetible en BD; cero regresiones en la suite de 210 tests  
**Scale/Scope**: Catálogo con 6 dependencias base y 17 pasos configurables; histórico de decenas de movimientos por escritura  

---

## Constitution Check

*GATE: Evaluado contra la Constitución del Sistema de Administración Notarial v1.3.0*

1. **§1. Escritura Pública como Entidad Raíz**:  
   - ✅ `tramite_pasos_escritura` y `tramites_escritura` se anclan directamente a `escritura_id` con `ON DELETE CASCADE`. La pestaña de trámites vive dentro de `/escrituras/[id]`.
2. **§2. Stack Tecnológico**:  
   - ✅ Vue 3 + Nuxt 3 + Vuetify en frontend; Supabase (Postgres, RLS, Storage) en backend; Vitest para testing.
3. **§7. Auditoría y Trazabilidad**:  
   - ✅ Cada paso histórico registra `completado_por` (FK a `profiles(id)`), `fecha_registro`, `created_at` y `updated_at`.
4. **§8. Diseño Visual Obligatorio con Stitch (MCP)**:  
   - ✅ Pantalla generada en proyecto Stitch `2333330112401314472`:
     - **Screen ID**: `bcd2e7c2f8d64eba94af5ad90d70111b` (Tarjetas por Dependencia a dos columnas con acordeón inline y modal compacto superpuesto).
     - **Screen ID previa**: `7af07297dc544b15bcd8f922ae5109f8` (Tablero global de trámites).
     - Paleta notarial oficial: Primario `#1B3A5F`, Acento Sello `#A9762E`, Éxito `#2F6F4E`, Rechazo/Peligro `#B23A34`, Fondo Papel `#F0F2F4`.
5. **Regla del Usuario (Gate de Protocolización)**:  
   - ✅ `fn_validar_protocolizacion` bloquea si existen trámites en fase `previo` pendientes; si la escritura no tiene trámites previos (porque el acto notarial no los genera), no genera ningún bloqueo.

---

## Project Structure

### Documentation (this feature)

```text
specs/07-tramites/
├── spec.md              # Requerimientos funcionales, clarificaciones y criterios de aceptación
├── plan.md              # Este plan de implementación
├── research.md          # Investigación de arquitectura, decisiones y justificaciones
├── data-model.md        # Modelo de BD, bitácora histórica y vistas agregadas
├── contracts/
│   └── tramites-interface.md # Tipos TypeScript y contratos de componentes y composables
├── quickstart.md        # Guía de validación y escenarios de prueba
└── checklists/
    └── requirements.md  # Checklist de calidad de la especificación
```

### Source Code (repository root)

```text
supabase/migrations/
├── 20260802000000_tramites_notariales.sql           # Tablas base, triggers de plazos, vista y gate J
├── 20260803000000_ordenes_pago.sql                  # Órdenes de pago de derechos a terceros
└── 20260804000000_pasos_tramites_y_dependencias.sql # Catálogo de 17 pasos, dependencias y bitácora repetible

app/
├── types/
│   └── tramites.ts                                  # Tipos TypeScript: PasoTramite, HistorialPasoEscritura, DependenciaTramiteCard
├── composables/
│   └── useTramites.ts                               # Composable: carga de tarjetas, historial, menú filtrado y alta de pasos
├── components/
│   ├── tramites/
│   │   ├── TramitesDependenciasCards.vue            # Componente contenedor de tarjetas a 2 columnas con acordeón inline
│   │   ├── TramitePasoModal.vue                     # Modal compacto para registrar paso con fecha, folio, notas y O.P.
│   │   ├── TramiteNuevaDependenciaModal.vue         # Modal para iniciar gestión en nueva dependencia
│   │   ├── TramitesTimeline.vue                     # Pipeline de fases procesales
│   │   ├── TramiteFormModal.vue                     # Modal de alta/edición de trámite general
│   │   └── TramitePrevencionModal.vue               # Modal de registro/subsanación de prevenciones
│   └── escrituras/
│       └── tabs/
│           └── TramitesTab.vue                      # Pestaña canónica en detalle de escritura (integra tarjetas y modales)
└── pages/
    ├── escrituras/
    │   └── [id].vue                                 # Montaje de TramitesTab
    └── tramites/
        └── index.vue                                # Tablero consolidado notarial

tests/unit/
└── components/
    └── tramites/
        ├── tramites.spec.ts                         # Tests del composable useTramites y lógica de tarjetas
        └── TramitesTab.spec.ts                      # Tests de UI de TramitesTab y TramitesDependenciasCards
```

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Ninguna | N/A | La arquitectura se apega 100% a la Constitución del Sistema Notarial y requerimientos del usuario. |
