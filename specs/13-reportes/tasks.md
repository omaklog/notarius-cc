# Tasks: 13-reportes (Panel Ejecutivo, Reportes Operativos e Índices Notariales por Volumen)

**Input**: Design artifacts from `specs/13-reportes/` (`spec.md`, `plan.md`, `data-model.md`, `research.md`, `contracts/`, `quickstart.md`)  
**Prerequisites**: Core entities (`escrituras`, `profiles`, `actos_juridicos`, `tramites`, `comparecientes`, `honorarios`) from previous specs.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tipos base TypeScript, configuración de rutas y permisos de reportería.

- [X] T001 [P] Crear archivo de tipos `app/types/reportes.ts` con los modelos TypeScript (`ResumenKpisMes`, `RedactorCargaItem`, `ActoDemandaItem`, `ReporteEscrituraGeneralItem`, `VolumenIndiceCard`, `EscrituraIndiceItem`, `FiltrosReportesPeriodo`, `ActualizarFoliadoPayload`)
- [X] T002 [P] Verificar y asegurar la integración de la ruta `/reportes` en `app/composables/useNavItems.ts` asociada a los permisos `reportes:ver_operativos` y `reportes:ver_financieros`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Composable central de agregación de datos, consultas a Supabase y motor de exportación CSV.

**⚠️ CRITICAL**: Ninguna interfaz de usuario de reportes puede conectarse hasta completar esta fase.

- [X] T003 Implementar `app/composables/useReportesNotariales.ts` con estado reactivo de periodo, consultas agregadas a Supabase (`escrituras`, `profiles`, `actos_juridicos`, `tramites`) y cálculo de métricas
- [X] T004 [P] Implementar las funciones de exportación de datos a formato CSV con codificación UTF-8 y BOM (`exportarReporteGeneralCSV`, `exportarIndiceVolumenCSV`) en `app/composables/useReportesNotariales.ts`
- [X] T005 [P] Crear pruebas unitarias del composable en `tests/unit/composables/useReportesNotariales.spec.ts` validando cálculo de KPIs, agrupación de redactores y Top 5 de actos notariales

**Checkpoint**: Base de datos, tipos y composable listos para conectar las vistas del Dashboard, Reporte General e Índices.

---

## Phase 3: User Story 1 - Dashboard Ejecutivo y Gráficas del Mes en Curso (Priority: P1) 🎯 MVP

**Goal**: Proporcionar al Notario Titular y Administrador un panel gráfico interactivo del mes en curso con 4 tarjetas de KPIs, balance de asignaciones por redactor (gráfica de barras) y Top 5 de actos notariales más solicitados (gráfica de dona), con selector reactivo de periodo.

**Independent Test**: Navegar a `/reportes` con un usuario con permiso `reportes:ver_operativos`, constatar la carga de las tarjetas de KPIs del mes, las barras de carga por redactor y la dona del Top 5 de actos, y verificar que al cambiar el mes o año las gráficas se actualizan reactivamente.

### Implementation for User Story 1
- [X] T006 [P] [US1] Construir el componente `app/components/reportes/ReportesKpisBar.vue` con las 4 tarjetas de KPIs del mes (*Abiertas en el Mes*, *Firmadas en el Mes*, *En Trámite*, *Canceladas*) y selector dinámico de mes y año
- [X] T007 [P] [US1] Construir el componente `app/components/reportes/ReportesGraficaRedactores.vue` con gráfico de barras SVG interactivo, leyenda y tabla de distribución de escrituras por abogado redactor
- [X] T008 [P] [US1] Construir el componente `app/components/reportes/ReportesGraficaActosTop.vue` con gráfico de dona SVG responsivo, porcentajes y tabla del Top 5 de actos jurídicos con mayor demanda
- [X] T009 [US1] Construir la página principal `app/pages/reportes/index.vue` integrando el layout general de pestañas y montando el Dashboard Ejecutivo como vista predeterminada
- [X] T010 [P] [US1] Crear pruebas unitarias para `ReportesKpisBar.vue`, `ReportesGraficaRedactores.vue`, `ReportesGraficaActosTop.vue` y `app/pages/reportes/index.vue` en `tests/unit/components/reportes/` y `tests/unit/pages/reportes/`

**Checkpoint**: MVP desplegable y funcional: Dashboard gráfico del mes en curso 100% operativo y testeado.

---

## Phase 4: User Story 2 - Reporte General Consolidado de Escrituras y Carga de Gestoría (Priority: P2)

**Goal**: Permitir consultar una tabla integral de todas las escrituras en el sistema, filtrar por estatus (firmadas, canceladas, en trámite), buscar por texto, auditar la carga del gestor (trámites asignados vs liberados) y exportar a CSV/Excel.

**Independent Test**: En la pestaña "Reporte General de Escrituras", filtrar por estado "En Trámite", verificar el conteo de trámites asignados vs concluidos del gestor, y accionar "Exportar a Excel" constatando la descarga del archivo CSV estructurado.

### Implementation for User Story 2
- [X] T011 [US2] Construir `app/components/reportes/ReporteGeneralEscriturasTable.vue` con tabla de datos Vuetify, filtros rápidos de estatus (`firmadas`, `en_tramite`, `canceladas`, `todas`), buscador y columnas de trámites de gestoría
- [X] T012 [US2] Conectar botón de acción "Exportar a Excel (CSV)" en `ReporteGeneralEscriturasTable.vue` enlazado al método de descarga en UTF-8
- [X] T013 [US2] Integrar la pestaña "Reporte General" en `app/pages/reportes/index.vue`
- [X] T014 [P] [US2] Crear pruebas unitarias en `tests/unit/components/reportes/ReporteGeneralEscriturasTable.spec.ts` validando filtros, buscador y llamada de exportación

**Checkpoint**: Reporte general de escrituras y gestoría completamente operativo e integrable.

---

## Phase 5: User Story 3 - Gestión de Índices Notariales por Volumen y Foliado del Protocolo (Priority: P3)

**Goal**: Proveer una pantalla organizada por Volúmenes en Cards con semáforo de foliado (páginas inicial/final completas vs pendientes), permitir capturar o actualizar las páginas de cada escritura de ese volumen, y generar el reporte oficial imprimible N veces con cabecera notarial, estatus legal de validez y certificación de cierre del volumen.

**Independent Test**: Entrar a la pestaña "Índices por Volumen", constatar los cards de volumen con su semáforo de foliado, hacer clic en un volumen, modificar la `pagina_inicial` y `pagina_final` de una escritura y constatar su persistencia en `public.escrituras`; finalmente, pulsar "Imprimir Índice Oficial del Volumen" y verificar la apertura de la vista imprimible limpia con membrete, comparecientes y certificación al calce.

### Implementation for User Story 3
- [X] T015 [US3] Extender `app/composables/useReportesNotariales.ts` con métodos `cargarVolumenes()`, `seleccionarVolumen(volumen)` y `actualizarFoliadoEscritura(id, paginaInicial, paginaFinal)`
- [X] T016 [P] [US3] Construir `app/components/reportes/indices/VolumenesCardsGrid.vue` con cuadrícula de Cards de volumen, rango de instrumentos y badge de semáforo de foliado (*Foliado Completo* vs *Foliado Pendiente*)
- [X] T017 [US3] Construir `app/components/reportes/indices/VolumenDetalleFoliadoModal.vue` para desplegar la lista de escrituras del volumen seleccionado, inputs para capturar `pagina_inicial` y `pagina_final`, y validación notarial (`pagina_final >= pagina_inicial`)
- [X] T018 [US3] Construir `app/components/reportes/indices/ReporteIndiceVolumenImprimible.vue` con formato canónico notarial: membrete oficial, columnas de Instrumento, Volumen, Fecha Celebración, Acto Jurídico, Comparecientes con rol notarial, Páginas Inicial y Final, Observaciones (Firmada / Cancelada o No Pasó) y Certificación de Cierre del Volumen para firma y sello del Notario
- [X] T019 [US3] Integrar la pestaña "Índices por Volumen" en `app/pages/reportes/index.vue` conectando la navegación entre Cards de volumen, detalle de foliado y diálogo de impresión limpia
- [X] T020 [P] [US3] Crear pruebas unitarias para `VolumenesCardsGrid.vue`, `VolumenDetalleFoliadoModal.vue` y `ReporteIndiceVolumenImprimible.vue` en `tests/unit/components/reportes/indices/`

**Checkpoint**: Módulo de Índices Notariales por Volumen 100% funcional, validado e imprimible.

---

## Phase 6: User Story 4 - Resumen Financiero y Control de Honorarios (Priority: P4)

**Goal**: Permitir al Notario Titular y Administrador con permiso `reportes:ver_financieros` auditar la cobranza de honorarios propios, cuentas por cobrar por escritura y estado de fondos para órdenes de pago.

**Independent Test**: Iniciar sesión con un usuario con permiso `reportes:ver_financieros`, verificar la pestaña "Financiero", y verificar que usuarios sin dicho permiso no visualicen la pestaña ni puedan acceder a los datos.

### Implementation for User Story 4
- [X] T021 [US4] Extender `app/composables/useReportesNotariales.ts` con consultas agregadas de `honorarios_cuentas` y `honorarios_pagos`
- [X] T022 [US4] Construir `app/components/reportes/ReportesFinanzasTab.vue` con KPIs de cobranza mensual, saldos pendientes y tabla de clientes deudores por escritura
- [X] T023 [US4] Integrar la pestaña condicional "Finanzas" en `app/pages/reportes/index.vue` sujeta a la directiva o validación del permiso `reportes:ver_financieros`
- [X] T024 [P] [US4] Crear pruebas unitarias para `ReportesFinanzasTab.vue` y la guarda de permisos en `tests/unit/components/reportes/ReportesFinanzasTab.spec.ts`

**Checkpoint**: Módulo financiero integrado y blindado con RLS.

---

## Phase 7: Polish, Verificación Integral y Cero Regresiones

**Purpose**: Validación end-to-end de escenarios y ejecución de la suite completa de pruebas.

- [X] T025 [P] Validar paso a paso todos los escenarios del archivo `specs/13-reportes/quickstart.md`
- [X] T026 Ejecutar la suite global de pruebas unitarias (`npm test`) verificando que los 377 tests previos más las nuevas pruebas de reportes pasen al 100% sin ninguna regresión

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: Sin dependencias, arranca de inmediato.
- **Phase 2 (Foundational)**: Depende de Phase 1; bloquea todas las User Stories.
- **Phase 3 (User Story 1 - MVP)**: Depende de Phase 2.
- **Phase 4 (User Story 2)**: Depende de Phase 2; puede correr en paralelo con US1 o de forma secuencial.
- **Phase 5 (User Story 3)**: Depende de Phase 2; extiende métodos de volumen e implementa el flujo de índices.
- **Phase 6 (User Story 4)**: Depende de Phase 2; añade la capa financiera protegida.
- **Phase 7 (Polish & Tests)**: Depende de todas las fases anteriores.

### Parallel Opportunities
- T001 y T002 en Phase 1 son paralelizables [P].
- T004 y T005 en Phase 2 son paralelizables [P].
- T006, T007, T008 y T010 en Phase 3 pueden desarrollarse en paralelo [P].
- T016 y T020 en Phase 5 son paralelizables [P].
- T024 y T025 en Phase 6 y 7 son paralelizables [P].

---

## Implementation Strategy: MVP First

1. **Paso 1**: Completar Phase 1 y Phase 2 (Tipos y Composable con consultas Supabase).
2. **Paso 2**: Completar Phase 3 (Dashboard Ejecutivo del Mes con gráficas SVG y KPIs) → **MVP funcional entregable**.
3. **Paso 3**: Completar Phase 4 (Reporte General de Escrituras y Gestoría con CSV).
4. **Paso 4**: Completar Phase 5 (Índices del Protocolo por Volumen con cards, foliado e impresión con certificación).
5. **Paso 5**: Completar Phase 6 (Resumen Financiero con protección de permisos).
6. **Paso 6**: Ejecutar Phase 7 (Verificación global con 377+ tests en verde).
