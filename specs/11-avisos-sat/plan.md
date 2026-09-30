# Implementation Plan: 11-avisos-sat (Avisos SAT / UIF - Prevención de Lavado de Dinero SPPLD)

**Branch**: `11-avisos-sat` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/11-avisos-sat/spec.md`

---

## Summary

Implementación integral del módulo de **Avisos SAT / UIF (Prevención de Lavado de Dinero - Portal SPPLD)** conforme al Artículo 17 Fracción XII de la LFPIORPI y los lineamientos de la Constitución Notarial (§5). Incluye:
- **Diagnóstico y Calificación Automática**: Cotejo del monto de operación contra el valor histórico de la UMA a la fecha del acto (`uma_historico`) para calificar si el instrumento está exento, sujeto a aviso ordinario o requiere aviso urgente de 24 horas por coincidencia en Lista de Personas Bloqueadas (LPB).
- **Generación de Layout XML Oficial**: Construcción y descarga del archivo XML validado contra el esquema XSD de la UIF/SAT para Fedatarios Públicos (Fracción XII).
- **Cédula de Aviso en PDF**: Generación y descarga de la Cédula Institucional de Cumplimiento PLD en PDF con membrete notarial para revisión física y expediente del instrumento.
- **Soporte Dual de Envío**: Generación individual por escritura desde el hub del instrumento y generación de un paquete mensual consolidado XML en el tablero central para carga masiva en el portal SPPLD.
- **Calendario y Vencimiento Inteligente**: Cálculo automático de la fecha límite (día 17 del mes inmediato posterior + días hábiles de prórroga conforme al sexto dígito numérico del RFC de la notaría).
- **Informe Mensual en Ceros**: Flujo formal para registrar el cumplimiento de los meses sin actos reportables con folio y PDF de acuse SAT.
- **Bitácora de Auditoría Inmutable**: Resguardo y trazabilidad de eventos por 10 años conforme a la LFPIORPI.
- **Componente de Pestaña e Integración Global**:
  - `AvisosTab.vue` reemplazando el último `<PlaceholderTab />` pendiente en [`app/pages/escrituras/[id].vue`](file:///Users/cosmic-chimps/IdeaProjects/pruebas%20de%20concepto/notarius-cc/app/pages/escrituras/%5Bid%5D.vue).
  - Tablero central de cumplimiento en [`app/pages/avisos-sat/index.vue`](file:///Users/cosmic-chimps/IdeaProjects/pruebas%20de%20concepto/notarius-cc/app/pages/avisos-sat/index.vue) basado en las maquetas Stitch (`33eab919508a412db6d2185e1259ae76` y `8ec51daf171b4998a25f2ed072a513ef`).

---

## Technical Context

**Language/Version**: TypeScript 5.x / Vue 3 / Nuxt 3 (SSR/SPA)  
**Primary Dependencies**: Vuetify 3 (UI), Pinia (estado), Supabase Client, jsPDF (generación de Cédula PDF), date-fns  
**Storage**: PostgreSQL (Supabase) con tablas `avisos_sat`, `avisos_sat_bitacora`, vista `v_avisos_sat_mensual`, y bucket `expedientes` para comprobantes y acuses oficiales del SAT  
**Testing**: Vitest + Vue Test Utils (`npm test`)  
**Target Platform**: Web moderna (Desktop First notarial, responsive)  
**Project Type**: Web application (Nuxt 3 + Supabase)  
**Performance Goals**: Evaluación de umbral y dictamen en frontend en < 50ms, generación de XML en < 500ms, generación de Cédula PDF en < 1.5s  
**Constraints**: Apego estricto a las maquetas Stitch `33eab919508a412db6d2185e1259ae76` y `8ec51daf171b4998a25f2ed072a513ef`; cumplimiento de reglas de prórroga por RFC según la RMF; cero regresiones en los 274 tests existentes  
**Scale/Scope**: Módulo integral con migración SQL, composables, generador XML, generador PDF, componentes de pestaña, modales, página global y suite de tests unitarios  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **§1 & §3 Entidad Raíz**: ✅ Los avisos ordinarios y de 24h dependen directamente de la escritura matriz (`escrituras.id`). Los informes en ceros se vinculan al periodo fiscal notarial con `escritura_id = NULL`.
- **§5 Marco Regulatorio LFPIORPI**: ✅ Cumplimiento integral del Art. 17 Fracción XII, plazos al día 17 del mes siguiente, aviso de 24 horas obligatorio por match en LPB, e informe en ceros cuando no se rebase el umbral.
- **§5 Conservación Documental de 10 Años**: ✅ Acuses del SAT y bitácora de auditoría inmutable registrados con usuario, marca de tiempo y comprobante digital en Supabase Storage.
- **§6 UMA Histórica**: ✅ Utiliza estrictamente la tabla `uma_historico` para evaluar el valor vigente en la fecha del acto, no la UMA del día de captura.
- **§7 Auditoría**: ✅ Tabla `avisos_sat_bitacora` con sellado de eventos (`creacion`, `generacion_xml`, `descarga_pdf`, `registro_acuse`, `ceros_declarado`).
- **§7 Roles y Permisos Dinámicos**: ✅ Permisos dinámicos en `cat_permisos` (`avisos_sat.ver`, `avisos_sat.crear`, `avisos_sat.generar_xml`, `avisos_sat.registrar_acuse`, `avisos_sat.ceros`).
- **§8 Diseño Previo con Stitch**: ✅ Diseños generados previamente en Stitch con tokens institucionales (`#1B3A5F`, `#A9762E`):
  - Screen ID `33eab919508a412db6d2185e1259ae76`: Pestaña `AvisosTab.vue` en Escrituras.
  - Screen ID `8ec51daf171b4998a25f2ed072a513ef`: Tablero central `/avisos-sat`.

---

## Project Structure

### Documentation (this feature)

```text
specs/11-avisos-sat/
├── plan.md              # Este plan de implementación
├── research.md          # Investigación legal y técnica LFPIORPI (Phase 0)
├── data-model.md        # Diagramas ER y tablas/vistas SQL (Phase 1)
├── quickstart.md        # Guía de verificación rápida de escenarios (Phase 1)
├── contracts/
│   └── avisos-sat-interface.md # Tipos TypeScript y contratos de composables (Phase 1)
├── checklists/
│   └── requirements.md  # Checklist de calidad validado
└── tasks.md             # Tareas ordenadas de implementación (Phase 2 - speckit-tasks)
```

### Source Code

```text
supabase/migrations/
└── 20260811000000_avisos_sat.sql

app/
├── types/
│   └── avisosSat.ts
├── composables/
│   ├── useAvisosSat.ts
│   └── useAvisosSatCalculos.ts
├── utils/
│   ├── xmlGeneradorAvisosSat.ts
│   └── pdfCedulaAvisoSat.ts
├── components/
│   ├── avisosSat/
│   │   ├── AvisosSatKpisBar.vue
│   │   ├── AvisosSatPeriodoBanner.vue
│   │   ├── AvisosSatOperacionesTable.vue
│   │   ├── AvisosSatAlerta24hCard.vue
│   │   ├── AvisosSatCedulaPreview.vue
│   │   └── modal/
│   │       ├── AvisosSatRegistrarAcuseModal.vue
│   │       ├── AvisosSatDeclararCerosModal.vue
│   │       └── AvisosSatXmlPreviewModal.vue
│   └── escrituras/
│       └── tabs/
│           └── AvisosTab.vue
└── pages/
    ├── avisos-sat/
    │   └── index.vue
    └── escrituras/
        └── [id].vue (reemplazo definitivo de PlaceholderTab en tab avisos)

tests/unit/
├── composables/
│   ├── useAvisosSatCalculos.spec.ts
│   └── useAvisosSat.spec.ts
├── utils/
│   ├── xmlGeneradorAvisosSat.spec.ts
│   └── pdfCedulaAvisoSat.spec.ts
└── components/
    ├── avisosSat/
    │   ├── AvisosSatOperacionesTable.spec.ts
    │   └── AvisosSatKpisBar.spec.ts
    └── escrituras/
        └── tabs/
            └── AvisosTab.spec.ts
```

---

## Testing Strategy & Quality Gates

1. **Pruebas Unitarias del Motor de Fechas y Prórroga (`useAvisosSatCalculos.spec.ts`)**:
   - Vencimiento base al día 17 del mes siguiente.
   - Ajuste por fin de semana (sábado/domingo trasladado al lunes).
   - Prórroga por sexto dígito de RFC (dígitos 1-0 con +1 a +5 días hábiles).
   - Semáforo de urgencia (verde, amarillo, rojo).
2. **Pruebas Unitarias de Generación XML (`xmlGeneradorAvisosSat.spec.ts`)**:
   - Validación sintáctica XML (Well-formed).
   - Inclusión correcta de Fedatario, Comparecientes, Inmueble y Medios de Pago.
   - Paquete consolidado mensual con múltiples operaciones.
3. **Pruebas Unitarias de Generación PDF (`pdfCedulaAvisoSat.spec.ts`)**:
   - Comprobación de emisión de Blob PDF válido con jsPDF.
4. **Pruebas de Componentes y Pestaña**:
   - `AvisosTab.spec.ts`: Renderizado del dictamen, semáforo, botones de acción y estado del acuse.
   - `AvisosSatOperacionesTable.spec.ts`: Filtros reactivos por chips y paginación.
5. **Garantía de Cero Regresiones**:
   - Ejecución de la suite completa (`npm test`): los 274 tests previos deben mantenerse al 100% aprobados junto con las nuevas pruebas de la Feature 11.
