# Feature Specification: 16-libro-cotejos (Libro de Cotejos y Certificaciones Fuera de Protocolo)

**Feature Branch**: `16-libro-cotejos`  
**Created**: 2026-09-25  
**Status**: Draft  
**Input**: User description: "Implementar el módulo del Libro de Cotejos y Certificaciones de Documentos Fuera de Protocolo conforme a la Ley del Notariado en México: control de libros y actas correlativas de cotejo, registro de solicitantes y documentos originales exhibidos, cálculo de fojas y tantos, digitalización de evidencias en Storage, emisión/impresión canónica de la Razón Notarial de Cotejo con membrete y sello de autorizar, y actas solemnes de cierre de libro."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro y Autorización Consecutiva de Actas de Cotejo (Priority: P1) 🎯 MVP

Como abogado auxiliar, redactor o notario, quiero registrar rápidamente un cotejo de documentos asignándole un número de acta y libro consecutivo, capturando los datos del solicitante, la descripción precisa del documento original exhibido a la vista, el número de fojas y tantos expedidos, para documentar formalmente la fe pública fuera de protocolo sin riesgo de duplicar o alterar numeraciones oficiales.

**Why this priority**: Es el acto notarial fuera de protocolo más frecuente y de mayor volumen en cualquier notaría mexicana. Garantizar una numeración consecutiva estricta por libro, blindada en base de datos, es vital para la seguridad jurídica y el cumplimiento de las leyes estatales del notariado.

**Independent Test**: Navegar al módulo `/cotejos`, hacer clic en "Nuevo Cotejo", seleccionar el libro activo, capturar solicitante (ej. *Ing. Carlos Mendoza*, *INE: 1234567890123*), documento (*Título Profesional de Médico Cirujano expedido por la UNAM*), indicar 1 foja y 2 tantos, guardar y verificar que el acta se asienta con el número correlativo inmediato y estado "autorizado".

**Acceptance Scenarios**:
1. **Given** un libro de cotejos en estado "abierto", **When** el usuario captura un nuevo cotejo y guarda, **Then** el sistema asigna el siguiente `numero_acta` estrictamente consecutivo y fecha/hora oficial.
2. **Given** la captura de un cotejo, **When** no existe ningún libro de cotejos abierto para el año en curso, **Then** el sistema alerta al usuario y ofrece abrir el siguiente libro (ej. *Libro de Cotejos Número 12*).
3. **Given** un solicitante que ya está registrado en el padrón de comparecientes, **When** se escribe su nombre, **Then** el sistema permite autocompletar sus datos o registrar a un nuevo solicitante eventual.
4. **Given** dos usuarios registrando cotejos simultáneamente, **When** ambos confirman, **Then** una secuencia o transacción atómica previene colisiones o actas con el mismo número en el mismo libro.

---

### User Story 2 - Emisión e Impresión Canónica de la Razón Notarial de Cotejo (Priority: P2)

Como notario titular o auxiliar autorizado, quiero generar e imprimir la **Razón Notarial de Cotejo** (en hoja suelta o etiqueta para adherir al documento) con el membrete oficial, datos del instrumento, fe solemne de concordancia entre original y copia, sello de autorizar y firma, para entregar al cliente su copia certificada con plena validez probatoria.

**Why this priority**: La razón notarial es el producto tangible que se entrega a las partes interesadas y autoridades (juzgados, bancos, dependencias). Debe cumplir estrictamente los cánones de formato notarial, usar los datos dinámicos de la notaría ([`useConfiguracionNotarial`](file:///Users/cosmic-chimps/IdeaProjects/pruebas%20de%20concepto/notarius-cc/app/composables/useConfiguracionNotarial.ts)) y contar con vista previa y salida a impresión/PDF impecable.

**Independent Test**: Abrir un acta de cotejo registrada, pulsar "Imprimir Razón de Cotejo", verificar en la vista previa que incluye el membrete institucional, logotipo, número de acta, libro, nombre del solicitante, declaración solemne de que la copia concuerda fielmente con su original tenido a la vista, facsímil del sello de autorizar y datos del notario actuante.

**Acceptance Scenarios**:
1. **Given** un acta de cotejo autorizada, **When** se abre la vista previa imprimible, **Then** el documento despliega la Razón Notarial con la fórmula legal reglamentaria y los datos dinámicos de identidad notarial (`numero_notaria`, `entidad`, `titular`, `logotipo`, `sello`).
2. **Given** un cotejo de múltiples fojas (ej. 15 páginas), **When** se imprime la razón, **Then** el texto detalla con precisión: *"hace constar que las presentes 15 fojas útiles concuerdan fiel y exactamente con su original exhibido a la vista..."*.
3. **Given** la orden de impresión (`window.print`), **When** se envía a la impresora, **Then** la interfaz oculta barras de herramientas, botones de navegación y ajusta los márgenes a hoja carta notarial oficial.

---

### User Story 3 - Digitalización y Resguardo Documental de Evidencias (Priority: P3)

Como auxiliar notarial u oficial de control, quiero adjuntar la digitalización del documento original exhibido y la copia cotejada con su razón estampada en el almacenamiento seguro de la notaría, para mantener un archivo histórico digital consultable ante solicitudes de cotejos subsecuentes o requerimientos judiciales.

**Why this priority**: Si bien el Notario no retiene el documento original privado, conservar una copia digital cotejada en Supabase Storage protege a la notaría contra fraudes o suplantaciones y permite expedir constancias o cotejos adicionales en minutos.

**Independent Test**: En el detalle de un acta de cotejo, cargar el archivo PDF o imágenes del documento cotejado, verificar la subida al bucket `cotejos-documentos`, previsualizar el documento dentro de la plataforma y constatar que queda asociado al registro del acta.

**Acceptance Scenarios**:
1. **Given** un acta de cotejo, **When** el usuario adjunta el archivo del documento original o copia cotejada (PDF, PNG, JPG hasta 15MB), **Then** el archivo se sube a Supabase Storage y se vincula al registro.
2. **Given** un archivo adjunto, **When** cualquier usuario con permiso de lectura accede al acta, **Then** puede visualizar el documento en el visor interno y descargarlo.
3. **Given** un archivo con formato no permitido o dañado, **When** se intenta cargar, **Then** el sistema muestra un mensaje de validación descriptivo.

---

### User Story 4 - Gestión de Libros de Cotejo, Búsqueda Histórica y Cierre Solemne (Priority: P4)

Como Notario Titular o Administrador, quiero consultar el catálogo histórico de cotejos mediante filtros avanzados (solicitante, rango de fechas, libro, tipo de documento) y gestionar la apertura y cierre de libros de cotejo con su acta formal de clausura, para mantener el control exacto de los libros y cumplir con la rendición de informes a la Dirección General de Notarías.

**Why this priority**: Cada libro de cotejos tiene un límite de asientos (habitualmente 200 o 500 actas según la ley estatal). Una vez agotado o al cierre del año judicial, el Notario debe asentar la certificación formal de cierre del libro y emitir el índice respectivo.

**Independent Test**: Consultar el listado de cotejos filtrando por solicitante o año; ingresar a la administración de libros de cotejo, seleccionar un libro próximo a saturarse y ejecutar la acción "Cerrar Libro", constatando que se genera el acta de cierre con el balance total de actas autorizadas y canceladas, impidiendo nuevos registros en dicho tomo.

**Acceptance Scenarios**:
1. **Given** el catálogo de cotejos en `/cotejos`, **When** el usuario filtra por solicitante, fecha o tipo de documento, **Then** los resultados se actualizan reactivamente con paginación y orden descendente por número de acta.
2. **Given** un libro de cotejos que alcanza su límite de capacidad, **When** el Notario procede al cierre, **Then** el sistema genera el acta solemne de clausura con la sumatoria de actas válidas y canceladas y cambia su estado a "cerrado".
3. **Given** un libro en estado "cerrado", **When** se intenta asentar una nueva acta en él, **Then** el sistema bloquea la operación y exige seleccionar o abrir un libro vigente.

---

## Edge Cases

- **Cancelación o Desistimiento de Acta de Cotejo**: Si un acta numerada no se entrega o se cancela por error antes de entregarla, no se elimina físicamente de la base de datos para no romper la secuencia; se marca con estatus `cancelada` y se asienta la razón de inutilización.
- **Transición de Año Fiscal / Notarial**: Al iniciar un nuevo año calendario, los libros pueden continuar hasta agotarse o cerrarse según el régimen de la entidad federativa; el sistema debe soportar ambos criterios.
- **Concurrencia en Asignación de Folios**: Dos auxiliares registrando cotejos al mismo segundo deben recibir folios secuenciales consecutivos únicos sin bloqueo ni duplicación (`fn_siguiente_acta_cotejo` o secuencia atómica).
- **Cotejos sin solicitante previo**: La gran mayoría de los clientes de cotejos son personas que acuden una sola vez a la notaría; el sistema debe permitir captura ágil directa sin obligar a llenar un expediente PLD complejo a menos que se trate de operaciones cuantiosas o sospechosas.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE proveer la tabla `public.libros_cotejo` para la gestión de tomos (número de libro, año, fecha de apertura, fecha de cierre, límite de actas, actas autorizadas, estatus: 'abierto', 'cerrado').
- **FR-002**: El sistema DEBE proveer la tabla `public.actas_cotejo` con clave foránea al libro activo, número de acta consecutivo, fecha/hora oficial, solicitante (nombre e identificación), tipo de documento, descripción exhaustiva, fojas, tantos, observaciones, estatus ('registrado', 'autorizado', 'entregado', 'cancelado') y usuario autorizante.
- **FR-003**: El sistema DEBE garantizar la atomicidad en la numeración correlativa de actas por libro para evitar saltos o duplicidades ante transacciones simultáneas.
- **FR-004**: El sistema DEBE implementar el composable `useCotejos.ts` para consulta reactiva, búsqueda, filtrado, creación de actas, apertura y cierre de libros.
- **FR-005**: El sistema DEBE aprovisionar el bucket `cotejos-documentos` en Supabase Storage con políticas RLS para almacenamiento de originales digitalizados y copias certificadas.
- **FR-006**: El sistema DEBE proveer la interfaz de usuario en `/cotejos` con diseño Stitch Notarial (`#1B3A5F`, `#A9762E`), tabla de actas, semáforos de estatus, filtros rápidos y acceso al registro ágil.
- **FR-007**: El sistema DEBE incluir el diálogo/modal `CotejoRegistroModal.vue` para captura rápida de acta con validación Yup/VeeValidate.
- **FR-008**: El sistema DEBE proveer el componente imprimible `CotejoRazonImprimible.vue` que genere la Razón Notarial de Cotejo y etiqueta certificada, consumiendo dinámicamente el membrete, lema, logotipo y sello oficial de `useConfiguracionNotarial`.
- **FR-009**: El sistema DEBE permitir la cancelación formal de actas con motivo justificado, preservando la inmutabilidad de la auditoría y de la secuencia numérica.
- **FR-010**: El sistema DEBE proveer la funcionalidad de Cierre de Libro de Cotejos con emisión de la fórmula reglamentaria de clausura de tomo e índice correlativo.
- **FR-011**: El sistema DEBE integrar la entrada "Libro de Cotejos" en el grupo *Operación* de la navegación principal (`app/composables/useNavItems.ts`) con el permiso correspondiente (`cotejos:ver`).
- **FR-012**: El sistema DEBE registrar los permisos `cotejos:ver`, `cotejos:crear`, `cotejos:autorizar`, `cotejos:cancelar` y `cotejos:cerrar_libro` en el catálogo de seguridad.

### Key Entities

- **`libros_cotejo`**:
  - `id`: UUID (Primary Key).
  - `numero_libro`: Entero requerido (número oficial de libro o tomo).
  - `anio`: Entero requerido.
  - `fecha_apertura`: Fecha de inicio del tomo.
  - `fecha_cierre`: Fecha de clausura del tomo (opcional hasta el cierre).
  - `limite_actas`: Entero (por defecto 200 o 500).
  - `total_actas`: Conteo acumulado de actas autorizadas.
  - `estatus`: Texto ('abierto', 'cerrado').
  - `notas`: Texto descriptivo.

- **`actas_cotejo`**:
  - `id`: UUID (Primary Key).
  - `libro_id`: UUID (Foreign Key a `libros_cotejo`).
  - `numero_acta`: Entero requerido (consecutivo dentro del libro).
  - `anio`: Entero requerido.
  - `fecha_cotejo`: TIMESTAMPTZ con valor por defecto `NOW()`.
  - `solicitante_nombre`: Texto requerido.
  - `solicitante_identificacion`: Texto (tipo y clave/folio de ID oficial).
  - `solicitante_compareciente_id`: UUID opcional a `public.comparecientes`.
  - `tipo_documento`: Texto requerido (ej. "Título Profesional", "Acta del Estado Civil", "Identificación Oficial", "Contrato Privado", "Constancia Fiscal").
  - `documento_descripcion`: Texto exhaustivo con emisor, fecha y datos de identificación del documento original.
  - `numero_hojas`: Entero >= 1 (número de fojas cotejadas).
  - `numero_tantos`: Entero >= 1 (número de juegos certificados).
  - `archivo_original_url`: URL de imagen o PDF en Storage.
  - `archivo_copia_certificada_url`: URL de copia digital certificada.
  - `observaciones`: Anotaciones notariales al calce.
  - `estatus`: Texto ('registrado', 'autorizado', 'entregado', 'cancelado').
  - `motivo_cancelacion`: Texto en caso de anulación.
  - `notario_actuante`: Texto o UUID del notario actuante.
  - `created_by`, `updated_at`: Auditoría.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los usuarios operativos pueden registrar y autorizar un acta de cotejo completa en menos de 90 segundos.
- **SC-002**: La generación de la Razón Notarial de Cotejo imprimible toma menos de 500ms y consume automáticamente los datos vigentes de identidad notarial y sello de autorizar.
- **SC-003**: Cero duplicidades o huecos en la secuencia numérica de actas dentro de un mismo libro (`0% de error de correlatividad`).
- **SC-004**: El 100% de las actas canceladas conservan su justificación legal en la bitácora sin desaparecer del índice correlativo.
- **SC-005**: 100% de cobertura en pruebas unitarias del composable `useCotejos` y de los componentes de captura e impresión con cero regresiones en la suite global.

---

## Assumptions

- Cada notaría mantiene un único libro de cotejos abierto a la vez (salvo regímenes con libros simultáneos por notario asociado, en cuyo caso cada libro tiene su propia numeración).
- El solicitante exhibe físicamente el documento original en la notaría al momento de levantar el acta de cotejo.
- El costo y cobro por foja/tanto puede gestionarse de forma optativa y no bloquea la fe pública de la certificación.
