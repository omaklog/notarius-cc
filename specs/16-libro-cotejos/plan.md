# Implementation Plan: 16-libro-cotejos (Libro de Cotejos y Certificaciones Fuera de Protocolo)

**Branch**: `16-libro-cotejos` | **Date**: 2026-09-25 | **Spec**: [specs/16-libro-cotejos/spec.md](spec.md)

**Input**: Feature specification from `specs/16-libro-cotejos/spec.md`

---

## Summary

Implementar el módulo del **Libro de Cotejos y Certificaciones de Documentos Fuera de Protocolo** conforme a la Ley del Notariado en México. Incluye:
1. Gestión de tomos/libros con numeración atómica correlativa de actas en PostgreSQL (`fn_registrar_acta_cotejo`), evitando colisiones o duplicidades ante concurrencia.
2. Captura ágil de solicitantes, documentos originales exhibidos, fojas y tantos expedidos con validación Yup/VeeValidate.
3. Emisión e impresión de la **Razón Notarial de Cotejo** (en hoja suelta y en etiqueta certificada al calce), consumiendo dinámicamente membrete, titular, lema, logotipo y facsímil del Sello de Autorizar desde [`useConfiguracionNotarial.ts`](file:///Users/cosmic-chimps/IdeaProjects/pruebas%20de%20concepto/notarius-cc/app/composables/useConfiguracionNotarial.ts).
4. Resguardo de digitalizaciones de documentos originales y copias certificadas en el bucket privado `cotejos-documentos` de Supabase Storage.
5. Bitácora de cancelación justificada y emisión de actas solemnes de clausura de libros al agotar su capacidad.
6. Integración en el menú lateral principal en el grupo *Operación* (`/cotejos`) con diseño institucional Stitch Notarial (`#1B3A5F`, `#A9762E`).

---

## Technical Context

- **Language/Version**: TypeScript 5.x / Vue 3 (Composition API `<script setup lang="ts">`) / Nuxt 3.
- **Primary Dependencies**: Vuetify 3 (paleta Stitch Notarial), Supabase Client (`@nuxtjs/supabase`), Yup + VeeValidate.
- **Storage**: PostgreSQL (tablas `libros_cotejo`, `actas_cotejo`, función atómica `fn_registrar_acta_cotejo`) + Supabase Storage (bucket `cotejos-documentos`).
- **Testing**: Vitest + `@vue/test-utils` (cobertura completa de composable, navegación y componentes UI).
- **Target Platform**: Aplicación web responsiva para despacho notarial (desktop y tablet).
- **Project Type**: Web Application (Nuxt 3 SSR/SPA).
- **Performance Goals**: Registro atómico de acta < 500ms; generación de razón imprimible < 100ms.
- **Constraints**: 0 regresiones en la suite global de pruebas (los 445 tests existentes deben mantenerse al 100% en verde).
- **Scale/Scope**: 2 tablas relacionales, 1 función almacenada, 1 bucket de storage, 5 permisos de catálogo, 1 composable central, 1 vista principal con 5 componentes modales/imprimibles y 1 integración en navegación.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **§1 Visión general**: Cumple. Los cotejos y certificaciones fuera de protocolo complementan la actividad notarial ordinaria salvaguardando la fe pública y el control documental.
- **§2 Stack tecnológico**: Cumple. Utiliza Vue 3 + Nuxt 3 + Vuetify + Supabase + Vitest sin librerías ajenas al stack autorizado.
- **§7 Convenciones generales**: Cumple. Trazabilidad completa de auditoría (`created_by`, `updated_at`, `motivo_cancelacion`, `cerrado_por`), asignación de permisos dinámicos en el catálogo (`cotejos:ver`, `cotejos:crear`, `cotejos:autorizar`, `cotejos:cancelar`, `cotejos:cerrar_libro`).
- **§8 Diseño con Stitch**: Cumple. Pantalla generada en Stitch (ID `693e604aa4bf44f3975cea3867eb0e5c`, proyecto `2333330112401314472`), paleta oficial (`#1B3A5F`, `#A9762E`, fondos `#F0F2F4`, `#FFFFFF`) con botones de alto contraste (`class="text-white"` sobre azul primario).

---

## Project Structure

### Documentation (this feature)

```text
specs/16-libro-cotejos/
├── plan.md              # Este plan de implementación
├── research.md          # Decisiones de concurrencia, storage y fórmulas legales
├── data-model.md        # Esquema PostgreSQL, función atómica, storage y DTOs TypeScript
├── quickstart.md        # Guía de validación paso a paso de los 4 escenarios
├── contracts/           # Contratos de composable y vistas
│   └── cotejos-interface.md
└── checklists/
    └── requirements.md  # Checklist de calidad de especificación (PASS 16/16)
```

### Source Code (repository root)

```text
app/
├── types/
│   └── cotejos.ts                              # DTOs e interfaces TypeScript para libros y actas
├── composables/
│   ├── useCotejos.ts                           # Composable central del libro de cotejos
│   └── useNavItems.ts                          # Integración de '/cotejos' en grupo Operación
├── pages/
│   └── cotejos/
│       └── index.vue                           # Vista principal del Libro de Cotejos (Stitch UI)
├── components/
│   └── cotejos/
│       ├── CotejoRegistroModal.vue             # Modal de captura ágil de acta con validación
│       ├── CotejoDetalleModal.vue              # Modal con visor de detalles y evidencias en Storage
│       ├── CotejoRazonImprimible.vue           # Componente imprimible de Razón Notarial y Etiqueta
│       ├── LibroCierreModal.vue                # Modal de cierre formal y acta de clausura de tomo
│       └── LibroAperturaModal.vue              # Modal de apertura de nuevo libro de cotejos
supabase/
└── migrations/
    └── 20260816000000_libro_cotejos.sql        # Tablas, función atómica, bucket, RLS y permisos
tests/
└── unit/
    ├── composables/
    │   ├── useCotejos.spec.ts                  # Pruebas unitarias del composable
    │   └── useNavItems.spec.ts                 # Actualización de prueba de navegación (11 módulos)
    └── pages/
        └── cotejos/
            └── index.spec.ts                   # Pruebas unitarias de la vista principal y componentes
```

---

## Plan Phases

- **Phase 1: Setup & Data Layer**:
  - Definir `app/types/cotejos.ts`.
  - Crear la migración SQL `supabase/migrations/20260816000000_libro_cotejos.sql` con `libros_cotejo`, `actas_cotejo`, `fn_registrar_acta_cotejo`, bucket `cotejos-documentos`, políticas RLS y permisos del catálogo.
  - Aplicar la migración en Supabase local (`npx supabase migration up`) y recargar esquema.

- **Phase 2: Composable Central (`useCotejos.ts`)**:
  - Implementar métodos de carga reactiva de libros y actas con filtros.
  - Implementar llamada RPC a `fn_registrar_acta_cotejo`.
  - Implementar cancelación de actas y cierre de libros con acta de clausura.
  - Implementar subida y descarga de archivos en `cotejos-documentos`.
  - Implementar fórmulas canónicas de Razón Notarial de Cotejo y Acta de Clausura consumiendo `useConfiguracionNotarial.ts`.
  - Crear y ejecutar suite de pruebas unitarias `tests/unit/composables/useCotejos.spec.ts`.

- **Phase 3: Componentes UI Stitch Notarial**:
  - Implementar `CotejoRegistroModal.vue` con validación Yup/VeeValidate.
  - Implementar `CotejoRazonImprimible.vue` con selector de Hoja Carta / Etiqueta Adhesiva y estilos `@media print`.
  - Implementar `CotejoDetalleModal.vue` para consulta y carga de evidencias en Storage.
  - Implementar `LibroCierreModal.vue` y `LibroAperturaModal.vue`.
  - Implementar la página principal `app/pages/cotejos/index.vue` replicando fielmente la maqueta Stitch.

- **Phase 4: Integración en Menú y Catálogo de Permisos**:
  - Añadir la entrada "Libro de Cotejos" en el grupo *Operación* de `useNavItems.ts`.
  - Actualizar `tests/unit/composables/useNavItems.spec.ts` para verificar los 11 módulos.

- **Phase 5: Verificación Integral y Cero Regresiones**:
  - Crear `tests/unit/pages/cotejos/index.spec.ts`.
  - Ejecutar la suite global de pruebas (`npm test`) garantizando el 100% de tests en verde sin regresiones.
