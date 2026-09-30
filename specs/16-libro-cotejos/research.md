# Research: 16-libro-cotejos (Libro de Cotejos y Certificaciones Fuera de Protocolo)

**Feature**: `16-libro-cotejos`  
**Status**: Completed  
**Goal**: Investigar y resolver decisiones técnicas, arquitectónicas y notariales para la gestión de tomos/libros de cotejos, numeración atómica correlativa, digitalización en Storage y generación canónica de la Razón Notarial de Cotejo con sello de autorizar.

---

## 1. Decisiones Arquitectónicas y Técnicas

### 1.1 Concurrencia y Asignación Atómica del Número de Acta
- **Pregunta**: ¿Cómo garantizar que dos auxiliares registrando cotejos simultáneamente no generen folios repetidos ni dejen huecos numéricos dentro de un mismo libro?
- **Opciones analizadas**:
  1. *Cálculo en cliente (`SELECT MAX(numero_acta) + 1`)*: Alto riesgo de colisión en concurrencia (race condition) y vulnerable a duplicación de actas oficiales.
  2. *Secuencia nativa de PostgreSQL (`CREATE SEQUENCE` por libro)*: Las secuencias no son transaccionales (un `ROLLBACK` deja huecos en la numeración, lo cual está prohibido por la Ley del Notariado).
  3. *Bloqueo de fila a nivel de libro con función almacenada (`SELECT ... FOR UPDATE` sobre `libros_cotejo`)*:
     - Al insertar un acta, se bloquea exclusivamente la fila del `libro_id` en una transacción PostgreSQL corta (`SELECT total_actas FROM libros_cotejo WHERE id = p_libro_id FOR UPDATE`).
     - Se asigna `numero_acta = total_actas + 1`.
     - Se inserta el acta y se actualiza `total_actas` en el libro.
     - Si hay un `ROLLBACK`, la transacción revierte y no se pierde ningún número consecutivo.
- **Decisión**: Se adopta la **Opción 3** mediante la función almacenada PostgreSQL `fn_registrar_acta_cotejo(payload JSONB)`.

---

### 1.2 Almacenamiento Seguro de Evidencias Digitales en Supabase Storage
- **Pregunta**: ¿Dónde y con qué políticas almacenar las digitalizaciones de los documentos originales exhibidos y las copias certificadas con su razón notarial?
- **Opciones analizadas**:
  1. *Bucket general existente (`notaria-identidad` o `expedientes`)*: Mezcla activos institucionales públicos con documentos privados protegidos por secreto profesional notarial.
  2. *Bucket privado dedicado `cotejos-documentos`*:
     - Aislamiento estricto de documentos con RLS.
     - Admite PDFs e imágenes (JPEG, PNG) de hasta 15MB por archivo.
     - Estructura de rutas: `{libro_id}/{acta_id}/original_{timestamp}.{ext}` y `{libro_id}/{acta_id}/certificada_{timestamp}.{ext}`.
     - Políticas de seguridad: lectura y escritura restringidas a usuarios autenticados con permiso notarial `cotejos:ver` y `cotejos:crear`.
- **Decisión**: **Opción 2**: Bucket `cotejos-documentos` en Supabase Storage con políticas RLS de acceso notarial autenticado.

---

### 1.3 Fórmula Canónica de la Razón Notarial de Cotejo y Sello de Autorizar
- **Pregunta**: ¿Cuál es la estructura jurídica y visual canónica para la Razón Notarial de Cotejo conforme a la legislación notarial mexicana (CDMX / Edomex / Ley General)?
- **Hallazgos Jurídicos**:
  - La certificación de cotejo fuera de protocolo requiere hacer constar:
    1. Que la(s) copia(s) fotostática(s) exhibida(s) constan de un número exacto de fojas útiles.
    2. Que concuerdan fiel y exactamente con su documento original que el suscrito notario tuvo a la vista y le fue devuelto al interesado.
    3. Identificación precisa del documento exhibido (emisor, fecha, folios).
    4. Datos del solicitante y su identificación oficial.
    5. Lugar, fecha y hora del cotejo.
    6. Libro y número de acta correlativo.
    7. Firma y sello de autorizar del Notario Titular o Auxiliar.
- **Decisión**:
  - Implementar el componente `CotejoRazonImprimible.vue` optimizado para impresión `@media print` en dos modalidades:
    - *Razón al Calce / Hoja Suelta*: Hoja tamaño carta con membrete oficial notarial, texto legal completo, facsímil del sello notarial y firma.
    - *Etiqueta Adhesiva Certificada*: Formato compacto (media carta o tercio de carta) diseñado para adherirse físicamente al reverso de la última foja de la copia cotejada.
  - Consumo directo del composable [`useConfiguracionNotarial.ts`](file:///Users/cosmic-chimps/IdeaProjects/pruebas%20de%20concepto/notarius-cc/app/composables/useConfiguracionNotarial.ts) para lema, membrete, logotipo y facsímil del sello de autorizar.

---

### 1.4 Reglas de Clausura y Cierre Formal del Libro de Cotejos
- **Pregunta**: ¿Qué ocurre cuando un libro de cotejos alcanza su capacidad reglamentaria (ej. 200 actas)?
- **Decisión**:
  - El sistema detecta cuando un libro alcanza su límite o cuando el Notario decide cerrarlo administrativamente.
  - Se genera el **Acta Solemne de Cierre de Libro de Cotejos**:
    - Balance total de actas levantadas, especificando cuántas fueron autorizadas válidamente y cuántas fueron canceladas/inutilizadas.
    - Fecha y hora de clausura.
    - Certificación solemne del Notario Titular.
  - Una vez cerrado (`estatus = 'cerrado'`), la base de datos y la UI bloquean el asentamiento de nuevas actas en ese tomo, exigiendo seleccionar o abrir el tomo subsecuente.

---

## 2. Paleta de Tokens Stitch Notarial (§8 Constitución)

Conforme a la maqueta generada en Stitch (ID de pantalla `693e604aa4bf44f3975cea3867eb0e5c` en proyecto `2333330112401314472`):
- **Azul Notarial Primario**: `#1B3A5F` (botones principales con `class="text-white"`, encabezados de tabla, progreso de libro).
- **Acento Bronce Notarial**: `#A9762E` (indicadores de compulsa y fe pública).
- **Fondos**: `#F0F2F4` (lienzo) y `#FFFFFF` (tarjetas y superficies de datos).
- **Codificación Semafórica de Estatus**:
  - `Registrado`: `#FEF3C7` (texto `#92400E`)
  - `Autorizado`: `#D1FAE5` (texto `#065F46`)
  - `Entregado`: `#DBEAFE` (texto `#1E40AF`)
  - `Cancelado`: `#FEE2E2` (texto `#991B1B`)
