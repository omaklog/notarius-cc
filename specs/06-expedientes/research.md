# Research: 06-expedientes (Expedientes Digitales Notariales, Requisitos por Acto y Cotejo Notarial)

## 1. Modelado de Requisitos Documentales por Acto Jurídico

### Decisión
Crear un catálogo canónico `public.cat_tipos_documento_notarial` y una tabla intermedia de matriz de requisitos `public.acto_juridico_requisitos_documentales`.

### Rationale
- Los diferentes actos jurídicos celebrados en una notaría pública en México tienen requerimientos documentales heterogéneos y reglamentados (e.g., una *Compraventa* requiere Título antecedente, Boleta Predial, Constancia de Agua, Certificado de Libertad de Gravámenes, Avalúo Comercial y Cédula Catastral; una *Constitución de Sociedad* requiere Autorización de Uso de Denominación de la Secretaría de Economía, Proyecto de Estatutos y Cédula Fiscal de socios; un *Poder Notarial* requiere sólo identificación, CURP y comprobante de domicilio de otorgantes).
- La configuración relacional permite al administrador o notario ajustar requisitos sin necesidad de modificar código fuente.
- Cada requisito tiene atributos:
  - `obligatorio`: boolean (si es indispensable para autorizar la escritura).
  - `requiere_cotejo_fisico`: boolean (si exige que el original físico o copia certificada sea tenido a la vista por el notario, e.g. títulos antecedentes y poderes).
  - `aplica_a`: enum o text (`instrumento`, `compareciente_enajenante`, `compareciente_adquirente`, `compareciente_todos`).

### Alternativas Consideradas
- *JSONB estático en la tabla actos_juridicos*: Descartado porque dificulta llaves foráneas, integridad referencial y consultas analíticas del semáforo.
- *Checklists manuales libres sin catálogo*: Descartado porque rompe la estandarización notarial y el gate de protocolización automatizado.

---

## 2. Fe Notarial de Cotejo contra Original Exhibido

### Decisión
Ampliación de `public.expediente_documentos` con atributos de fe pública notarial:
- `cotejado_contra_original`: boolean not null default false.
- `tipo_documento_exhibido`: text check (`original`, `copia_certificada`, `copia_simple`).
- `cotejado_por`: uuid references `public.profiles(id)`.
- `fecha_cotejo`: timestamptz.
- `notas_cotejo`: text.
- `tipo_documento_id`: uuid references `public.cat_tipos_documento_notarial(id)`.

### Rationale
- La función notarial consiste primordialmente en dar fe pública de los actos y documentos que pasan ante el Notario. En un expediente digitalizado, una copia simple escaneada no tiene el mismo valor probatorio que un documento digitalizado cuyo original fue físicamente exhibido y cotejado por el abogado o notario.
- Estampar inmutablemente quién realizó el cotejo, la fecha y si tuvo a la vista el original o una copia certificada otorga certeza jurídica y blinda la responsabilidad notarial ante litigios o auditorías del Archivo General de Notarías.

### Alternativas Consideradas
- *Tabla separada de fe_cotejos*: Descartado por sobrecarga de joins 1:1; mantenerlo en `expediente_documentos` simplifica la consulta y la proyección en la vista `v_expediente_escritura`.

---

## 3. Descarga Selectiva en ZIP y Compilación en PDF Único

### Decisión
1. **Descarga en ZIP**: Utilización de `jszip` (o utilería client-side ligera) para descargar en paralelo mediante URLs firmadas los archivos seleccionados, organizándolos en una jerarquía de carpetas:
   - `01_Inmueble_Objeto/`
   - `02_Comparecientes_KYC/`
   - `03_Fiscales_Pagos/`
   - `04_Internos_Tramite/`
   - `manifiesto_expediente.json` y `manifiesto_expediente.txt`
2. **Compilación en PDF Único**: Utilización de `pdf-lib` en el cliente para concatenar los documentos PDF e imágenes válidas del expediente, antecedidos por una **Carátula Notarial Foliada** con el índice de documentos, estatus de cotejo, fecha y firma del Notario.
3. Si un archivo no es compatible con el formateo en PDF (e.g. archivo binario no estándar), se documenta su exclusión en el índice del PDF y se asegura su descarga completa en el paquete ZIP.

### Rationale
- Los clientes, bancos y el Registro Público con frecuencia solicitan el expediente completo en un solo PDF compilado para revisión previa, mientras que para archivo histórico y respaldo notarial se requiere el paquete ZIP con los archivos originales en máxima fidelidad.
- El procesamiento en navegador aprovecha la capacidad de cómputo del cliente y evita saturar la infraestructura del backend Supabase.

---

## 4. Auditoría de Descargas Preparada para Módulo Futuro

### Decisión
Crear la tabla `public.expediente_descargas_log` y una función RPC `public.fn_registrar_descarga_expediente`:
- `id`: uuid primary key default gen_random_uuid().
- `escritura_id`: uuid references `public.escrituras(id)`.
- `usuario_id`: uuid references `public.profiles(id)`.
- `tipo_descarga`: text check (`individual`, `zip_seleccion`, `pdf_compilado`).
- `documentos_ids`: uuid[].
- `total_documentos`: integer.
- `metadata`: jsonb.
- `created_at`: timestamptz default now().

### Rationale
- Responde directamente al requerimiento de seguridad del usuario: registrar qué usuario descargó qué documentos y en qué fecha/hora, dejando la estructura de datos lista para cuando se implemente el módulo general de auditoría y trazabilidad del sistema.

---

## 5. Integración con el Gate de Protocolización (`fn_validar_protocolizacion`)

### Decisión
Integrar la sección **I. Integración de Expediente y Cotejo Notarial** en `public.fn_validar_protocolizacion`:
1. Determinar todos los requisitos documentales marcados como `obligatorio = true` para el acto jurídico de la escritura.
2. Verificar que cada requisito obligatorio cuente con al menos un documento cargado en el expediente O cuente con un registro de dispensa en `public.expediente_dispensas_documentales`.
3. Verificar que los requisitos catalogados como críticos (`requiere_cotejo_fisico = true`, e.g. Títulos antecedentes y Poderes) cuenten con al menos un documento con `cotejado_contra_original = true` o dispensa notarial expresa.
4. Si existen incumplimientos no dispensados, retornar los motivos correspondientes bloqueando la protocolización.

### Rationale
- La protocolización notarial es el momento en que el instrumento adquiere fuerza pública irreversible. Impedir protocolizar escrituras con expedientes incompletos o sin cotejo de títulos protege la patente del Notario Público conforme a la Ley del Notariado.
