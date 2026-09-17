# Implementation Plan: 04-comparecientes (Catálogo Global de Comparecientes y Fiscalización Notarial)

**Branch**: `04-comparecientes` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/04-comparecientes/spec.md`

---

## Summary

Evolución de la tabla `public.comparecientes` desde el *stub* previo hacia un **Catálogo Global Notarial y Módulo de Fiscalización (KYC)**. Separa estructuralmente Personas Físicas (RFC con homoclave, CURP, estado conyugal, régimen patrimonial forzoso en matrimonio, nacionalidad, ocupación, domicilio completo desagregado e identificación oficial) de Personas Morales (razón social, RFC, fecha e instrumento de constitución, folio mercantil, objeto social, apoderados facultados y beneficiarios controladores conforme al Art. 32-B Quater del CFF).

Provee un directorio general en `/comparecientes`, una ficha histórica 360° en `/comparecientes/:id` (con todas las escrituras en las que ha intervenido), y un modal/drawer de búsqueda predictiva y captura ágil reutilizable directamente dentro de la pestaña de comparecientes en `escrituras/[id]`.

---

## Technical Context

**Language/Version**: TypeScript + Vue 3.5 (Composition API) sobre Nuxt 4.5 (frontend); SQL + plpgsql sobre PostgreSQL 17 (backend Supabase).

**Primary Dependencies**:
- Frontend: `@nuxtjs/supabase`, `vee-validate`, `yup` (validaciones algorítmicas de RFC y CURP), Vuetify 3 (UI y componentes institucionales), Pinia.
- Server / Backend: Nuxt Server Engine (`server/api/`) con endpoint `/api/ocr/identificacion` consumiendo Gemini Vision API (visión multimodal para extracción estructurada JSON).
- Prototipado y Diseño UI: Stitch (MCP) para la estructura visual y ergonomía de captura conforme al mandato de la Constitución §8.
- Backend: Supabase Auth + RLS por rol (`comparecientes.ver`, `crear`, `editar`, `eliminar`, `administracion.acceso`) y funciones `security definer`.

**Storage**:
- Evolución de `public.comparecientes` (tabla base unificada mediante `ALTER TABLE`, sin romper referencias históricas de `escritura_comparecientes`).
- Nuevas tablas relacionales:
  - `public.compareciente_personas_fisicas` (1:1 PK `compareciente_id`)
  - `public.compareciente_personas_morales` (1:1 PK `compareciente_id`)
  - `public.compareciente_representantes` (apoderados y facultades)
  - `public.compareciente_beneficiarios_controladores` (Art. 32-B Quater CFF)
  - `public.tipos_identificacion_oficial` (catálogo administrable con flags `permite_ocr` y `requiere_reverso`, seeder con INE, Pasaporte, etc.)
  - `public.regimenes_patrimoniales` (catálogo base: Sociedad Conyugal, Separación de Bienes, Sociedad Legal)
  - `public.expediente_documentos` (entidad documental unificada para archivos físicos en Supabase Storage: `comparecientes/:id/identificaciones/...`)
  - `public.v_expediente_escritura` (vista SQL dinámica que proyecta en tiempo real las identificaciones en las escrituras sin duplicar archivos)
- Supabase Storage Bucket: `expedientes_comparecientes` (archivos protegidos con RLS por rol).

**Testing**:
- Vitest + Vue Test Utils para componentes y validaciones algorítmicas de RFC/CURP (`tests/unit/components/comparecientes/`, `tests/unit/pages/comparecientes/`).
- Escenarios integrales de validación manual documentados en `quickstart.md`.

**Target Platform**: Navegador Web institucional (Desktop first, pantallas de 13" en adelante para notarías) + Supabase en Docker local.

**Project Type**: Aplicación web unificada Nuxt (`app/`) + migraciones (`supabase/migrations/`).

**Performance Goals**: Búsqueda predictiva con autocompletado en menos de 200ms sobre el catálogo global mediante índices btree en `rfc`, `curp` y trigram (`pg_trgm`) en `nombre` y `razon_social`.

**Constraints**:
- RFC y CURP deben validarse formalmente antes de guardar (dígitos verificadores y homoclave).
- Ningún compareciente con escrituras asociadas puede ser eliminado físicamente (`ON DELETE RESTRICT`).
- Los roles de compareciente en una escritura deben pertenecer obligatoriamente a los roles permitidos por el acto jurídico (`acto_juridico_roles`).
- Toda pantalla o componente nuevo DEBE diseñarse previamente con Stitch (MCP) per Constitución §8.

---

## Constitution Check

Evaluado contra `.specify/memory/constitution.md` v1.3.0:

| Principio / Mandato de la Constitución | Aplica | Estado | Justificación / Notas |
|---|---|---|---|
| §1/§3: Escritura Pública como entidad raíz | Sí | ✅ Pass | Comparecientes soporta la raíz y su historial se indexa por escritura. |
| §2: Stack: Vue 3 + Nuxt 3 + Vuetify + Yup + VeeValidate | Sí | ✅ Pass | Mismo stack oficial. |
| §2: Stitch (MCP) para prototipado UI | Sí | ✅ Pass | Se generan y validan las pantallas antes de codificar vistas Vue. |
| §5: Cumplimiento PLD/UIF (LFPIORPI) | Sí | ✅ Pass | Esta especificación prepara la estructura exacta de datos requerida para el screening y KYC de la LFPIORPI. |
| §7: Auditoría y trazabilidad | Sí | ✅ Pass | Toda alta o modificación de compareciente se registra en `audit_log`. |
| §7: RLS y permisos dinámicos | Sí | ✅ Pass | Respeta `fn_has_permiso('comparecientes', accion, escritura_id)`. |
| §7: Sin i18n / solo es-MX | Sí | ✅ Pass | Toda la interfaz y datos fiscales en español (México). |
| §7: Regla del color bronce (`#A9762E`) | Sí | ✅ Pass | Solo reservado al estatus de verificación/sello notarial. |
| §8: Diseño previo obligatorio con Stitch | Sí | ✅ Pass | Se incorpora como paso previo obligatorio en las tareas de frontend. |

---

## Project Structure

### Documentation (this feature)

```text
specs/04-comparecientes/
├── spec.md              # Requerimientos e historias de usuario
├── plan.md              # Este plan de implementación
├── research.md          # Decisiones técnicas y estándares fiscales
├── data-model.md        # Esquema relacional y DDL
├── quickstart.md        # Guía de verificación manual paso a paso
├── contracts/
│   └── comparecientes-contract.md  # Contrato de datos y APIs RPC
└── tasks.md             # Desglose de tareas ordenadas
```

### Source Code

```text
supabase/
├── migrations/
│   ├── 20260729000000_comparecientes_fiscalizacion.sql
│   └── 20260729000001_expediente_documentos_and_ocr_catalog.sql
└── seed.sql             # Catálogos de identificaciones con flags OCR y seed demo

server/
└── api/
    └── ocr/
        └── identificacion.post.ts  # Endpoint Nuxt multimodal para lectura de INE y Pasaporte

app/
├── components/
│   ├── comparecientes/
│   │   ├── ComparecienteFisicaForm.vue
│   │   ├── ComparecienteMoralForm.vue
│   │   ├── ComparecienteSearchDialog.vue
│   │   ├── IdentificacionOcrAssistant.vue  # Asistente de carga frontal/reverso y pre-llenado OCR
│   │   ├── RepresentantesSection.vue
│   │   └── BeneficiariosControladoresSection.vue
│   └── escrituras/
│       └── tabs/
│           └── ComparecientesTab.vue (refactorizado para usar el buscador global)
├── pages/
│   ├── comparecientes/
│   │   ├── index.vue     # Directorio global de clientes
│   │   └── [id].vue      # Ficha histórica 360°
│   └── administracion-general/
│       └── tipos-identificacion/
│           └── index.vue # Panel de administración de tipos de identificación y flags OCR
├── composables/
│   ├── useRfcValidator.ts
│   └── useCurpValidator.ts
```
