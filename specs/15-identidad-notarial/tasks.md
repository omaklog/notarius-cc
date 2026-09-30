# Tasks: 15-identidad-notarial (Identidad Notarial, Fe Pública y Configuración Institucional)

**Input**: Design artifacts from `specs/15-identidad-notarial/` (`spec.md`, `plan.md`, `data-model.md`, `research.md`, `contracts/`, `quickstart.md`)  
**Prerequisites**: Módulos base del sistema y perfiles de usuario de especificaciones previas.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Definiciones TypeScript e interfaces del dominio institucional.

- [x] T001 [P] Crear archivo de tipos `app/types/configuracion.ts` con los modelos TypeScript (`ConfiguracionNotarial`, `ActualizarConfiguracionPayload`)
- [x] T002 [P] Verificar y asegurar los permisos requeridos (`administracion:acceso`, `administracion:configuracion`) en `app/composables/useNavItems.ts` y contratos de seguridad

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de base de datos PostgreSQL singleton, bucket de Supabase Storage y composable central de configuración.

**⚠️ CRITICAL**: Ninguna interfaz de usuario puede operar hasta completar esta fase.

- [x] T003 Crear migración PostgreSQL `supabase/migrations/20260815000000_identidad_notarial.sql` con la tabla singleton `public.configuracion_notarial`, constraints, seed con fila por defecto, aprovisionamiento del bucket `notaria-identidad` en Supabase Storage y políticas RLS
- [x] T004 Implementar composable `app/composables/useConfiguracionNotarial.ts` con estado reactivo singleton, caché en memoria, métodos `cargarConfiguracion`, `guardarConfiguracion`, `subirActivoGrafico`, `eliminarActivoGrafico`, `interpoladorLeyenda` y propiedades computadas
- [x] T005 [P] Crear pruebas unitarias del composable en `tests/unit/composables/useConfiguracionNotarial.spec.ts` validando caché, guardado, cómputo de nombres y manejo de errores

**Checkpoint**: Base de datos, storage y composable listos para conectar vistas e interfaces.

---

## Phase 3: User Story 1 - Ficha Institucional y Datos de Fe Pública (Priority: P1) 🎯 MVP

**Goal**: Permitir al Notario Titular o Administrador capturar y persistir los datos oficiales de fe pública (número de notaría, entidad federativa, municipio, distrito judicial/notarial, notario titular, patente/fíat, suplencia y domicilio).

**Independent Test**: Navegar a `/administracion-general/identidad-notarial`, capturar los datos oficiales de la notaría, guardar y constatar que persisten y se recuperan fielmente en la interfaz.

### Implementation for User Story 1
- [x] T006 [US1] Construir la vista administrativa `app/pages/administracion-general/identidad-notarial.vue` con diseño Stitch Notarial (`#1B3A5F`, `#A9762E`), tabs organizadas y formulario reactivo de Ficha Notarial y Domicilio Oficial
- [x] T007 [US1] Integrar la tarjeta de acceso "Identidad Notarial y Fe Pública" en el panel general `app/pages/administracion-general/index.vue`
- [x] T008 [P] [US1] Crear pruebas unitarias para la vista de identidad notarial en `tests/unit/pages/administracion-general/identidad-notarial.spec.ts`

**Checkpoint**: MVP funcional: Ficha notarial y titularidad 100% operable y testeada.

---

## Phase 4: User Story 2 - Identidad Visual y Sellado Notarial Oficial (Priority: P2)

**Goal**: Permitir la carga, previsualización y gestión del logotipo oficial de la notaría y el facsímil del Sello Notarial de Autorizar para carátulas y reportes.

**Independent Test**: En la pestaña "Identidad Visual y Sellos", subir un archivo PNG para el logotipo y otro para el sello notarial; verificar la previsualización inmediata y el almacenamiento en el bucket `notaria-identidad`.

### Implementation for User Story 2
- [x] T009 [US2] Extender `identidad-notarial.vue` con la pestaña "Identidad Visual y Sellos Notariales", cargadores de archivos con arrastrar y soltar, previsualización en vivo y botón para reemplazar/eliminar
- [x] T010 [P] [US2] Añadir pruebas unitarias para carga de activos gráficos en `tests/unit/pages/administracion-general/identidad-notarial.spec.ts`

**Checkpoint**: Gestión de identidad visual y sellado notarial validada.

---

## Phase 5: User Story 3 - Parámetros y Leyendas Reglamentarias (Priority: P3)

**Goal**: Permitir al Notario Titular personalizar el membrete oficial, el lema notarial y la fórmula solemne de certificación de cierre de volúmenes de protocolo con variables dinámicas.

**Independent Test**: En la pestaña "Leyendas y Formatos", modificar la fórmula de certificación de cierre de volumen; comprobar que la función de interpolación sustituye las variables correctamente.

### Implementation for User Story 3
- [x] T011 [US3] Extender `identidad-notarial.vue` con la pestaña "Leyendas y Formatos Oficiales" con campos de texto para membrete, lema y plantilla de certificación de volumen con tags interactivos
- [x] T012 [P] [US3] Añadir pruebas unitarias de interpolación de leyendas en `tests/unit/composables/useConfiguracionNotarial.spec.ts`

**Checkpoint**: Personalización de leyendas oficiales integrada y validada.

---

## Phase 6: User Story 4 - Consumo Centralizado e Inyección Dinámica (Priority: P4)

**Goal**: Inyectar dinámicamente los datos de la notaría y el logotipo en la barra de navegación superior (`AppNavbar.vue`) y en los reportes imprimibles (`ReporteIndiceVolumenImprimible.vue`).

**Independent Test**: Actualizar el nombre o logotipo de la notaría y verificar que `AppNavbar.vue` y el reporte de índice por volumen reflejan los datos vigentes sin texto estático residual.

### Implementation for User Story 4
- [x] T013 [US4] Integrar `useConfiguracionNotarial` en `app/components/layout/AppNavbar.vue` para mostrar el nombre oficial y logotipo dinámicos de la notaría
- [x] T014 [US4] Integrar `useConfiguracionNotarial` en `app/components/reportes/indices/ReporteIndiceVolumenImprimible.vue` para inyectar logotipo, membrete dinámico y fórmula de certificación de cierre de volumen
- [x] T015 [P] [US4] Crear pruebas unitarias para la integración en `tests/unit/components/layout/AppNavbarIdentidad.spec.ts`

**Checkpoint**: Inyección transversal en toda la plataforma completada.

---

## Phase 7: Polish, Verificación Integral y Cero Regresiones

**Purpose**: Validación end-to-end de escenarios y ejecución de la suite completa de pruebas.

- [x] T016 [P] Validar paso a paso todos los escenarios del archivo `specs/15-identidad-notarial/quickstart.md`
- [x] T017 Ejecutar la suite global de pruebas unitarias (`npm test`) verificando que los 424 tests previos más las nuevas pruebas de identidad notarial pasen al 100% sin ninguna regresión

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: Sin dependencias, arranca de inmediato.
- **Phase 2 (Foundational)**: Depende de Phase 1; bloquea todas las User Stories.
- **Phase 3 (User Story 1 - MVP)**: Depende de Phase 2.
- **Phase 4 (User Story 2)**: Depende de Phase 2 y Phase 3.
- **Phase 5 (User Story 3)**: Depende de Phase 2 y Phase 3.
- **Phase 6 (User Story 4)**: Depende de Phase 2 y Phase 3.
- **Phase 7 (Polish & Tests)**: Depende de todas las fases anteriores.

### Parallel Opportunities
- T001 y T002 en Phase 1 son paralelizables [P].
- T005 en Phase 2 es paralelizable [P].
- T008, T010, T012 y T015 en pruebas son paralelizables [P].
- T016 y T017 en Phase 7 son paralelizables [P].

---

## Implementation Strategy: MVP First

1. **Paso 1**: Completar Phase 1 y Phase 2 (Migración PostgreSQL singleton, bucket de storage, tipos y composable reactivo).
2. **Paso 2**: Completar Phase 3 (Vista administrativa en `/administracion-general/identidad-notarial`, formulario de Ficha y acceso en dashboard) → **MVP funcional entregable**.
3. **Paso 3**: Completar Phase 4 (Subida y previsualización de logotipo y facsímil del sello notarial).
4. **Paso 4**: Completar Phase 5 (Gestión de leyendas y fórmulas dinámicas de certificación).
5. **Paso 5**: Completar Phase 6 (Inyección en `AppNavbar.vue` e índices por volumen).
6. **Paso 6**: Ejecutar Phase 7 (Verificación global con 424+ tests en verde).
