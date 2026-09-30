# Feature Specification: 15-identidad-notarial (Identidad Notarial, Fe Pública y Configuración Institucional)

**Feature Branch**: `15-identidad-notarial`  
**Created**: 2026-09-25  
**Status**: Draft  
**Input**: User description: "Continuemos con la identidad notarial y configuración institucional: Ficha de la Notaría Pública (número de notaría, entidad federativa, municipio, distrito notarial, notario titular, notario suplente/asociado, patente/fíat, domicilio y datos de contacto), identidad visual (logotipo oficial y sello de autorizar notarial para carátulas, certificaciones y reportes impresos), y leyendas reglamentarias para cierre de volúmenes y membretes oficiales."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ficha Institucional y Datos de Fe Pública (Priority: P1) 🎯 MVP

Como Notario Titular o Administrador del despacho, quiero capturar y mantener actualizados los datos oficiales de fe pública de la Notaría (número, entidad federativa, municipio, distrito judicial/notarial, titular, patente y domicilio fiscal/físico), para que todos los actos, documentos y reportes del sistema reflejen la investidura jurídica auténtica de la notaría.

**Why this priority**: Es el núcleo de identidad institucional. Sin estos datos parametrizados, las carátulas, testimonios, certificaciones de índices y comprobantes carecen de validez formal o requieren edición manual repetitiva con riesgo de errores en números de patente o demarcación.

**Independent Test**: Acceder a `/administracion-general/identidad-notarial`, capturar los datos de la notaría (ej. *Notaría Pública No. 44 del Estado de México*, *Titular: Lic. Fernando Notario*, *Fíat: 1044/2018*), guardar los cambios y verificar que la información persiste y se despliega en el resumen institucional.

**Acceptance Scenarios**:
1. **Given** un usuario con rol `administrador` o `notario_titular`, **When** accede al módulo de Identidad Notarial, **Then** visualiza un formulario organizado en secciones claras: *Datos de la Notaría*, *Titularidad y Suplencia*, *Domicilio Oficial* e *Información de Contacto*.
2. **Given** la captura de datos oficiales, **When** se omiten campos obligatorios como número de notaría, entidad, municipio o nombre del titular, **Then** el sistema bloquea el guardado e indica con mensajes descriptivos los campos requeridos.
3. **Given** una configuración guardada, **When** cualquier usuario autenticado consulta la información institucional de la notaría, **Then** se obtienen los datos vigentes de forma inmediata.

---

### User Story 2 - Identidad Visual y Sellado Notarial Oficial (Priority: P2)

Como Notario Titular o Administrador, quiero cargar el logotipo oficial de la notaría y el facsímil del Sello Notarial de Autorizar (conforme a la legislación del Estado), para que los documentos oficiales, carátulas y reportes generados cuenten con el membrete y el sello reglamentario.

**Why this priority**: La fe pública notarial y los informes oficiales exigen membrete de la notaría y representación del sello oficial de autorizar del Estado. Centralizar estos activos gráficos evita desalineaciones estéticas y garantiza la consistencia visual en todas las salidas impresas o en PDF.

**Independent Test**: Subir una imagen en formato PNG/SVG para el logotipo y otra para el sello oficial de autorizar; constatar la previsualización en vivo, almacenamiento en el bucket seguro `notaria-identidad` y reflejo inmediato en los componentes de membrete.

**Acceptance Scenarios**:
1. **Given** un archivo de imagen válido (PNG, SVG, JPG, máx. 3MB), **When** el usuario lo carga como logotipo o sello notarial, **Then** el sistema lo sube a Supabase Storage, genera su URL pública/firmada y muestra la previsualización instantánea.
2. **Given** un archivo no soportado o que exceda el tamaño máximo, **When** el usuario intenta subirlo, **Then** el sistema rechaza la carga con una alerta clara sin corromper la imagen previa.
3. **Given** un logotipo o sello previamente cargado, **When** el usuario pulsa "Reemplazar" o "Eliminar", **Then** el sistema solicita confirmación y actualiza la referencia gráfica.

---

### User Story 3 - Parámetros y Leyendas Reglamentarias Notariales (Priority: P3)

Como Notario Titular, quiero definir las leyendas institucionales predeterminadas (encabezado oficial, lema notarial, certificación de cierre de libros y volúmenes, y notas reglamentarias al calce), para que los índices y testimonios se emitan con la redacción legal exacta aprobada por el titular.

**Why this priority**: Cada legislación notarial estatal exige fórmulas solemnes específicas (ej. certificación de folios útiles, canceladas por "No Pasó", apertura y cierre de tomos). Estandarizarlas garantiza el cumplimiento normativo en toda la notaría sin que cada redactor deba redactarlas de cero.

**Independent Test**: En la pestaña de *Parámetros y Leyendas*, modificar el texto de la *Certificación de Cierre de Volumen* y el *Lema Institucional*; generar la vista previa de impresión del índice de un volumen y constatar que el pie de certificación incorpora la fórmula legal actualizada.

**Acceptance Scenarios**:
1. **Given** la configuración de leyendas, **When** el usuario edita la plantilla de *Certificación de Cierre de Volumen*, **Then** el sistema admite variables dinámicas estándar (`{numero_volumen}`, `{escrituras_validas}`, `{escrituras_canceladas}`, `{folios_totales}`, `{nombre_notario}`, `{fecha_cierre}`).
2. **Given** el guardado de una fórmula de certificación, **When** se imprime el reporte de índice por volumen, **Then** el documento sustituye automáticamente las variables con los datos reales del volumen seleccionado.

---

### User Story 4 - Consumo Centralizado e Inyección en Toda la Plataforma (Priority: P4)

Como usuario operativo (abogado redactor, gestor o asistente), quiero que el membrete del sistema, el encabezado de la aplicación (`AppNavbar.vue`), las carátulas de expedientes y las cédulas oficiales tomen automáticamente los datos vigentes de la notaría, para mantener la coherencia institucional sin dependencias estáticas en el código.

**Why this priority**: Elimina datos "hardcodeados" en el frontend y garantiza que si la notaría cambia de domicilio, teléfono o logotipo, toda la plataforma y sus reportes se actualicen de forma transparente.

**Independent Test**: Actualizar el teléfono oficial o el logotipo en la administración central y verificar que la barra superior de navegación y los generadores de PDF/impresión reflejan los nuevos valores sin reiniciar el servidor.

**Acceptance Scenarios**:
1. **Given** el composable central `useConfiguracionNotarial()`, **When** cualquier componente o página lo invoca, **Then** recibe los datos reactivos de la notaría en caché local para optimizar rendimiento.
2. **Given** un cambio en los datos institucionales guardado por el administrador, **When** se emite el evento de actualización, **Then** la caché reactiva se refresca y los encabezados de la app se sincronizan.

---

## Edge Cases

- **Ausencia de configuración inicial (Primer arranque)**: Si la tabla de configuración no contiene ningún registro, el sistema debe desplegar valores de plantilla claros ("Notaría Pública No. X", "Pendiente de configurar") con un banner invitando al administrador a completar la ficha.
- **Acceso concurrente o singleton duplicado**: La tabla `configuracion_notarial` debe estructurarse como un patrón singleton estricto (ID fijo o constraint único) para evitar múltiples registros discordantes de identidad notarial.
- **Fallo de conexión al cargar imágenes a Storage**: Si la carga del logotipo o sello falla por red o cuota, el sistema debe conservar intacto el registro existente y no dejar URLs rotas.
- **Protección RBAC**: Los usuarios con rol `abogado_redactor`, `gestor` o `auxiliar_notarial` tienen acceso de sólo lectura a la configuración; únicamente `administrador` y `notario_titular` pueden modificarla.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE proveer la tabla singleton `public.configuracion_notarial` en PostgreSQL con políticas RLS de lectura para todos los usuarios autenticados y escritura exclusiva para administradores y notario titular.
- **FR-002**: El sistema DEBE registrar: número de notaría, entidad federativa, municipio, distrito judicial/notarial, nombre del notario titular, número de patente/fíat, fecha de fíat, nombre de notario adscrito/asociado (opcional) y régimen de actuación.
- **FR-003**: El sistema DEBE almacenar el domicilio oficial completo: calle, número exterior e interior, colonia, código postal, municipio, entidad federativa, teléfonos de oficina y correo de contacto formal.
- **FR-004**: El sistema DEBE gestionar el bucket `notaria-identidad` en Supabase Storage con políticas de acceso para almacenamiento seguro del logotipo y sello notarial.
- **FR-005**: El sistema DEBE validar formatos de imagen permitidos (PNG, SVG, JPG) y tamaño máximo de 3MB para logotipo y sello de autorizar.
- **FR-006**: El sistema DEBE proveer campos parametrizables para leyendas oficiales: encabezado de membrete, lema notarial, fórmula de certificación de apertura de libro y fórmula de certificación de cierre de volumen.
- **FR-007**: El sistema DEBE soportar interpolación de variables dinámicas (`{numero_notaria}`, `{nombre_notario}`, `{entidad}`, `{municipio}`, `{numero_volumen}`, `{fecha}`) en las leyendas notariales.
- **FR-008**: El sistema DEBE implementar el composable `useConfiguracionNotarial.ts` con estado reactivo, caché y métodos de consulta y actualización.
- **FR-009**: El sistema DEBE exponer la interfaz de administración en `/administracion-general/identidad-notarial` con tarjetas Stitch Notarial (`#1B3A5F`, `#A9762E`), previsualización de imágenes y pestañas organizadas.
- **FR-010**: El sistema DEBE añadir el acceso directo "Identidad Notarial y Fe Pública" en el panel principal `/administracion-general`.
- **FR-011**: El sistema DEBE inyectar reactivamente el nombre y logotipo de la notaría en la barra de navegación superior (`AppNavbar.vue`) y en los reportes imprimibles (`ReporteIndiceVolumenImprimible.vue`).
- **FR-012**: El sistema DEBE incluir validaciones de formulario con feedback visual antes del guardado.

### Key Entities

- **`configuracion_notarial`**: Entidad singleton que almacena los metadatos institucionales:
  - `id`: UUID (clave primaria fija singleton).
  - `numero_notaria`: Entero requerido.
  - `entidad_federativa`: Texto requerido.
  - `municipio`: Texto requerido.
  - `distrito_judicial`: Texto opcional.
  - `notario_titular_nombre`: Texto requerido.
  - `notario_titular_titulo`: Texto (ej. "Licenciado en Derecho").
  - `patente_fiat_numero`: Texto opcional.
  - `patente_fiat_fecha`: Fecha opcional.
  - `notario_suplente_nombre`: Texto opcional.
  - `domicilio_calle`, `domicilio_num_ext`, `domicilio_num_int`, `domicilio_colonia`, `domicilio_codigo_postal`: Textos de domicilio.
  - `telefono_principal`, `telefono_secundario`, `correo_contacto`, `sitio_web`: Textos de contacto.
  - `logotipo_url`: URL pública/almacenada del logotipo.
  - `sello_notarial_url`: URL pública/almacenada del facsímil del sello de autorizar.
  - `leyenda_encabezado`: Texto del membrete superior.
  - `leyenda_lema`: Lema oficial al calce.
  - `leyenda_cierre_volumen`: Plantilla de texto para certificación de cierre de tomos del protocolo.
  - `updated_at`, `updated_by`: Auditoría de última modificación.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los administradores pueden completar y actualizar la ficha completa de identidad notarial en menos de 3 minutos.
- **SC-002**: Las imágenes de logotipo y sello se previsualizan instantáneamente (< 500ms tras la selección del archivo).
- **SC-003**: El 100% de los reportes imprimibles (índices por volumen, carátulas y cédulas) consumen dinámicamente los datos de la notaría sin texto estático residual.
- **SC-004**: Cero fallas de permisos o fugas de escritura en usuarios sin privilegios administrativos.

---

## Assumptions

- La notaría opera bajo una única patente o número notarial activo a la vez (modelo singleton).
- Los archivos de logotipo y sello cuentan con fondo transparente para su correcta superposición en carátulas e impresiones físicas.
- La base de datos local y de producción permite la creación del bucket `notaria-identidad` en Supabase Storage.
