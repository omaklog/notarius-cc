# Implementation Plan: 06-expedientes (Expedientes Digitales Notariales, Requisitos por Acto y Cotejo Notarial)

**Branch**: `06-expedientes` | **Date**: 2026-09-15 | **Spec**: [specs/06-expedientes/spec.md](spec.md)

**Input**: Feature specification from `specs/06-expedientes/spec.md`

---

## Summary

Implementar el módulo de Expedientes Digitales Notariales para gestionar de manera integral la custodia, clasificación y fe de cotejo notarial de los documentos requeridos por cada acto jurídico de una escritura. Incluye:
1. Catálogo maestro de tipos documentales y matriz de requisitos por acto (`cat_tipos_documento_notarial`, `acto_juridico_requisitos_documentales`).
2. Ampliación del repositorio documental (`expediente_documentos`) con fe de cotejo notarial contra original exhibido (`cotejado_contra_original`, `tipo_documento_exhibido`, `cotejado_por`, `fecha_cotejo`, `notas_cotejo`).
3. Semáforo y evaluación dinámica de integración documental (`fn_evaluar_requisitos_expediente`).
4. Descarga selectiva en ZIP estructurado y compilación en PDF único con carátula e inventario foliado.
5. Bitácora y eventos de auditoría de descargas (`expediente_descargas_log`).
6. Integración del gate de protocolización (`fn_validar_protocolizacion`) con bloqueo ante faltantes y soporte para dispensa notarial fundada autorizada por Notario Titular (`expediente_dispensas_documentales`).
7. Componentes de interfaz en Vuetify basados en el diseño canónico de Stitch (`1346003097bb4754b378618af37aff59`).

---

## Technical Context

**Language/Version**: TypeScript 5+ (ESNext), SQL (PostgreSQL 15 / Supabase).

**Primary Dependencies**: Nuxt 3, Vue 3, Vuetify 4, Pinia 4, Supabase Client (`@nuxtjs/supabase`), JSZip (para empaquetado ZIP client-side) / PDF generator.

**Storage**: Supabase Storage privado (bucket `expedientes`) con URLs firmadas temporales (expiración 60 segundos), PostgreSQL con RLS y vistas dinámicas.

**Testing**: Vitest 4 + Vue Test Utils (pruebas unitarias para composable, store, validaciones de expedientes y gate de protocolización).

**Target Platform**: Navegador web moderno (Desktop / Responsive), Docker Supabase local.

**Project Type**: Aplicación web SPA/SSR (Nuxt 3) con backend Serverless/Postgres (Supabase).

**Performance Goals**:
- Evaluación de requisitos del expediente y cálculo de semáforo en < 150 ms.
- Previsualización de documentos en visor integrado en < 2 segundos mediante URL firmada.
- Generación de descarga ZIP o compilación de PDF en cliente sin bloquear la UI.

**Constraints**:
- Cumplimiento de la Constitución del sistema (§5 conservación por 10 años, §7 trazabilidad y RBAC, §8 diseño previo canónico en Stitch).
- Proyección sin duplicidad de identificaciones KYC de comparecientes desde el módulo 04.
- Cero regresiones: mantener los 137 tests existentes de Vitest en verde.

**Scale/Scope**: Expedientes notariales de hasta cientos de fojas por escritura, soportando múltiples actos por instrumento.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **§1 Escritura Pública es Raíz**: Los expedientes y sus requisitos documentales están anclados a la escritura y sus actos jurídicos asociados.
- [x] **§2 Stack Tecnológico**: Cumple estrictamente: Vue 3 + Nuxt 3 + Vuetify + Supabase + Pinia + Vitest.
- [x] **§3 Modelo de Entidades**: El expediente y sus documentos digitalizados se relacionan directamente con `escrituras` y proyectan los comparecientes KYC.
- [x] **§5 Conservación y PLD**: Respeto al plazo mínimo de conservación de 10 años y vinculación con el expediente de debida diligencia.
- [x] **§7 Auditoría y RBAC**: La fe de cotejo, la autorización de dispensas y los eventos de descarga quedan inmutablemente sellados con usuario, fecha y rol.
- [x] **§8 Diseño de Pantallas con Stitch**: La maqueta visual fue previamente generada y validada en Stitch MCP (Pantalla `1346003097bb4754b378618af37aff59`, Proyecto `2333330112401314472`), respetando la paleta Notaría 42 (`#1B3A5F`, `#A9762E`, `#2F6F4E`, `#B23A34`, `#F0F2F4`).

---

## Project Structure

### Documentation (this feature)

```text
specs/06-expedientes/
├── spec.md              # Especificación funcional validada y aprobada
├── checklists/
│   └── requirements.md  # Checklist de calidad (100% completado)
├── research.md          # Fase 0: Decisiones de arquitectura y justificaciones
├── data-model.md        # Fase 1: Esquema de base de datos y RPCs
├── contracts/
│   └── expedientes-interface.md # Fase 1: Tipos TypeScript y firmas de RPCs
├── quickstart.md        # Fase 1: Guía de pruebas y verificación
├── plan.md              # Este archivo (Plan de implementación)
└── tasks.md             # Fase 2: Tareas de implementación (/speckit-tasks)
```

### Source Code Layout

```text
supabase/migrations/
└── 20260801000000_expedientes_digitales.sql # Migración con catálogos, cotejo, dispensas, descargas log y gate

app/
├── types/
│   └── expedientes.ts                       # Tipos del dominio e interfaces
├── composables/
│   ├── useExpedientes.ts                    # Composable para requisitos, semáforo, cotejo, dispensa y auditoría
│   └── useExpedienteDocumentos.ts           # Actualización con soporte de tipos y cotejo
├── utils/
│   ├── zipExpediente.ts                     # Utilería de empaquetado ZIP client-side
│   └── pdfExpediente.ts                     # Utilería de carátula e índice compilado en PDF
├── components/
│   └── expedientes/
│       ├── ExpedienteResumenCard.vue        # Semáforo, métricas y barra de herramientas
│       ├── ExpedienteChecklistRequisitos.vue# Matriz de requisitos por acto jurídico
│       ├── ExpedienteDocumentosTable.vue    # Tabla interactiva con selección múltiple e insignias de cotejo
│       ├── ExpedienteVisorModal.vue         # Visor integrado de PDF/imagen con datos de cotejo
│       ├── ExpedienteCotejoModal.vue        # Modal de fe notarial de cotejo de originales
│       └── ExpedienteDispensaModal.vue      # Modal de autorización de dispensa para Notario Titular
└── components/escrituras/tabs/
    └── ExpedienteTab.vue                    # Pestaña integrada renovada según maqueta de Stitch

test/unit/
└── expedientes.spec.ts                      # Pruebas unitarias de expedientes, cotejo, dispensas y validación
```

---

## Complexity Tracking

*No hay violaciones constitucionales que justifiquen desvíos o complejidades adicionales.*
