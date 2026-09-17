# Feature Specification: 06-expedientes (Expedientes Digitales Notariales, Requisitos por Acto y Cotejo Notarial)

**Feature Branch**: `06-expedientes`

**Created**: 2026-09-15

**Status**: Ready for Planning

**Input**: User description: "Implementar el módulo de Expedientes Digitales Notariales conforme a la Constitución del sistema (§3, §4, §5, §8). Incluye catálogo de requisitos documentales configurables por tipo de acto jurídico (obligatorios y opcionales), checklist y semáforo de integración documental, repositorio documental organizado por categorías (Inmueble/Objeto, Comparecientes/KYC proyectado sin duplicidad, Fiscales/Pagos e Internos), marcaje de fe de cotejo notarial contra original exhibido con sellado de usuario/fecha, visor integrado de documentos (PDF e imágenes), descarga mediante URLs firmadas, descarga selectiva en ZIP o compilación de PDF único, preparación de ganchos de auditoría para registro de descargas e integración con el gate de protocolización."

---

## Clarifications

### Session 2026-09-15

- Q: ¿Cómo debe actuar el gate de protocolización si la escritura carece de algún documento catalogado como "obligatorio" para sus actos jurídicos? → A: **Opción A - Bloqueo estricto con dispensa notarial fundada**. La función de validación impide protocolizar si falta algún documento obligatorio para los actos jurídicos de la escritura, a menos que el Notario Titular o Administrador registre una dispensa notarial fundada (capturando motivo, fecha y firma de auditoría inmutable).
- Q: ¿Debe ser obligatorio que los documentos cargados cuenten con fe de cotejo notarial para permitir la protocolización? → A: **Opción A - Obligatorio sólo en documentos de propiedad y representación (títulos y poderes)**. Los documentos críticos (títulos antecedentes de propiedad y poderes notariales) exigen cotejo físico contra original exhibido (`cotejado_contra_original = true` o `copia_certificada`) para permitir protocolizar; los documentos complementarios (boletas prediales, recibos de agua, pagos o identificaciones generales) pueden acreditarse en copia simple sin bloquear la protocolización.
- Q: ¿Cómo debe estructurarse la descarga consolidada del expediente notarial y qué formato debe admitir? → A: **Selección flexible en ZIP + Compilación en PDF único + Preparación para auditoría posterior**.
  1. El expediente permite la descarga en archivo comprimido ZIP seleccionando libremente los archivos requeridos (selección múltiple o todos), organizados con su manifiesto de contenido.
  2. Adicionalmente, el sistema permite generar y descargar un archivo PDF compilado único que concatena todos los documentos agregables (PDFs e imágenes legibles) precedido de una carátula notarial con el inventario de documentos y sellos de cotejo.
  3. Por seguridad, se deja preparada la estructura y emisión de eventos de auditoría para registrar el evento de descarga o reporte (identificador de escritura, tipo de descarga, usuario autenticado, fecha/hora y lista de documentos incluidos), lista para conectarse al módulo de auditoría general.

---

## User Scenarios & Testing

### User Story 1 - Catálogo de Requisitos por Acto y Semáforo de Integración Documental (Priority: P1) 🎯 MVP

Como abogado o auxiliar notarial, quiero que el sistema me presente la lista de requisitos documentales exigibles para la escritura según sus actos jurídicos asociados, mostrando el estado de cada documento (cargado, pendiente, faltante) y un semáforo de integración general, para saber de inmediato qué documentos faltan antes de avanzar en el trámite.

**Why this priority**: Es la base operativa del expediente notarial. Sin una matriz clara de qué documentos exige cada acto jurídico (e.g. Compraventa vs Donación vs Testamento vs Sociedad), el personal no sabe qué solicitar a los clientes ni cuándo un expediente está listo para firma.

**Independent Test**: Abrir una escritura con acto de Compraventa, verificar que el sistema despliega automáticamente los requisitos documentales típicos (Título antecedente, Boleta Predial, Constancia de Agua, Certificado de Libertad de Gravámenes, etc.), adjuntar un documento a uno de los requisitos y comprobar que el semáforo de avance se actualiza en tiempo real.

**Acceptance Scenarios**:
1. **Given** una escritura con uno o más actos jurídicos asignados, **When** el usuario consulta la pestaña "Expediente", **Then** el sistema presenta el checklist de requisitos documentales agrupados por categoría, diferenciando entre requisitos "Obligatorios" y "Opcionales/Condicionados".
2. **Given** un requisito documental pendiente (e.g. "Boleta Predial vigente"), **When** el usuario carga el archivo correspondiente o asocia uno ya existente, **Then** el requisito cambia su estado a "Cargado" y el indicador de porcentaje de integración documental se recalcula.
3. **Given** una escritura con todos sus requisitos obligatorios satisfechos, **When** se evalúa el estado del expediente, **Then** el semáforo muestra "Completo (Obligatorios)" (verde) permitiendo continuar hacia la protocolización; si falta al menos un obligatorio, muestra "Incompleto (Faltan N obligatorios)" (rojo).
4. **Given** un acto jurídico con requisitos específicos de comparecientes (e.g. identificación oficial y constancia fiscal de cada otorgante), **When** se evalúa el checklist, **Then** el sistema valida que cada compareciente vinculado tenga sus documentos KYC cargados sin duplicar archivos.

---

### User Story 2 - Repositorio Documental, Categorización y Visor en Línea (Priority: P2)

Como usuario del sistema, quiero subir, consultar y previsualizar directamente en la plataforma cualquier documento del expediente (PDFs o imágenes de títulos, planos, avalúos, boletas o comprobantes), con descarga segura mediante URLs firmadas temporales, para evitar descargar archivos a discos locales no seguros.

**Why this priority**: Centraliza la custodia de documentos en Supabase Storage privado con control de acceso por roles, mejorando la seguridad, la ergonomía y la velocidad de consulta del equipo notarial.

**Independent Test**: Subir un archivo PDF de avalúo comercial al expediente de una escritura, hacer clic en el botón de "Visualizar" y comprobar que se abre el visor integrado con navegación o zoom, y verificar que el enlace de descarga utiliza una URL firmada con vigencia temporal.

**Acceptance Scenarios**:
1. **Given** la pestaña de Expediente, **When** el usuario selecciona "Subir Documento", **Then** el sistema permite seleccionar la categoría (Inmueble/Objeto, Fiscales/Pagos, Internos/Trámite, Compareciente), el tipo de documento y el archivo (PDF, JPEG, PNG) con validación de tamaño máximo (e.g. 25 MB) y tipo MIME permitido.
2. **Given** un documento cargado en el expediente, **When** el usuario presiona "Visualizar", **Then** se abre un visor modal integrado que renderiza el PDF o imagen directamente sin forzar la descarga en el equipo del usuario.
3. **Given** un usuario que requiere descargar un documento individual, **When** hace clic en "Descargar", **Then** el sistema solicita una URL firmada segura a Supabase Storage con expiración de 60 segundos y lanza la descarga.
4. **Given** la vista de documentos del expediente, **When** el usuario filtra por categoría o compareciente, **Then** la lista filtra reactivamente los documentos correspondientes sin recargar la página.

---

### User Story 3 - Fe Notarial de Cotejo contra Original Exhibido (Priority: P3)

Como Notario Titular o abogado cotejador, quiero certificar con fe pública notarial que un documento digitalizado fue cotejado contra el documento original físico que tuve a la vista en la notaría (o copia certificada legalmente válida), registrando sello de usuario, fecha y notas de cotejo, para conferirle validez formal dentro del protocolo.

**Why this priority**: Es el núcleo de la función notarial. Una copia simple digitalizada no hace prueba plena en juicio ni ante el Registro Público; el cotejo notarial asienta la fe pública de que el documento digital corresponde fielmente a su original exhibido.

**Independent Test**: Seleccionar un documento del expediente (e.g. Título de Propiedad), abrir la acción "Asentar Cotejo Notarial", seleccionar "Original exhibido", registrar observaciones y confirmar; el sistema estampa la insignia de "Cotejado contra original" con fecha, hora y usuario cotejador inmutable.

**Acceptance Scenarios**:
1. **Given** un documento cargado en el expediente de la escritura, **When** un usuario con permiso notarial abre el modal de cotejo, **Then** el sistema permite seleccionar el tipo de documento exhibido (`original`, `copia_certificada`, `copia_simple`), ingresar notas u observaciones del cotejo y confirmar la acción.
2. **Given** la confirmación del cotejo, **When** se guarda el registro, **Then** el sistema estampa de manera inmutable el usuario cotejador (`cotejado_por`), la marca temporal (`fecha_cotejo`), el estatus `cotejado_contra_original = true` y las notas.
3. **Given** la tabla y tarjetas de documentos del expediente, **When** un documento cuenta con cotejo notarial, **Then** la interfaz exhibe una insignia institucional dorada/verde "Cotejado contra Original" con tooltip informativo que detalla quién y cuándo realizó el cotejo.
4. **Given** un documento marcado como cotejado, **When** un usuario intenta modificar o sobrescribir el archivo binario, **Then** el sistema bloquea la alteración para preservar la integridad de la fe notarial concedida.

---

### User Story 4 - Descarga Selectiva en ZIP, PDF Compilado Único y Gate de Protocolización (Priority: P4)

Como Notario o Gestor, quiero descargar los documentos seleccionados en un paquete ZIP o generar un único PDF consolidado con todos los documentos para entrega a clientes o dependencias, garantizando que la escritura no pueda protocolizarse si carece de documentos obligatorios o del cotejo físico de títulos y poderes, salvo dispensa fundada del Notario Titular.

**Why this priority**: Cierra el ciclo de vida del expediente digital antes de la autorización definitiva, proveyendo herramientas ágiles de exportación y resguardando la responsabilidad notarial con trazabilidad de auditoría.

**Independent Test**: Seleccionar documentos específicos y descargarlos en ZIP; luego compilar un PDF único con carátula de cotejos; finalmente intentar protocolizar con faltantes para comprobar el bloqueo y su liberación mediante dispensa notarial.

**Acceptance Scenarios**:
1. **Given** la lista de documentos del expediente, **When** el usuario selecciona uno o varios documentos (o "Seleccionar todos") y pulsa "Descargar como ZIP", **Then** el sistema empaqueta únicamente los archivos seleccionados en un ZIP con su manifiesto de contenido y emite el evento de auditoría correspondiente.
2. **Given** el expediente de la escritura, **When** el usuario pulsa "Compilar Expediente en PDF", **Then** el sistema ensambla en un único archivo PDF todos los documentos integrables precedidos de una carátula notarial con el inventario y estatus de cotejo, registrando el evento de auditoría.
3. **Given** una escritura en borrador con documentos obligatorios faltantes, **When** se invoca `fn_validar_protocolizacion`, **Then** la función bloquea el cambio de estado; si el Notario Titular o Administrador aprueba una "Dispensa Notarial Fundada" (capturando motivo y justificación), el bloqueo se levanta con registro inmutable.
4. **Given** una escritura donde el título de propiedad o algún poder notarial carece de fe de cotejo (`cotejado_contra_original = false`), **When** se evalúa la protocolización, **Then** el sistema bloquea el instrumento requiriendo asentar el cotejo contra original o registrar la dispensa notarial respectiva.

---

## Edge Cases

- **Múltiples Actos Jurídicos en una Misma Escritura**: Cuando una escritura incluye más de un acto (e.g. *Compraventa* + *Apertura de Crédito con Garantía Hipotecaria* + *Cancelación de Hipoteca anterior*), la lista de requisitos documentales consolida los requisitos de todos los actos sin duplicar los comunes (e.g. el título de propiedad o la boleta predial solo se solicitan y suben una sola vez).
- **Archivos No Compilables en PDF**: Si algún archivo adjunto no es compatible con la compilación en PDF (e.g. archivo no compatible con canvas o formatos binarios externos), el sistema lo excluye de la compilación, documenta su omisión en la carátula resumen del PDF y asegura su inclusión en la descarga ZIP.
- **Sustitución de Documentos ya Cotejados**: Si por error se cargó un documento equivocado y ya fue cotejado notarialmente, el sistema no permite borrar silenciosamente el archivo; exige un proceso de revocación o anulación del cotejo con justificación obligatoria del Notario para preservar la fe pública y la auditoría.
- **Compareciente Extranjero o Persona Moral**: En actos inmobiliarios, si comparece una persona moral o un extranjero, se activan automáticamente requisitos documentales adicionales (e.g. Permiso de SRE / Cláusula Calvo, Acta Constitutiva con inscripción en RPC, Poder Notarial de representación).
- **Eventos de Auditoría Preparados**: La descarga de ZIP o PDF emite internamente un payload de auditoría (`evento = "expediente_descarga"`, `escritura_id`, `usuario_id`, `formato`, `lista_documentos`, `timestamp`), persistido o listo para consumirse por el módulo futuro de auditoría.

---

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE mantener un catálogo de tipos de documentos notariales (`cat_tipos_documento_notarial`) con clave, nombre, categoría predeterminada (`inmueble`, `compareciente`, `fiscal`, `interno`), descripción y si es documento crítico que exige cotejo físico obligatorio (`requiere_cotejo_fisico`).
- **FR-002**: El sistema DEBE mantener una matriz de requisitos documentales por tipo de acto jurídico (`acto_juridico_requisitos_documentales`), indicando:
  - Acto jurídico asociado (`acto_juridico_id`).
  - Tipo de documento notarial (`tipo_documento_id`).
  - Carácter: `obligatorio` u `opcional`.
  - Si aplica a nivel general del instrumento o por compareciente de cierto rol.
  - Si exige cotejo físico para protocolizar.
- **FR-003**: El sistema DEBE calcular y desplegar dinámicamente para cada escritura el checklist de requisitos documentales:
  - Consolidando los requisitos de todos los actos de la escritura sin duplicidades.
  - Mostrando porcentaje de avance y semáforo visual (rojo = faltan obligatorios, amarillo = obligatorios completos pero faltan opcionales o cotejo, verde = 100% completo).
- **FR-004**: El sistema DEBE permitir asociar documentos al expediente de una escritura tanto a nivel instrumento como proyectando sin duplicidad los documentos KYC de sus comparecientes asociados.
- **FR-005**: El sistema DEBE registrar la fe de cotejo notarial de originales para cualquier documento del expediente, almacenando:
  - `cotejado_contra_original`: boolean.
  - `tipo_documento_exhibido`: `original`, `copia_certificada`, `copia_simple`.
  - `cotejado_por`: referencia al perfil del usuario autenticado que realiza el cotejo.
  - `fecha_cotejo`: marca de tiempo inmutable.
  - `notas_cotejo`: observaciones del cotejador.
- **FR-006**: El sistema DEBE proveer un visor modal interactivo para visualizar documentos PDF e imágenes directamente dentro de la aplicación.
- **FR-007**: El sistema DEBE generar URLs firmadas con vigencia temporal máxima de 60 segundos para la descarga o visualización de archivos del bucket `expedientes`.
- **FR-008**: El sistema DEBE permitir la descarga selectiva del expediente en archivo ZIP (permitiendo elegir documentos específicos o todos) estructurado con su manifiesto de inventario.
- **FR-009**: El sistema DEBE permitir compilar un archivo PDF único consolidando todos los documentos compatibles (PDFs e imágenes) con carátula notarial foliada e inventario de cotejos.
- **FR-010**: El sistema DEBE preparar la estructura de emisión y registro de eventos de auditoría para toda descarga (individual, ZIP o PDF compilado), capturando `escritura_id`, `usuario_id`, `tipo_descarga`, `documentos_incluidos` y `timestamp`.
- **FR-011**: La función de validación de protocolización (`fn_validar_protocolizacion`) DEBE evaluar:
  - Que todos los requisitos documentales obligatorios estén satisfechos o cuenten con dispensa notarial fundada autorizada por Notario Titular o Administrador.
  - Que los documentos críticos de propiedad y poderes cuenten con fe de cotejo notarial contra original o copia certificada (o dispensa notarial respectiva).
- **FR-012**: Todo documento cotejado notarialmente DEBE quedar protegido contra modificación o eliminación arbitraria; cualquier revocación de cotejo exige rol de Notario Titular o Administrador y registro en auditoría.

### Key Entities

- **TipoDocumentoNotarial (`cat_tipos_documento_notarial`)**: Catálogo maestro de tipos de documentos con categorización y flag de exigencia de cotejo físico.
- **ActoRequisitoDocumental (`acto_juridico_requisitos_documentales`)**: Matriz de vinculación entre actos jurídicos y requisitos documentales obligatorios/opcionales.
- **ExpedienteDocumento (`expediente_documentos`)**: Tupla de documento asociado al expediente con metadatos de cotejo notarial y dispensa.
- **DispensaDocumentalNotarial (`expediente_dispensas_documentales`)**: Registro de dispensas autorizadas por el Notario Titular con motivo, usuario autorizante y fecha inmutable.
- **EventoDescargaAuditoria (`expediente_descargas_log`)**: Estructura de auditoría de descargas preparadas para trazabilidad de seguridad.
- **VistaExpedienteEscritura (`v_expediente_escritura`)**: Vista consolidada del expediente con estado de requisitos y cotejos.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: El personal notarial puede verificar el estado de integración documental y los requisitos faltantes de una escritura en menos de 5 segundos al ingresar a la pestaña Expediente.
- **SC-002**: El tiempo para cargar un documento y registrar su fe de cotejo contra original no supera los 15 segundos para el usuario.
- **SC-003**: 100% de las escrituras que intentan protocolizarse son validadas contra los requisitos documentales obligatorios y el cotejo de títulos/poderes, impidiendo protocolizaciones sin requisitos o sin dispensa formal.
- **SC-004**: Los documentos digitalizados son previsualizados en el visor integrado en menos de 2 segundos mediante URLs firmadas de Supabase Storage.
- **SC-005**: La descarga del expediente permite tanto empaquetado ZIP selectivo como generación de PDF único compilado con carátula notarial foliada en un solo clic.
- **SC-006**: 100% de las descargas y compilaciones emiten su evento de auditoría con trazabilidad de usuario y contenido.
- **SC-007**: Mantenimiento de la suite de pruebas unitarias existente con 100% de tests pasando y cobertura exhaustiva de las nuevas funciones de expedientes.

---

## Assumptions

- El bucket de Supabase Storage `expedientes` ya fue configurado como privado y con políticas RLS activas en migraciones precedentes.
- La entidad `escrituras` y su relación con `actos_juridicos` permiten determinar los actos contenidos en cada instrumento notarial.
- Los documentos de identificación de comparecientes ya cargados en el módulo 04 se proyectan automáticamente mediante la vista `v_expediente_escritura` sin duplicar almacenamiento físico.
- Las bibliotecas para empaquetar ZIP (JSZip) y compilar PDFs (pdf-lib / pdfjs) o utilerías del cliente se ejecutan eficientemente en el navegador.
- La conservación de los expedientes digitales se mantiene por el plazo legal mínimo de 10 años conforme al Art. 17 LFPIORPI y la Constitución del sistema (§5).
