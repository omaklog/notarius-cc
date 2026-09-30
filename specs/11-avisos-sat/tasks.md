# Tasks: 11-avisos-sat (Avisos SAT / UIF - Prevención de Lavado de Dinero SPPLD)

**Branch**: `11-avisos-sat` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup & Data Foundation

**Purpose**: Estructura de base de datos relacional, auditoría y políticas de seguridad RLS

- [X] T001 Crear migración `supabase/migrations/20260811000000_avisos_sat.sql` con tablas `avisos_sat`, `avisos_sat_bitacora`, vista `v_avisos_sat_mensual`, índices por periodo/escritura y permisos dinámicos (`avisos_sat.ver`, `avisos_sat.crear`, `avisos_sat.generar_xml`, `avisos_sat.registrar_acuse`, `avisos_sat.ceros`)
- [X] T002 Aplicar políticas RLS (Row Level Security) y permisos dinámicos en la migración SQL

---

## Phase 2: Foundational Layer (Tipos TypeScript, Composables y Utilerías)

**Purpose**: Infraestructura de cálculo, generador de layouts XML, generador de PDF y tipos compartidos

- [X] T003 [P] Crear definiciones de tipos e interfaces TypeScript en `app/types/avisosSat.ts` conforme a `contracts/avisos-sat-interface.md`
- [X] T004 [P] Implementar composable de cálculo de plazos, prórrogas por sexto dígito de RFC y dictamen en `app/composables/useAvisosSatCalculos.ts`
- [X] T005 [P] Crear pruebas unitarias para el motor de cálculo en `tests/unit/composables/useAvisosSatCalculos.spec.ts`
- [X] T006 [P] Implementar generador de archivo XML SPPLD para fedatarios públicos en `app/utils/xmlGeneradorAvisosSat.ts`
- [X] T007 [P] Crear pruebas unitarias del generador XML en `tests/unit/utils/xmlGeneradorAvisosSat.spec.ts`
- [X] T008 [P] Implementar generador de Cédula de Aviso en PDF institucional en `app/utils/pdfCedulaAvisoSat.ts`
- [X] T009 [P] Crear pruebas unitarias del generador PDF en `tests/unit/utils/pdfCedulaAvisoSat.spec.ts`
- [X] T010 Implementar composable principal de integración con Supabase en `app/composables/useAvisosSat.ts`
- [X] T011 Crear pruebas unitarias para `useAvisosSat.ts` en `tests/unit/composables/useAvisosSat.spec.ts`

---

## Phase 3: User Story 1 - Diagnóstico, Generación XML/PDF y Gestión de Aviso Individual en la Escritura (Priority: P1) 🎯 MVP

**Goal**: Permitir al abogado dictaminar si la escritura es actividad vulnerable sujeta a aviso, generar y descargar el layout XML SPPLD, emitir la Cédula PDF y registrar el folio de acuse SAT oficial con su archivo adjunto desde el hub de la escritura

**Independent Test**: Abrir una escritura de compraventa con monto superior a 16,050 UMAs, abrir la pestaña "Avisos SAT/UIF", constatar el dictamen "Sujeta a Aviso Ordinario", descargar el XML SPPLD, descargar la Cédula PDF foliada, y registrar el acuse SAT con folio `SAT-SPPLD-2026-98124`, comprobando que transiciona a "Presentado con Acuse".

### Implementation for User Story 1
- [X] T012 [P] [US1] Crear componente `app/components/avisosSat/AvisosSatCedulaPreview.vue` para previsualización tabular de datos del aviso (fedatario, comparecientes, bien, liquidación y tope de efectivo)
- [X] T013 [P] [US1] Crear modal `app/components/avisosSat/modal/AvisosSatRegistrarAcuseModal.vue` para asentar folio oficial de aceptación del SAT, fecha/hora y comprobante PDF
- [X] T014 [P] [US1] Crear modal `app/components/avisosSat/modal/AvisosSatXmlPreviewModal.vue` con visor de código XML y botón de copia/descarga
- [X] T015 [US1] Crear componente de pestaña `app/components/escrituras/tabs/AvisosTab.vue` integrando semáforo normativo, tarjeta de dictamen, indicador de prórroga por RFC, cédula de datos y botones de acción conforme a maqueta Stitch `33eab919508a412db6d2185e1259ae76`
- [X] T016 [US1] Reemplazar el `<PlaceholderTab />` en el tab `avisos` de `app/pages/escrituras/[id].vue` por `<AvisosTab :escritura-id="escrituraId" :estatus-escritura="escritura.estatus" />`
- [X] T017 [US1] Crear prueba unitaria `tests/unit/components/escrituras/tabs/AvisosTab.spec.ts`

---

## Phase 4: User Story 2 - Tablero Central Mensual de Cumplimiento SAT y Paquete Consolidado (Priority: P2)

**Goal**: Tablero centralizado en `/avisos-sat` con calendario fiscal inteligente (día 17 + prórroga RFC), métricas mensuales, tabla reactiva y generador de paquete mensual consolidado XML

**Independent Test**: Navegar a `/avisos-sat`, seleccionar un mes y año, verificar las 5 tarjetas de KPI, comprobar el cálculo del semáforo con los días hábiles de prórroga, filtrar escrituras por estado y pulsar "Generar Paquete Mensual XML" validando la descarga del archivo consolidado.

### Implementation for User Story 2
- [X] T018 [P] [US2] Crear barra de métricas y KPIs `app/components/avisosSat/AvisosSatKpisBar.vue` (Operaciones vulnerables, sujetas a aviso, presentadas, pendientes, monto total reportable)
- [X] T019 [P] [US2] Crear banner de calendario fiscal y vencimiento inteligente `app/components/avisosSat/AvisosSatPeriodoBanner.vue` (base día 17 + prórroga RFC con cuenta regresiva y semáforo)
- [X] T020 [P] [US2] Crear tabla interactiva de escrituras `app/components/avisosSat/AvisosSatOperacionesTable.vue` con filtros por chips ('Todas', 'Pendientes', 'Presentadas', '24h'), búsqueda y acciones rápidas
- [X] T021 [US2] Crear la vista global de cumplimiento `app/pages/avisos-sat/index.vue` integrando selector de periodo, banner de vencimiento, KPIs, tabla y botón de generación de paquete mensual consolidado conforme a maqueta Stitch `8ec51daf171b4998a25f2ed072a513ef`
- [X] T022 [US2] Crear pruebas unitarias `tests/unit/components/avisosSat/AvisosSatOperacionesTable.spec.ts`

---

## Phase 5: User Story 3 - Informe Mensual en Ceros y Avisos Urgentes de 24 Horas (Priority: P3)

**Goal**: Declarar formalmente el informe en ceros para meses sin operaciones reportables y gestionar alertas perentorias de 24 horas derivadas de coincidencias en Lista de Personas Bloqueadas (LPB)

**Independent Test**: Seleccionar un mes sin operaciones que superen el umbral, activar el flujo "Declarar Informe en Ceros" y guardar el folio de acuse emitido por el SAT; simular un match en LPB y verificar la alerta inmediata de aviso de 24 horas con cronómetro perentorio.

### Implementation for User Story 3
- [X] T023 [P] [US3] Crear modal `app/components/avisosSat/modal/AvisosSatDeclararCerosModal.vue` para asentar formalmente el informe en ceros del periodo con folio y acuse SAT
- [X] T024 [P] [US3] Crear widget de monitoreo prioritario `app/components/avisosSat/AvisosSatAlerta24hCard.vue` con temporizador de 24 horas ante coincidencias en Lista de Personas Bloqueadas (LPB)

---

## Phase 6: Polish & Verification

**Purpose**: Verificación de calidad, pruebas unitarias integrales y garantía de cero regresiones

- [X] T025 Ejecutar la suite completa de pruebas unitarias (`npm test`) y verificar que los 274 tests existentes más los nuevos tests de avisos pasen al 100%
- [X] T026 Validar los escenarios del archivo `quickstart.md`

---

## Phase 7: Gestión y Actualización Híbrida de la UMA (Administración General - Opciones A + B + C)

**Goal**: Permitir la administración integral del valor de la UMA mediante catálogo histórico con altas/ediciones manuales (Opción A), alerta preventiva reactiva si no está actualizado en el año en curso (Opción B), y consulta automatizada/asistida al INEGI con fallback a enlaces oficiales en caso de fallo (Opción C).

- [X] T027 [P] Crear migración `supabase/migrations/20260812000000_uma_admin.sql` con columnas `notas` y `fuente`, permisos y política RLS `uma_historico_all_admin`
- [X] T028 [P] Implementar endpoint Nuxt `server/api/uma/consultar-inegi.get.ts` para consulta al INEGI con fallback oficial y timeout
- [X] T029 [P] Crear pruebas unitarias para el endpoint en `tests/unit/server/api/uma/consultar-inegi.spec.ts`
- [X] T030 [P] Implementar composable `app/composables/useUmaHistorico.ts` con CRUD, cálculo de vigencia, alerta anual y consulta al INEGI
- [X] T031 [P] Crear pruebas unitarias del composable en `tests/unit/composables/useUmaHistorico.spec.ts`
- [X] T032 Crear vista interactiva `app/pages/administracion-general/uma.vue` integrando Opciones A, B y C
- [X] T033 Enlazar el módulo UMA en `app/pages/administracion-general/index.vue`
- [X] T034 Ejecutar la suite completa de pruebas y verificar 0 regresiones

