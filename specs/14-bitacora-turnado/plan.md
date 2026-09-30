# Implementation Plan: 14-bitacora-turnado (Bitácora de Turnado y Cadena de Custodia: Redactor ↔ Gestor)

**Branch**: `14-bitacora-turnado` | **Date**: 2026-09-25 | **Spec**: [specs/14-bitacora-turnado/spec.md](spec.md)

**Input**: Feature specification from `specs/14-bitacora-turnado/spec.md`

---

## Summary

Implementar el sistema integral de **Bitácora de Turnado y Cadena de Custodia de Trámites** para regular formalmente la transferencia de expedientes y gestiones entre **Abogados Redactores** y **Gestores Notariales**.

El módulo resuelve:
1. **Turnado Formal (Redactor → Gestor)**: Asignación operativa con instrucciones, documentos adjuntos y sello de tiempo.
2. **Devolución por Solventación (Gestor → Redactor)**: Trámite detenido por prevenciones o suspensiones registrales/catastrales, transfiriendo formalmente la responsabilidad de corrección jurídica al redactor.
3. **Solventación y Re-turnado (Redactor → Gestor)**: Cierre de la observación y reingreso a ventanilla computando el tiempo de respuesta.
4. **Entrega de Trámite Concluido (Gestor → Redactor)**: Devolución de la salida favorable para que el redactor continúe la integración de la escritura.
5. **Bitácora Inmutable y Línea de Tiempo (Timeline)**: Registro cronológico inalterable con horas y días hábiles en cada mano, más filtros de "Custodia Actual" en el tablero de trámites.

---

## Technical Context

**Language/Version**: TypeScript 5+ / Vue 3.5 / Nuxt 3.16  
**Primary Dependencies**: Vuetify 3, Nuxt Supabase (`@nuxtjs/supabase`), Pinia  
**Storage**: Supabase Postgres (tabla inmutable `public.bitacora_turnado_tramites` y extensión de `public.tramites_escritura`)  
**Testing**: Vitest + Vue Test Utils + happy-dom  
**Target Platform**: Navegadores modernos desktop (Chrome, Safari macOS, Edge)  
**Project Type**: Aplicación Web Nuxt 3 (SSR/SPA híbrido)  
**Performance Goals**: Registro atómico de turnado en < 200ms; consulta de bitácora timeline en < 150ms  
**Constraints**: Respetar contratos de pestañas preexistentes (§3 Constitución Notarial); no alterar la interfaz externa de `TramitesTab.vue`  
**Scale/Scope**: Decenas de miles de eventos de turnado al año, cientos de trámites en curso  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **§1 Visión Notarial**: La escritura sigue siendo el eje central; el trámite y su custodia dinamizan la vida operativa del instrumento.
- ✅ **§2 Stack Tecnológico**: Vue 3, Nuxt 3, Vuetify y Supabase; sin librerías externas superfluas.
- ✅ **§3 Principio de Pestañas Autónomas por Contrato**: `TramitesTab.vue` mantiene sus props (`escrituraId`, `estatus`) y sus emits (`@status-change`). La bitácora se integra como subcomponentes y drawers modulares.
- ✅ **§4 Seguridad y RLS**: Registro inmutable de no repudio. RLS restringe modificaciones directas a la bitácora (`UPDATE` y `DELETE` bloqueados).
- ✅ **§7 Testing y Cero Regresiones**: Suite completa de pruebas unitarias debe mantenerse al 100% (404+ tests).
- ✅ **§8 Prototipado y Diseño (Stitch MCP)**: Uso de tokens institucionales notariales (`#1B3A5F`, `#A9762E`, `#2F6F4E`, `#B45309`) para semáforos de custodia y timeline.

---

## Project Structure

### Documentation (this feature)

```text
specs/14-bitacora-turnado/
├── spec.md              # Especificación funcional y de negocio
├── plan.md              # Este plan de implementación
├── research.md          # Investigación técnica y decisiones de diseño
├── data-model.md        # Esquema relacional y DTOs TypeScript
├── quickstart.md        # Guía de validación paso a paso
├── contracts/           # Contratos de interfaces y servicios
│   └── turnado-interface.md
└── tasks.md             # Tareas ejecutables (generado por /speckit-tasks)
```

### Source Code

```text
app/
├── types/
│   └── turnado.ts                                         # DTOs y tipos de eventos de turnado
├── composables/
│   └── useTurnadoTramites.ts                              # Lógica de negocio, consultas y RPC de turnado
├── components/
│   └── tramites/
│       ├── CustodiaTramiteBadge.vue                       # Semáforo compacto de custodia actual
│       ├── TurnadoTramiteModal.vue                        # Modal polivalente para turnar, devolver o solventar
│       ├── BitacoraTurnadoTimeline.vue                    # Visualizador de timeline cronológico de eventos
│       └── BitacoraTurnadoDrawer.vue                      # Drawer lateral para inspección de historial
│   └── escrituras/tabs/
│       └── TramitesTab.vue                                # Integración contextual sin romper contrato
└── pages/
    └── tramites/
        └── index.vue                                      # Filtro por custodia actual en panel global

supabase/
└── migrations/
    └── 20260814000000_bitacora_turnado.sql                # Migración de tabla, columnas y función atómica

tests/unit/
├── composables/
│   └── useTurnadoTramites.spec.ts                         # Pruebas del composable y cómputo de horas
└── components/
    └── tramites/
        └── turnado/
            ├── CustodiaTramiteBadge.spec.ts               # Pruebas del badge de semáforo
            ├── TurnadoTramiteModal.spec.ts                # Pruebas del modal de turnado y validaciones
            └── BitacoraTurnadoTimeline.spec.ts            # Pruebas de la línea de tiempo
```

---

## Planned Phases & Implementation Strategy

### Phase 1: Base de Datos, Tipos y Composable
- Crear migración `20260814000000_bitacora_turnado.sql` con la tabla inmutable `bitacora_turnado_tramites`, columnas en `tramites_escritura`, función almacenada `fn_registrar_turnado` y políticas RLS.
- Crear `app/types/turnado.ts` con todos los contratos de tipos.
- Implementar `app/composables/useTurnadoTramites.ts` con métodos `turnarAlGestor`, `devolverPorPrevencion`, `solventarYReturnar`, `entregarConcluido` y carga de historial.
- Crear pruebas unitarias del composable en `tests/unit/composables/useTurnadoTramites.spec.ts`.

### Phase 2: Componentes UI Stitch (§8 Constitución Notarial)
- Construir `CustodiaTramiteBadge.vue` con semáforo notarial (Gestor en gestión, Redactor en solventación, Concluido).
- Construir `TurnadoTramiteModal.vue` para captura de destinatario, motivos de prevención, fecha límite e instrucciones.
- Construir `BitacoraTurnadoTimeline.vue` con tarjetas de evento, cálculo de días/horas transcurridos y diseño Stitch.
- Construir `BitacoraTurnadoDrawer.vue` para desplegar el historial desde cualquier parte del sistema.

### Phase 3: Integración en la Pestaña de Trámites (`TramitesTab.vue`)
- Incorporar `CustodiaTramiteBadge` en la tabla/cards de trámites de la escritura.
- Conectar botones de acción rápida: "Turnar a Gestor", "Devolver por Solventación", "Solventar y Re-turnar", "Entregar Concluido", y "Ver Bitácora".
- Mantener estrictamente el contrato de `TramitesTab.vue` (§3 Constitución).

### Phase 4: Integración en el Tablero Central de Trámites (`/tramites`)
- Añadir filtro reactivo por *"Custodia Actual"* (`Todos`, `En manos del Gestor`, `En manos del Redactor / Solventando`, `Concluidos`).
- Mostrar en la vista general el estado de custodia de cada instrumento.

### Phase 5: Verificación Completa y Cero Regresiones
- Desarrollar suite de pruebas unitarias para los componentes en `tests/unit/components/tramites/turnado/`.
- Ejecutar la suite completa `npm test` verificando que los 404 tests previos se mantengan al 100% en verde.
