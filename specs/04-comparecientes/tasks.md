---
description: "Task list for 04-comparecientes implementation"
---

# Tasks: 04-comparecientes (Catálogo Global de Comparecientes y Fiscalización Notarial)

**Input**: Design documents from `/specs/04-comparecientes/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/comparecientes-contract.md`, `quickstart.md`
**Constitution Reference**: v1.3.0 (§2, §3, §5, §7, §8)

---

## Organization & Execution Rules

- **[P]**: Tarea paralelizable (archivos independientes sin bloqueos mutuos).
- **[Story]**: Historia de usuario correspondiente (`[US1]`, `[US2]`, `[US3]`, `[US4]`).
- **Diseño Previo Obligatorio con Stitch (MCP)**: Conforme a la Constitución §8, toda pantalla o componente mayor de UI debe diseñarse primero mediante Stitch MCP (`generate_screen_from_text`) antes de programar su código en Vue 3 / Nuxt 3.

---

## Phase 1: Setup & Data Foundations

**Purpose**: Preparar la migración de base de datos, tipos de datos, catálogos base de apoyo y validadores algorítmicos.

- [X] T001 Crear migración `supabase/migrations/20260729000000_comparecientes_fiscalizacion.sql` con el tipo enum `tipo_persona_compareciente` y los catálogos `tipos_identificacion_oficial` y `regimenes_patrimoniales`.
- [X] T002 Misma migración: Extender `public.comparecientes` (`tipo_persona`, `rfc`, `email`, `telefono`, `activo`, `updated_at`, `created_by`, índice único en `rfc`) y crear las tablas hijas `compareciente_personas_fisicas` y `compareciente_personas_morales` per `data-model.md`.
- [X] T003 Misma migración: Crear las tablas de relación `compareciente_representantes` y `compareciente_beneficiarios_controladores` con RLS habilitado y políticas por `fn_has_permiso('comparecientes', ...)`.
- [X] T004 Misma migración: Implementar las funciones de base de datos `fn_guardar_compareciente_fisica`, `fn_guardar_compareciente_moral` y `fn_buscar_comparecientes` (búsqueda predictiva con `pg_trgm`) per `contracts/comparecientes-contract.md`.
- [X] T005 [P] Crear composables de validación algorítmica: `app/composables/useRfcValidator.ts` (módulo 11/homoclave SAT) y `app/composables/useCurpValidator.ts` (algoritmo RENAPO).
- [X] T006 [P] Tests unitarios de validadores en `tests/unit/composables/validators.spec.ts` probando casos válidos, inválidos, genéricos y extranjeros.

---

## Phase 2: User Story 1 — Catálogo y Registro de Personas Físicas (Priority: P1) 🎯 MVP

**Goal**: Permitir el registro y administración completa de personas físicas con sus datos civiles, fiscales, regímenes conyugales e identificación oficial.

**Independent Test**: Registrar una persona física completa desde la interfaz y verificar que queda almacenada con validación de RFC/CURP y régimen matrimonial en el catálogo general.

- [X] T007 [US1] Petición obligatoria a Stitch (MCP) para el diseño de la vista del Directorio de Comparecientes y el Formulario de Persona Física respetando la paleta institucional (`#1B3A5F`, `#A9762E`) y densidad compacta.
- [X] T008 [US1] Crear componente `app/components/comparecientes/ComparecienteFisicaForm.vue` (Yup + VeeValidate) con campos completos: nombres, apellidos, RFC, CURP, estado conyugal, régimen patrimonial dinámico (forzoso si es casado), ocupación, identificación y domicilio.
- [X] T009 [US1] Crear página `app/pages/comparecientes/index.vue` con listado paginado, búsqueda rápida por RFC/nombre, filtros por tipo de persona y botón para abrir el modal de captura.
- [X] T010 [P] [US1] Tests unitarios de `ComparecienteFisicaForm.vue` en `tests/unit/components/comparecientes/ComparecienteFisicaForm.spec.ts`.
- [X] T011 [US1] Añadir entrada "Comparecientes" en la navegación lateral (`app/composables/useNavItems.ts`) con icono `mdi-account-group-outline` y validación de permiso `comparecientes.ver`.

---

## Phase 3: User Story 2 — Registro de Personas Morales y Beneficiario Controlador (Priority: P2)

**Goal**: Permitir registrar personas morales con datos constitutivos, folio mercantil, vinculación de apoderados y beneficiarios controladores CFF 32-B Quater.

**Independent Test**: Registrar una empresa con su RFC (12 dígitos), asociar a un apoderado del catálogo y capturar un beneficiario controlador con su porcentaje y criterio de control.

- [X] T012 [US2] Petición obligatoria a Stitch (MCP) para el diseño del formulario de Persona Moral con secciones desplegables para Representantes y Beneficiarios Controladores.
- [X] T013 [US2] Crear componentes modulares `app/components/comparecientes/RepresentantesSection.vue` y `app/components/comparecientes/BeneficiariosControladoresSection.vue`.
- [X] T014 [US2] Crear componente `app/components/comparecientes/ComparecienteMoralForm.vue` integrando los datos constitutivos, domicilio fiscal y las secciones de representantes y beneficiarios.
- [X] T015 [US2] Integrar `ComparecienteMoralForm.vue` en el diálogo de alta de `app/pages/comparecientes/index.vue` mediante pestañas "Persona Física" / "Persona Moral".
- [X] T016 [P] [US2] Tests unitarios de `ComparecienteMoralForm.vue` en `tests/unit/components/comparecientes/ComparecienteMoralForm.spec.ts`.

---

## Phase 4: User Story 3 — Búsqueda Predictiva y Asociación en Escrituras (Priority: P3)

**Goal**: Vincular ágilmente comparecientes existentes a cualquier escritura mediante búsqueda por RFC/nombre, restringiendo los roles estrictamente a los permitidos por el acto jurídico.

**Independent Test**: Desde la pestaña de comparecientes de una escritura de Compraventa, buscar a un cliente registrado, seleccionarlo y comprobar que el selector de roles solo muestra los permitidos para Compraventa.

- [X] T017 [US3] Petición obligatoria a Stitch (MCP) para el diseño ergonómico del selector modal de comparecientes y su vinculación en la vista de detalle de la escritura.
- [X] T018 [US3] Crear componente `app/components/comparecientes/ComparecienteSearchDialog.vue` que implementa la búsqueda predictiva contra la RPC `fn_buscar_comparecientes`, selector de rol filtrado por `acto_juridico_roles` y visibilidad condicional de alícuota/porcentaje exclusiva para roles adquirentes/receptores (oculta y en `null` para enajenantes).
- [X] T019 [US3] Refactorizar `app/components/escrituras/tabs/ComparecientesTab.vue` para reemplazar el campo de texto libre por el botón/buscador predictivo `ComparecienteSearchDialog.vue`, manteniendo el selector estricto de roles de `acto_juridico_roles`.
- [X] T020 [P] [US3] Tests unitarios de `ComparecienteSearchDialog.vue` (validando búsqueda RPC, emisión de rol/alícuota y ocultamiento/nulidad de alícuota para enajenantes) y actualización de `tests/unit/components/escrituras/ComparecientesTab.spec.ts`.

---

## Phase 5: User Story 4 — Ficha Histórica 360° del Compareciente (Priority: P4)

**Goal**: Visualizar en `/comparecientes/:id` el expediente completo del cliente y la lista cronológica de todas las escrituras en las que ha participado.

**Independent Test**: Acceder a la ficha de un cliente con 2 escrituras vinculadas y verificar que se listan con fecha, acto jurídico y rol desempeñado.

- [X] T021 [US4] Petición obligatoria a Stitch (MCP) para el diseño de la Ficha 360° del compareciente con pestañas de Datos Generales, Poderes / Beneficiario y Expediente de Escrituras.
- [X] T022 [US4] Crear página `app/pages/comparecientes/[id].vue` que cargue la información completa y consulte `escritura_comparecientes` con join a `escrituras` y `actos_juridicos`.
- [X] T023 [P] [US4] Tests unitarios de `app/pages/comparecientes/[id].vue` en `tests/unit/pages/comparecientes/detalle.spec.ts`.

---

## Phase 6: Polish, Seed & Verification

- [X] T024 Actualizar `supabase/seed.sql` con comparecientes representativos de prueba (físicas y morales con representantes y beneficiarios controladores) para pruebas inmediatas tras `supabase db reset`.
- [X] T025 Ejecutar los 4 escenarios de `quickstart.md` contra el stack Supabase local y registrar los resultados.
- [X] T026 Ejecutar la suite completa de pruebas unitarias (`./node_modules/.bin/vitest run`) asegurando 100% de tests en verde.

---

## Phase 7: Catálogo Administrable de Tipos de Identificación y Seeder

**Goal**: Permitir la administración y configuración de documentos oficiales con banderas OCR (`permite_ocr`, `requiere_reverso`), precargando los valores oficiales por defecto.

**Independent Test**: Navegar a `/administracion-general/tipos-identificacion`, verificar la lista con INE y Pasaporte configurados, y editar o agregar un tipo de identificación comprobando la persistencia.

- [X] T027 Crear migración `supabase/migrations/20260729000001_expediente_documentos_and_ocr_catalog.sql` agregando las columnas `permite_ocr` y `requiere_reverso` a `public.tipos_identificacion_oficial`, creando la tabla `public.expediente_documentos` y la vista dinámica `public.v_expediente_escritura` per `data-model.md`.
- [X] T028 Actualizar el seeder en `supabase/seed.sql` para precargar `tipos_identificacion_oficial` con INE (`permite_ocr: true, requiere_reverso: true`), Pasaporte (`permite_ocr: true, requiere_reverso: false`) y los restantes en `false` por defecto.
- [X] T029 [US5] Petición obligatoria a Stitch (MCP) para el diseño de la vista administrativa `/administracion-general/tipos-identificacion` con tabla, switches de OCR y modal de edición.
- [X] T030 [US5] Implementar página `app/pages/administracion-general/tipos-identificacion/index.vue` con Vuetify, validación de permisos `administracion.acceso` y operaciones CRUD contra Supabase.
- [X] T031 [P] [US5] Tests unitarios de la página de administración en `tests/unit/pages/administracion-general/tipos-identificacion.spec.ts`.

---

## Phase 8: Servicio de Reconocimiento OCR Multimodal

**Goal**: Implementar el endpoint de servidor Nuxt para procesar imágenes de identificaciones mexicanas (anverso y reverso para INE; carátula para pasaporte) y extraer automáticamente datos estructurados en formato JSON.

**Independent Test**: Invocar `POST /api/ocr/identificacion` con imágenes en base64 de credencial de elector y validar que retorna el JSON tipado con nombres, apellidos, CURP, RFC y domicilio desagregado.

- [X] T032 Implementar endpoint en servidor Nuxt `server/api/ocr/identificacion.post.ts` utilizando la API de Visión Multimodal (Gemini Vision API) para extracción de datos estructurados de INE y Pasaporte en JSON tipado.
- [X] T033 [P] Tests unitarios de la ruta OCR en `tests/unit/server/api/ocr/identificacion.spec.ts` validando respuestas exitosas, manejo de credenciales inválidas y validación de payload.

---

## Phase 9: Flujo Asistido "OCR-First" y Repositorio Documental KYC

**Goal**: Incorporar el asistente de captura guiada con escaneo de identificación oficial (anverso/reverso), almacenamiento permanente en Supabase Storage y pre-llenado de datos del compareciente con opción de bypass manual.

**Independent Test**: Abrir el modal de registro de persona física, subir fotos de credencial INE, verificar la extracción y pre-llenado automático de campos, y comprobar que las imágenes quedan registradas en `expediente_documentos`.

- [X] T034 [US1] Petición obligatoria a Stitch (MCP) para el diseño del componente asistente "OCR-First" de carga de identificación con drag-and-drop (anverso/reverso) y pre-llenado de datos.
- [X] T035 [US1] Crear componente `app/components/comparecientes/IdentificacionOcrAssistant.vue` con soporte para anverso y reverso condicional según `requiere_reverso`, barra de progreso y botón de bypass manual.
- [X] T036 [US1] Crear composable `app/composables/useExpedienteDocumentos.ts` para subir imágenes a Supabase Storage y registrar metadatos en `public.expediente_documentos`.
- [X] T037 [US1] Integrar `IdentificacionOcrAssistant.vue` y `useExpedienteDocumentos.ts` en `app/components/comparecientes/ComparecienteFisicaForm.vue` para pre-poblar los campos tras el escaneo.
- [X] T038 [P] [US1] Tests unitarios de `IdentificacionOcrAssistant.vue` y `useExpedienteDocumentos.ts` en `tests/unit/components/comparecientes/IdentificacionOcrAssistant.spec.ts`.

---

## Phase 10: Vinculación Dinámica al Expediente y Verificación Final

**Goal**: Verificar que las identificaciones de comparecientes se proyectan automáticamente en tiempo real en los expedientes de las escrituras vinculadas (`v_expediente_escritura`) sin duplicidad física de archivos.

**Independent Test**: Consultar el expediente de una escritura con un compareciente asociado y confirmar que sus fotos de identificación figuran en la lista; desvincular al compareciente y comprobar que dejan de figurar de inmediato.

- [X] T039 [US3] Actualizar la consulta de documentos del expediente en `app/components/escrituras/` para consumir `public.v_expediente_escritura`, verificando el etiquetado dinámico de identificaciones aportadas por comparecientes.
- [X] T040 Ejecutar los escenarios 5 y 6 de `specs/04-comparecientes/quickstart.md` contra el stack Supabase local.
- [X] T041 Ejecutar la suite completa de pruebas unitarias (`./node_modules/.bin/vitest run`) asegurando 100% de tests en verde.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 7 (Catálogo e Identificaciones)**: Depende de Phase 1-6 (ya completadas). Puede iniciar inmediatamente.
- **Phase 8 (Servicio OCR Multimodal)**: Puede implementarse en paralelo con Phase 7 (archivos de backend y Nuxt Server Route).
- **Phase 9 (Flujo Asistido OCR-First)**: Depende de Phase 7 (catálogo y migraciones) y Phase 8 (endpoint OCR listo para consumo).
- **Phase 10 (Vinculación y Verificación)**: Depende de Phase 9 para verificar el flujo de extremo a extremo y la ejecución de tests.

### Parallel Opportunities

- `T027` (migración) y `T032` (endpoint OCR de Nuxt) pueden codificarse de forma concurrente.
- `T031` (tests de catálogo) y `T033` (tests de endpoint OCR) son paralelizables.
- `T038` (tests del asistente OCR) se ejecuta de forma aislada sin dependencias externas.

---

## Implementation Strategy

### Enfoque Incremental

1. **Paso 1 (Fundación de Datos y Catálogo)**: Migración SQL (`expediente_documentos`, `v_expediente_escritura`, flags OCR) + Seeder + Pantalla administrativa `/administracion-general/tipos-identificacion` con diseño previo en Stitch.
2. **Paso 2 (Motor OCR)**: Endpoint de servidor Nuxt `/api/ocr/identificacion` con Visión Multimodal y validación con tests unitarios.
3. **Paso 3 (Experiencia de Usuario OCR-First)**: Prototipado Stitch del asistente + Componente Vue `IdentificacionOcrAssistant.vue` + Integración en `ComparecienteFisicaForm.vue` + Storage.
4. **Paso 4 (Validación de Integración)**: Consulta en `v_expediente_escritura`, pruebas de los escenarios 5 y 6 de `quickstart.md` y ejecución de Vitest.

