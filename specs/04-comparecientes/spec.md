# Feature Specification: 04-comparecientes (Catálogo Global de Comparecientes y Fiscalización Notarial)

**Feature Branch**: `04-comparecientes`

**Created**: 2026-09-14

**Status**: Clarified

**Input**: El módulo de comparecientes debe ser un catálogo global e independiente para la notaría pública, no una captura rápida o de texto simple dentro de la escritura. Un compareciente puede intervenir en múltiples escrituras a lo largo del tiempo. Se requiere captura completa de datos fiscales y legales para personas físicas y morales (RFC con homoclave, CURP, estado conyugal, régimen patrimonial, nacionalidad, ocupación, domicilio completo, identificación oficial, poderes de representación y beneficiario controlador CFF 32-B Quater), garantizando el cumplimiento normativo notarial y la fiscalización SAT/UIF.
---

## Clarifications

### Session 2026-09-15

- Q: ¿Qué arquitectura o motor se debe utilizar para el OCR y la extracción estructurada de datos desde identificaciones mexicanas (INE/IFE y pasaportes)? → A: Opción A - Nuxt Server Route con Visión Multimodal (Gemini Vision API / `/api/ocr/identificacion`) procesando la imagen en el backend y retornando un esquema JSON estructurado con los datos de filiación, CURP, RFC, clave de elector, vigencia y domicilio.
- Q: ¿Cómo debe estructurarse el flujo de captura asistida por identificación y el almacenamiento de las imágenes en el expediente del compareciente? → A: Opción A - Flujo asistido "OCR-First" con bypass manual. El alta de personas físicas inicia solicitando anverso/reverso de la identificación para pre-llenar los campos vía OCR, almacenando el archivo sin duplicidad en el repositorio documental para su vinculación dinámica a las escrituras.
- Q: ¿Qué mecanismo técnico de vinculación dinámica se debe emplear para que los documentos de identificación del compareciente aparezcan en el expediente de la escritura sin duplicar archivos ni requerir sincronización manual? → A: Opción A - Vista Dinámica SQL (`v_expediente_escritura`). Los archivos físicos se almacenan una sola vez bajo el compareciente y la vista SQL une en tiempo real los documentos propios de la escritura con los de comparecientes activos en `escritura_comparecientes`. Al desvincular un compareciente de una escritura, la relación desaparece al instante de forma nativa sin duplicación en storage ni triggers.
- Q: ¿Qué configuración y atributos debe soportar el catálogo de tipos de identificación oficial en el panel de administración? → A: Opción A - Catálogo enriquecido con flags operativas de OCR (`permite_ocr`, `requiere_reverso`, `activo`) editable en `/administracion-general/tipos-identificacion`. Se establece el seeder inicial con `ine` (`permite_ocr: true`, `requiere_reverso: true`), `pasaporte` (`permite_ocr: true`, `requiere_reverso: false`), y las demás (`cedula_profesional`, `cartilla_militar`, `forma_migratoria`) con ambas en `false` por defecto.
- Q: ¿Cómo debe restringirse la visibilidad y captura de la alícuota/porcentaje de participación según el rol del compareciente en la escritura? → A: Opción A - Exclusiva para roles adquirentes/receptores. El campo de porcentaje de alícuota solo es visible y editable cuando el rol seleccionado corresponde a la adquisición o recepción de derechos (`adquiriente`, `donatario`, `cesionario`, `heredero`, `permutuario`, etc.). Para `enajenante`, apoderados, testigos y demás roles permanece oculto y se guarda como `null`.

---

## User Scenarios & Testing

### User Story 1 - Catálogo y Registro Completo de Personas Físicas (Priority: P1) 🎯 MVP

Como abogado o auxiliar notarial, quiero dar de alta o consultar una persona física en el catálogo global con todos sus datos de identificación civil y fiscal, para contar con un expediente KYC fidedigno reutilizable en cualquier instrumento notarial.

**Why this priority**: Es la base indispensable de la fe pública y la fiscalización. Sin la identificación y validación rigurosa de personas físicas no puede haber cumplimiento PLD/UIF, expedientes ni protocolización válida.

**Independent Test**: Registrar una persona física con su RFC (con homoclave), CURP, estado civil, régimen patrimonial, domicilio e identificación oficial, y comprobar que queda disponible en el catálogo global con validación de formato y unicidad de identificadores.

**Acceptance Scenarios**:
1. **Given** un usuario con permiso `comparecientes.crear`, **When** captura una Persona Física con RFC válido de 13 dígitos y CURP de 18 caracteres, **Then** el sistema valida los formatos y guarda al compareciente en el catálogo global asignándole su identificador único.
2. **Given** un compareciente registrado como casado, **When** se captura su estado civil, **Then** el sistema exige seleccionar el régimen patrimonial (Sociedad Conyugal, Separación de Bienes o Sociedad Legal).
3. **Given** un intento de registro con un RFC o CURP ya existente en el catálogo, **When** se intenta guardar, **Then** el sistema alerta sobre la duplicidad y ofrece abrir el perfil existente para evitar duplicar clientes en la notaría.

---

### User Story 2 - Registro de Personas Morales, Representantes y Beneficiario Controlador (Priority: P2)

Como notario o abogado, quiero registrar personas morales con sus datos constitutivos, sus representantes legales facultados y sus beneficiarios controladores conforme al Art. 32-B Quater del CFF, para acreditar debidamente la personalidad jurídica y cumplir con las disposiciones fiscales.

**Why this priority**: Las operaciones corporativas e inmobiliarias con personas morales exigen documentar la representación orgánica/voluntaria y la transparencia fiscal sobre quién ejerce el control real de la entidad.

**Independent Test**: Registrar una Persona Moral con su RFC (12 caracteres), escritura constitutiva y folio mercantil; vincular a un apoderado (persona física del catálogo) especificando sus facultades, y declarar al menos un beneficiario controlador con su porcentaje o mecanismo de control.

**Acceptance Scenarios**:
1. **Given** una Persona Moral en captura, **When** se guardan sus datos constitutivos (razón social, RFC, número de instrumento constitutivo, notario/corredor, folio mercantil), **Then** el registro queda creado bajo la clasificación `moral`.
2. **Given** una Persona Moral registrada, **When** se asocia un representante legal, **Then** el representante se selecciona del catálogo de personas físicas, especificando el tipo de poder (dominio, administración, pleitos y cobranzas) y el documento donde consta la facultad.
3. **Given** una Persona Moral que realiza una operación notarial, **When** se captura la sección fiscal, **Then** se requiere documentar el beneficiario controlador (identificación, porcentaje de participación o medio de control efectivo).

---

### User Story 3 - Búsqueda, Selección y Asociación a Escrituras con Roles Filtrados (Priority: P3)

Como usuario capturando una escritura, quiero buscar comparecientes existentes en el catálogo global (por RFC, CURP o Nombre/Razón Social) y asociarlos con el rol específico permitido para el acto jurídico de la escritura, para evitar capturas repetidas y garantizar integridad operativa.

**Why this priority**: Conecta el catálogo global con la entidad raíz (`Escrituras`), haciendo eficiente el día a día de la notaría y respetando el catálogo configurable de roles por acto jurídico (`acto_juridico_roles`).

**Independent Test**: Desde la pestaña de Comparecientes de una escritura de Compraventa, buscar un compareciente existente por RFC, seleccionarlo, comprobar que la lista de roles solo muestra los permitidos para Compraventa (`ADQUIRIENTE`, `ENAJENANTE`, etc.), y asociarlo con su porcentaje de participación.

**Acceptance Scenarios**:
1. **Given** una escritura abierta en borrador, **When** el usuario escribe en el buscador de comparecientes, **Then** el sistema muestra coincidencias del catálogo global por RFC, CURP o nombre en tiempo real.
2. **Given** un compareciente seleccionado en una escritura, **When** se abre el selector de rol, **Then** solo se listan los roles configurados en `acto_juridico_roles` para el acto jurídico de dicha escritura.
3. **Given** un cliente que interviene por primera vez, **When** no aparece en el buscador de la escritura, **Then** el usuario puede abrir el formulario modal de alta rápida completa, registrarlo en el catálogo global y asociarlo a la escritura en el mismo flujo sin salir de la página.
4. **Given** un compareciente asociado con rol no adquirente (ej. `ENAJENANTE`, apoderado, testigo), **When** se evalúa el formulario de vinculación, **Then** el campo de alícuota/porcentaje se oculta y persiste como `null`; mostrándose y permitiéndose capturar exclusivamente para roles adquirentes/receptores (`ADQUIRIENTE`, `DONATARIO`, `CESIONARIO`, `HEREDERO`, `PERMUTUARIO`, etc.).

---

### User Story 4 - Ficha Histórica 360° del Compareciente (Priority: P4)

Como administrador o abogado notarial, quiero consultar la ficha de un compareciente en `/comparecientes/:id` para ver su historial completo de escrituras, roles desempeñados, estatus de cumplimiento PLD y documentos aportados.

**Why this priority**: Aporta visión integral del cliente para diligencia reforzada, seguimiento comercial y auditorías de la autoridad (SAT / UIF).

**Independent Test**: Acceder a la ficha de un compareciente que ha intervenido en 3 escrituras distintas y verificar que se listan con sus respectivos números de instrumento, fechas, actos jurídicos y roles desempeñados.

**Acceptance Scenarios**:
1. **Given** un compareciente con múltiples operaciones históricas, **When** se visualiza su detalle en `/comparecientes/:id`, **Then** se presenta la tabla cronológica de escrituras vinculadas con enlace directo a cada una.

---

## Edge Cases

- **Nombres extranjeros o sin segundo apellido**: El sistema debe permitir registrar personas físicas extranjeras que carecen de segundo apellido o de CURP, solicitando en su lugar documento migratorio (forma migratoria / pasaporte) y país de nacionalidad.
- **RFC genérico o en trámite**: Casos excepcionales contemplados por el SAT (RFC genérico nacional `XAXX010101000` o extranjero `XEXX010101000`) deben requerir justificación documentada.
- **Representante que es a su vez compareciente a título personal**: Una misma persona física puede comparecer en una escritura en dos calidades distintas (ej. por propio derecho y en representación de una persona moral). El sistema debe permitir asociar a la persona dos veces con roles y facultades diferenciadas en el mismo instrumento.
- **Cambio de denominación o razón social**: Posibilidad de registrar histórico de razones sociales previas de una persona moral sin perder la trazabilidad de su RFC.

---

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE proveer un catálogo global de comparecientes accesible desde `/comparecientes`, independiente de las escrituras individuales.
- **FR-002**: Todo compareciente DEBE clasificarse obligatoriamente como Persona Física (`tipo_persona = 'fisica'`) o Persona Moral (`tipo_persona = 'moral'`).
- **FR-003**: Para Personas Físicas, el sistema DEBE capturar y validar:
  - Nombre(s), primer apellido (obligatorio), segundo apellido (opcional).
  - RFC (13 caracteres alfanuméricos con estructura válida de fecha y homoclave).
  - CURP (18 caracteres conforme al algoritmo RENAPO, opcional para extranjeros).
  - Fecha de nacimiento, género, país de nacimiento y nacionalidad.
  - Estado civil (`soltero`, `casado`, `divorciado`, `viudo`, `union_libre`).
  - Régimen patrimonial obligatorio si el estado civil es `casado` (`sociedad_conyugal`, `separacion_bienes`, `sociedad_legal`).
  - Ocupación o actividad económica preponderante.
  - Domicilio desglosado: calle, número exterior, número interior, colonia, código postal, municipio/alcaldía, entidad federativa y país.
  - Identificación oficial: tipo (INE, Pasaporte, Cédula Profesional, Cartilla, Forma Migratoria), número/folio y fecha de vigencia.
  - Datos de contacto: correo electrónico y teléfono(s).
- **FR-004**: Para Personas Morales, el sistema DEBE capturar y validar:
  - Denominación o razón social.
  - RFC (12 caracteres alfanuméricos).
  - Fecha de constitución y nacionalidad.
  - Instrumento constitutivo: número de escritura/póliza, fecha, fedatario público (número y plaza).
  - Datos de inscripción registral: folio mercantil electrónico o folio real ante RPP/RPC.
  - Objeto social principal.
  - Domicilio fiscal completo.
- **FR-005**: El sistema DEBE permitir vincular a una Persona Moral uno o más representantes legales/apoderados (seleccionados de personas físicas del catálogo), especificando:
  - Tipo de facultades otorgadas (actos de dominio, administración, pleitos y cobranzas, títulos de crédito).
  - Instrumento notarial donde constan los poderes (número, fecha, notario y facultades especiales).
  - Vigencia o estatus de revocación del poder.
- **FR-006**: El sistema DEBE permitir registrar los Beneficiarios Controladores de las personas morales (Art. 32-B Quater CFF), documentando el porcentaje de participación accionaria o el criterio de control directo/indirecto.
- **FR-007**: En la captura de escrituras (`/escrituras/:id`), la pestaña de Comparecientes DEBE permitir:
  - Búsqueda predictiva con autocompletado en el catálogo global por RFC, CURP o Nombre.
  - Selección de rol restringida estrictamente a los roles configurados para el acto jurídico de la escritura en `acto_juridico_roles`.
  - Captura opcional de porcentaje de alícuota/participación (`> 0` y `<= 100`) EXCLUSIVA para roles adquirentes/receptores de derechos (`adquiriente`, `donatario`, `cesionario`, `heredero`, `permutuario`, etc.). Para `enajenante`, apoderados, representantes y testigos, el campo DEBE permanecer oculto y registrarse en base de datos como `null`.
- **FR-008**: Al dar de baja o inactivar un compareciente en el catálogo global, el sistema DEBE impedir su eliminación física si tiene escrituras asociadas (`ON DELETE RESTRICT`), preservando íntegra la memoria histórica del protocolo.
- **FR-009**: La seguridad y permisos DEBEN regirse por `fn_has_permiso('comparecientes', accion, escritura_id)`:
  - Auxiliares con alcance `propias` solo pueden asociar o editar comparecientes en sus escrituras asignadas.
  - Administradores y Gestores pueden gestionar y consultar el catálogo global completo.
- **FR-010**: El sistema DEBE ofrecer un endpoint en el servidor (`/api/ocr/identificacion`) con capacidades de visión multimodal para procesar imágenes de identificaciones oficiales (anverso y reverso para INE/IFE; página de datos para Pasaporte) y extraer automáticamente en JSON los campos del compareciente (`nombres`, `primer_apellido`, `segundo_apellido`, `curp`, `rfc`, `clave_elector`, `vigencia`, `domicilio`).
- **FR-011**: El modal de alta de compareciente (persona física) DEBE implementar un flujo asistido "OCR-First", solicitando en primer término la carga de la identificación oficial (anverso y reverso para credencial de elector; carátula para pasaporte) para pre-llenar los campos del formulario de forma inmediata, proporcionando simultáneamente una opción explícita de captura manual para no bloquear el proceso en caso de no contar con el documento.
- **FR-012**: Las imágenes de identificaciones oficiales capturadas DEBEN almacenarse en Supabase Storage (bucket `expedientes_comparecientes` o ruta `comparecientes/:id/identificaciones/`) registradas en `expediente_documentos`. El sistema DEBE exponer una vista SQL (`v_expediente_escritura`) que enlace en tiempo real y sin duplicidad de almacenamiento los documentos de los comparecientes asociados a cada escritura, de modo que al desvincular un compareciente de una escritura, sus documentos dejen de figurar automáticamente en el expediente de la misma.
- **FR-013**: El catálogo de tipos de identificación oficial (`tipos_identificacion_oficial`) DEBE ser administrable desde `/administracion-general/tipos-identificacion` permitiendo gestionar altas, modificaciones, bajas lógicas (`activo`) y la configuración de OCR (`permite_ocr: boolean`, `requiere_reverso: boolean`). El seeder inicial por defecto DEBE precargar:
  - `ine`: `nombre: 'Credencial para Votar (INE/IFE)'`, `permite_ocr: true`, `requiere_reverso: true`.
  - `pasaporte`: `nombre: 'Pasaporte Mexicano o Extranjero'`, `permite_ocr: true`, `requiere_reverso: false`.
  - `cedula_profesional`: `nombre: 'Cédula Profesional'`, `permite_ocr: false`, `requiere_reverso: false`.
  - `cartilla_militar`: `nombre: 'Cartilla del Servicio Militar Nacional'`, `permite_ocr: false`, `requiere_reverso: false`.
  - `forma_migratoria`: `nombre: 'Forma Migratoria (FM2 / FM3 / Residencia)'`, `permite_ocr: false`, `requiere_reverso: false`.

---

### Key Entities

- **`comparecientes` (entidad base unificada)**:
  - `id uuid PK`
  - `tipo_persona enum ('fisica', 'moral')`
  - `rfc text` (índice único parcial para no vacíos)
  - `email text`, `telefono text`
  - `activo boolean default true`
  - `created_at`, `updated_at`, `created_by`
- **`compareciente_personas_fisicas`**:
  - `compareciente_id uuid PK FK -> comparecientes(id)`
  - `nombres text not null`, `primer_apellido text not null`, `segundo_apellido text`
  - `curp text` (índice único parcial)
  - `fecha_nacimiento date`, `genero text`, `nacionalidad text not null`
  - `estado_civil text not null`, `regimen_patrimonial text`
  - `ocupacion text`
  - `tipo_identificacion text`, `folio_identificacion text`, `vigencia_identificacion date`
  - Domicilio: `calle`, `numero_exterior`, `numero_interior`, `colonia`, `codigo_postal`, `municipio`, `entidad_federativa`, `pais`
- **`compareciente_personas_morales`**:
  - `compareciente_id uuid PK FK -> comparecientes(id)`
  - `razon_social text not null`
  - `fecha_constitucion date`, `nacionalidad text not null`
  - `folio_mercantil text`
  - `instrumento_constitutivo text`, `fecha_instrumento date`, `notario_constitucion text`
  - `objeto_social text`
  - Domicilio fiscal: `calle`, `numero_exterior`, `numero_interior`, `colonia`, `codigo_postal`, `municipio`, `entidad_federativa`, `pais`
- **`compareciente_representantes`**:
  - `id uuid PK`
  - `persona_moral_id uuid FK -> comparecientes(id)`
  - `representante_fisica_id uuid FK -> comparecientes(id)`
  - `tipo_poder text not null`
  - `instrumento_poder text`, `fecha_poder date`, `notario_poder text`
  - `vigente boolean default true`
- **`compareciente_beneficiarios_controladores`**:
  - `id uuid PK`
  - `persona_moral_id uuid FK -> comparecientes(id)`
  - `beneficiario_fisica_id uuid FK -> comparecientes(id)`
  - `porcentaje_participacion numeric(5,2)`
  - `criterio_control text not null` (titularidad de acciones, derechos de voto, designación de directores)
- **`escritura_comparecientes` (tabla puente existente actualizada)**:
  - `id uuid PK`
  - `escritura_id uuid FK -> escrituras(id)`
  - `compareciente_id uuid FK -> comparecientes(id)`
  - `rol_id uuid FK -> roles_compareciente(id)`
  - `porcentaje_participacion numeric(5,2)`
- **`expediente_documentos` (entidad documental unificada)**:
  - `id uuid PK`
  - `entidad_tipo text not null` (`'compareciente'` | `'escritura'`)
  - `entidad_id uuid not null` (FK a `comparecientes.id` o `escrituras.id`)
  - `categoria text not null` (`'identificacion_oficial'`, `'comprobante_domicilio'`, `'acta_constitutiva'`, etc.)
  - `lado text` (opcional: `'anverso'`, `'reverso'`, `'completo'`)
  - `archivo_nombre text not null`, `archivo_path text not null`, `mime_type text`, `size_bytes bigint`
  - `metadata jsonb default '{}'::jsonb`
  - `created_at timestamptz default now()`, `created_by uuid`
- **`v_expediente_escritura` (vista SQL dinámica)**:
  - Vista que une los documentos directos de la escritura con los documentos de comparecientes actualmente vinculados en `escritura_comparecientes`, con campos descriptivos de origen (`origen_documento`, `compareciente_id`, `compareciente_nombre`).
- **`tipos_identificacion_oficial` (catálogo administrable)**:
  - `id uuid PK`
  - `codigo text not null unique`
  - `nombre text not null`
  - `permite_ocr boolean default false`
  - `requiere_reverso boolean default false`
  - `activo boolean default true`
  - `created_at timestamptz default now()`

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: El tiempo de vinculación de un compareciente previamente existente a una nueva escritura se reduce a menos de 15 segundos mediante la búsqueda predictiva por RFC o nombre.
- **SC-002**: 100% de los comparecientes registrados cuentan con validación algorítmica de RFC y CURP, eliminando errores de captura fiscal.
- **SC-003**: Cero inconsistencias de roles: el 100% de las asociaciones de comparecientes en escrituras corresponden exclusivamente a la lista de roles permitidos del acto jurídico configurado.
- **SC-004**: Toda la información de KYC necesaria para la evaluación de listas PLD (nombre, apellidos, RFC, CURP, razón social) queda estructurada para alimentar de forma directa el siguiente módulo (`05-pld`).

---

## Assumptions

- Se asume el catálogo de entidades federativas y municipios de México para estandarización de domicilios.
- La validación de RFC y CURP valida formato regular (regex) y dígitos de control; no requiere conexión síncrona en tiempo real con la base de datos del SAT/RENAPO en esta fase.
- La captura completa de comparecientes se realiza con componentes diseñados previamente en Stitch respetando la paleta institucional (`#1B3A5F`, `#A9762E`) y la densidad compacta propia del trabajo notarial.
