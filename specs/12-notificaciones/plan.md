# Implementation Plan: 12-notificaciones (Sistema Notarial de Notificaciones Multicanal y Avisos a Comparecientes)

**Branch**: `12-notificaciones` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Especificación del sistema transversal de notificaciones multicanal para clientes y notaría (correo, WhatsApp, SMS sobre trámites, pagos, firmas y citas) conforme a la Constitución Notarial (§3, §4, §8).

---

## Summary

Implementar el módulo central de **Notificaciones Notariales** en `app/pages/notificaciones/index.vue` basado en el prototipo validado en **Stitch** (`213b26bc2b654c5298a2c0e91340a29b`), integrando:
1. **Infraestructura de Datos**: Tablas `plantillas_notificaciones` y `notificaciones_bitacora` (con soporte para `archivos_adjuntos`), políticas RLS y vista `v_notificaciones_metricas_mensual`.
2. **Motor de Despacho & WhatsApp Desktop / Web**: Despacho de WhatsApp invocando prioritariamente el protocolo nativo de escritorio (`whatsapp://send?phone=...&text=...`) para abrir la app instalada en macOS y Windows, con respaldo inmediato a WhatsApp Web (`web.whatsapp.com`), backend Nuxt (`server/api/notificaciones/`) y motor de interpolación de variables notariales.
3. **Soporte de Archivos Adjuntos**: Capacidad de adjuntar archivos locales desde la computadora del usuario (PDFs, comprobantes, imágenes), almacenados en Supabase Storage (`expedientes/notificaciones/`) y enlazados en el mensaje.
4. **Centro de Control & Autocompletado de Comparecientes**: Tablero con 4 tarjetas de KPIs, filtros dinámicos por canal y estado, tabla de bitácora interactiva, visor lateral de preview fidedigno y modal de redacción con búsqueda autocompletada de clientes que rellena datos de contacto y asocia sus escrituras activas.
5. **Interacción Contextual en la Escritura y Pestañas Operativas**: Diálogo `NotificacionesHistorialDialog.vue` invocado desde la cabecera de `escrituras/[id].vue`, y botones contextuales "Notificar" en las listas de **Órdenes de Pago**, **Honorarios** y **Georreferenciación** que abren el modal pre-llenado con plantilla y variables resueltas sin alterar la lógica de negocio interna (§3 Constitución).


---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ / Vue 3.4+ / Nuxt 3.12+  
**Primary Dependencies**: Vuetify 3.6+, `@supabase/supabase-js`, Pinia, unplugin-icons / MDI  
**Storage**: Supabase Postgres (`public.plantillas_notificaciones`, `public.notificaciones_bitacora`)  
**Testing**: Vitest + Vue Test Utils + happy-dom (100% pruebas unitarias)  
**Target Platform**: Navegador Web Desktop / PWA Notarial (Resolución base 1280x1024)  
**Project Type**: Web Application Notarial (Fullstack Nuxt + Supabase BaaS)  
**Performance Goals**: Carga de bitácora y filtrado en < 200ms; despacho o simulación en < 500ms  
**Constraints**: Operar de manera totalmente funcional con proveedor simulado local en ausencia de API keys externas; cero regresiones sobre los 326 tests existentes  
**Scale/Scope**: ~2,000 notificaciones mensuales por notaría; 12 plantillas oficiales precargadas  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **§1 Entidad Raíz**: Toda notificación a cliente puede vincularse opcionalmente a una `escritura_id` o `compareciente_id`.
- [x] **§2 Stack Tecnológico**: Cumple con Nuxt 3, Vuetify, Supabase Postgres y Vitest.
- [x] **§3 Desacoplamiento de Escritura**: No modifica la estructura interna de las 8 pestañas de `escrituras/[id].vue`. Se integra mediante un diálogo modal limpio desde la barra superior.
- [x] **§7 Seguridad & RLS**: Utiliza los permisos estándar de `public.permisos` (`notificaciones.ver`, `notificaciones.reenviar`, `notificaciones.configurar_plantillas`) mediante `fn_has_permiso`.
- [x] **§8 Prototipado Stitch**: Pantalla oficial generada exitosamente en Stitch con ID `213b26bc2b654c5298a2c0e91340a29b` respetando la paleta institucional (#1B3A5F, #A9762E).

---

## Project Structure

### Documentation (this feature)

```text
specs/12-notificaciones/
├── spec.md              # Especificación funcional con clarificaciones resueltas
├── plan.md              # Este plan de implementación
├── research.md          # Decisiones de diseño y patrones de arquitectura
├── data-model.md        # Esquema de base de datos, índices y políticas RLS
├── contracts/           # Contratos TypeScript y endpoints de servidor
│   └── notificaciones-interface.md
├── quickstart.md        # Guía de validación y escenarios de prueba
└── tasks.md             # Tareas ejecutables (generado por /speckit-tasks)
```

### Source Code (repository root)

```text
app/
├── components/
│   ├── escrituras/
│   │   └── tabs/
│   │       ├── OrdenesPagoTab.vue            # Botón contextual "Notificar" para orden emitida/liquidada
│   │       ├── HonorariosTab.vue             # Botón contextual "Notificar Pago" para honorarios
│   │       └── GeorreferenciacionTab.vue     # Botón contextual "Citar para Ubicación Predial"
│   └── notificaciones/
│       ├── NotificacionesKpisBar.vue         # 4 tarjetas de métricas (Enviados, Entrega %, WhatsApp, Fallidos)
│       ├── NotificacionesTable.vue           # Tabla de bitácora con badges y acciones
│       ├── NotificacionesVisorDrawer.vue     # Visor lateral con preview fidedigno de mensaje
│       └── modal/
│           ├── RedactarNotificacionModal.vue # Modal con autocompletado de clientes, escrituras y envío desktop/web
│           ├── ConfigurarPlantillasModal.vue # Editor de plantillas con variables dinámicas
│           └── NotificacionesHistorialDialog.vue # Diálogo contextual para la cabecera de la escritura
├── composables/
│   └── useNotificaciones.ts                  # Composable reactivo de bitácora y despacho
├── pages/
│   ├── notificaciones/
│   │   └── index.vue                         # Tablero central de control (Stitch 213b26bc2b654c5298a2c0e91340a29b)
│   └── escrituras/
│       └── [id].vue                          # Integración del botón de acceso a Notificaciones en cabecera
├── types/
│   └── notificaciones.ts                     # Definición de interfaces y tipos
└── utils/
    └── interpoladorNotificaciones.ts         # Motor seguro de sustitución de tokens y generador de enlaces whatsapp:// y web

server/
├── api/
│   └── notificaciones/
│       ├── enviar.post.ts                    # Endpoint de despacho y registro en bitácora
│       └── reenviar.post.ts                  # Endpoint para reintento de envíos
└── utils/
    └── notificaciones/
        ├── provider.interface.ts             # Interfaz unificada de despacho
        └── mockProvider.ts                   # Adaptador simulado para pruebas y desarrollo

supabase/
└── migrations/
    └── 20260813000000_notificaciones.sql     # Tablas, índices, seeds de plantillas y RLS

tests/
└── unit/
    ├── components/
    │   ├── notificaciones/
    │   │   ├── NotificacionesKpisBar.spec.ts
    │   │   ├── NotificacionesTable.spec.ts
    │   │   └── RedactarNotificacionModal.spec.ts
    │   └── escrituras/
    │       └── tabs/
    │           ├── OrdenesPagoTab.spec.ts
    │           ├── HonorariosTab.spec.ts
    │           └── GeorreferenciacionTab.spec.ts
    ├── composables/
    │   └── useNotificaciones.spec.ts
    ├── server/
    │   └── api/
    │       └── notificaciones/
    │           ├── enviar.spec.ts
    │           └── reenviar.spec.ts
    └── utils/
        └── interpoladorNotificaciones.spec.ts
```

---

## Implementation Phases

1. **Fase 1: Setup & Migración de Base de Datos**
   - Mantener migración `supabase/migrations/20260813000000_notificaciones.sql` con tablas `plantillas_notificaciones`, `notificaciones_bitacora`, índices, seeds de plantillas oficiales y RLS.
2. **Fase 2: Tipos, Protocolo WhatsApp Desktop/Web y Utilidades de Interpolación**
   - Actualizar tipos en `app/types/notificaciones.ts` (`whatsapp_native_url`, `whatsapp_web_url`).
   - Extender `app/utils/interpoladorNotificaciones.ts` para construir el enlace nativo `whatsapp://send?phone=${tel}&text=${msg}` prioritario y el fallback web `https://web.whatsapp.com/send?...`.
   - Asegurar compatibilidad en `server/api/notificaciones/enviar.post.ts` y `reenviar.post.ts`.
3. **Fase 3: Composable y Motor de Estado**
   - Mantener y robustecer `app/composables/useNotificaciones.ts`.
4. **Fase 4: Componentes de UI, Autocompletado de Clientes y Tablero Central (Stitch `213b26bc2b654c5298a2c0e91340a29b`)**
   - Enriquecer `RedactarNotificacionModal.vue` con autocompletado de comparecientes (`v-autocomplete` a catálogo), selección reactiva de sus escrituras activas y disparo de protocolo nativo `whatsapp://` con botón de respaldo a WhatsApp Web.
   - Mantener `NotificacionesKpisBar.vue`, `NotificacionesTable.vue`, `NotificacionesVisorDrawer.vue` y `ConfigurarPlantillasModal.vue`.
   - Mantener la vista central en `app/pages/notificaciones/index.vue`.
5. **Fase 5: Integración Contextual en la Escritura y sus Pestañas Operativas**
   - Mantener `NotificacionesHistorialDialog.vue` en la cabecera de `app/pages/escrituras/[id].vue`.
   - Incorporar botones de acción contextual "Notificar" en:
     - `app/components/escrituras/tabs/OrdenesPagoTab.vue` (para órdenes emitidas o liquidadas).
     - `app/components/escrituras/tabs/HonorariosTab.vue` (para aviso o acuse de cobro de honorarios).
     - `app/components/escrituras/tabs/GeorreferenciacionTab.vue` (para citatorio de ubicación predial).
   - Conectar las pestañas con `RedactarNotificacionModal` pasando los parámetros precargados sin alterar la lógica de negocio ni el estado interno (§3 Constitución).
6. **Fase 6: Suite de Pruebas y Cero Regresiones**
   - Pruebas unitarias para utilidades (protocolo WhatsApp nativo + web), modal de redacción con autocompletado y botones contextuales en pestañas.
   - Ejecución completa de `npm test` verificando que pasen el 100% de las pruebas (367+ tests en verde).

