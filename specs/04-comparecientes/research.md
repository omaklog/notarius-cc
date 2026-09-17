# Research: Catálogo Global de Comparecientes y Fiscalización Notarial

Este documento consolida las decisiones de arquitectura de datos, estándares normativos mexicanos y patrones de diseño para el módulo `04-comparecientes`.

---

## 1. Modelo de Datos: Herencia y Separación Física vs Moral

### Decisión
Se adopta el patrón **Class Table Inheritance (1:1 Extension Tables)** sobre una tabla base unificada:
- `public.comparecientes`: Tabla base que mantiene el `id uuid`, `tipo_persona enum ('fisica', 'moral')`, `rfc`, datos de contacto genéricos (`email`, `telefono`), `activo` y auditoría.
- `public.compareciente_personas_fisicas`: Tabla hija con PK `compareciente_id` (FK 1:1 a `comparecientes`), con nombre, apellidos, CURP, estado conyugal, régimen patrimonial, nacionalidad, ocupación, identificación y domicilio.
- `public.compareciente_personas_morales`: Tabla hija con PK `compareciente_id` (FK 1:1 a `comparecientes`), con razón social, fecha de constitución, folio mercantil, datos de escritura constitutiva, objeto social y domicilio fiscal.

### Justificación
- **Preservación de claves foráneas existentes**: La tabla `escritura_comparecientes` ya apunta a `public.comparecientes(id)`. Mantener la tabla base evita romper las relaciones existentes.
- **Normalización e integridad**: Los atributos de una persona física (CURP, régimen conyugal) son conceptual y legalmente incompatibles con los de una persona moral (folio mercantil, escritura constitutiva). Tenerlos en tablas hijas evita columnas nulas masivas y permite `NOT NULL` constraints estrictos por tipo de persona.

### Alternativas Descartadas
- *Single Table con JSONB*: Guardar los datos específicos en un campo `datos jsonb`. Rechazado porque dificulta la indexación, impide claves foráneas directas (como catálogos de identificación o regímenes conyugales) y debilita la integridad relacional de Postgres.
- *Dos tablas completamente separadas sin base*: `personas_fisicas` y `personas_morales`. Rechazado porque obligaría a duplicar `escritura_comparecientes` o usar llaves foráneas polimórficas frágiles.

---

## 2. Validación Algorítmica de RFC y CURP (México)

### Decisión
Implementar composables de frontend y funciones de backend para validar la sintaxis y dígito verificador oficial de RFC y CURP:
1. **RFC Persona Física (13 caracteres)**: 4 letras + 6 dígitos de fecha (AAMMDD) + 3 caracteres de homoclave.
2. **RFC Persona Moral (12 caracteres)**: 3 letras + 6 dígitos de fecha (AAMMDD) + 3 caracteres de homoclave.
3. **CURP (18 caracteres)**: Conforme al algoritmo oficial de RENAPO, verificando entidad federativa de registro y dígito verificador módulo 10.

### Justificación
- Evita que errores de dedo o capturas truncadas lleguen a la base de datos y causen rechazos en la emisión de avisos al SAT o en consultas de Cumplimiento PLD.
- Se ejecuta de manera local y determinista (sin depender de llamadas HTTP a APIs externas que puedan ser lentas o tener costos por consulta).

---

## 3. Beneficiario Controlador (Art. 32-B Quater CFF)

### Decisión
Modelar la entidad `compareciente_beneficiarios_controladores` vinculando la persona moral con la persona física que ejerce el control efectivo:
- `persona_moral_id uuid`
- `beneficiario_fisica_id uuid`
- `porcentaje_participacion numeric(5,2)`
- `criterio_control text`: (`titularidad_acciones`, `derechos_voto`, `designacion_directores`, `control_de_hecho`)
- `documento_acreditacion text`

### Justificación
- El Código Fiscal de la Federación en México exige a los notarios públicos identificar y mantener en sus expedientes la información fidedigna de los beneficiarios controladores de toda persona moral o fideicomiso que intervenga en actos traslativos de dominio o constitución de sociedades.

---

## 4. Búsqueda Predictiva y Rendimiento en Autocompletado

### Decisión
Habilitar la extensión nativa `pg_trgm` en Postgres y crear índices GIN sobre campos de búsqueda textual:
- Búsqueda exacta indexada por btree en `rfc` y `curp`.
- Búsqueda difusa (fuzzy search) mediante `pg_trgm` en:
  - `unaccent(lower(nombres || ' ' || primer_apellido || ' ' || coalesce(segundo_apellido, '')))` para físicas.
  - `unaccent(lower(razon_social))` para morales.

### Justificación
En una notaría con decenas de miles de clientes acumulados en años de servicio, la búsqueda en tiempo real dentro del formulario de la escritura debe responder en menos de 100ms para garantizar agilidad a los abogados.

---

## 5. Reconocimiento OCR de Identificaciones Mexicanas con Visión Multimodal

### Decisión
Utilizar una ruta de servidor Nuxt (`server/api/ocr/identificacion.post.ts`) que consume la API de Visión Multimodal (Gemini Vision API) con un esquema de salida JSON fuertemente tipado.

### Justificación
- **Complejidad de las credenciales INE**: Las credenciales de elector en México cuentan con microimpresiones, hologramas de seguridad y más de 8 variaciones de diseño histórico (formatos A al H). Los motores de OCR tradicionales basados en plantillas o Tesseract.js sufren tasas de error superiores al 40% en estas credenciales debido al guilloché de fondo.
- **Tolerancia a imperfecciones**: Los modelos multimodales interpretan de forma contextual fotografías tomadas con celulares, imágenes inclinadas, con sombras o reflejos parciales.
- **Extracción de un solo paso**: Devuelve directamente la separación estructurada de `nombres`, `primer_apellido`, `segundo_apellido`, `curp`, `rfc`, `clave_elector`, `vigencia`, y el domicilio desagregado (`calle`, `numero`, `colonia`, `cp`, `municipio`, `estado`), sin requerir frágiles expresiones regulares post-OCR.

### Alternativas Descartadas
- *Tesseract.js en el navegador*: Descarga inicial de más de 20MB de WebAssembly y modelos de lenguaje, alto consumo de memoria en el cliente y baja precisión con credenciales INE.
- *APIs comerciales SaaS de verificación de identidad (Nubarium/Incode)*: Requieren contratos corporativos de pago por consulta y llaves de acceso privadas, innecesarias para la fase de extracción y captura asistida.

---

## 6. Repositorio Documental y Vinculación Dinámica al Expediente (`v_expediente_escritura`)

### Decisión
Almacenar las imágenes de identificación física una sola vez bajo la entidad del compareciente en Supabase Storage (`comparecientes/:id/identificaciones/...`) y registrarlas en `public.expediente_documentos`. Vincularlas a los expedientes de las escrituras de manera puramente relacional mediante la vista SQL `public.v_expediente_escritura`.

### Justificación
- **Cero duplicación de archivos**: En el trabajo notarial un mismo otorgante puede participar en múltiples escrituras a lo largo del tiempo. Duplicar imágenes en storage por cada escritura aumentaría los costos de almacenamiento y generaría inconsistencias documentales.
- **Sincronización instantánea y sin triggers**: Al asociar un compareciente en `escritura_comparecientes`, sus identificaciones se reflejan al instante en la consulta del expediente de esa escritura. Si el compareciente es desvinculado de la escritura, la vista deja de proyectar el documento en esa escritura inmediatamente sin dejar registros huérfanos.

---

## 7. Catálogo Administrable de Tipos de Identificación con Configuración OCR

### Decisión
Extender `public.tipos_identificacion_oficial` con columnas booleanas `permite_ocr` y `requiere_reverso`, proveyendo una interfaz administrativa en `/administracion-general/tipos-identificacion` y un seeder inicial preconfigurado.

### Justificación
- Permite que el modal del frontend se adapte dinámicamente: para la `ine` solicita dos zonas de carga (anverso y reverso), para `pasaporte` solicita una sola imagen, y para identificaciones que no admiten OCR (como Cartilla Militar) omite la fase de escaneo e inicia directamente en captura manual.
- Facilita a los administradores de la notaría agregar nuevos documentos oficiales en el futuro sin modificar código fuente.

