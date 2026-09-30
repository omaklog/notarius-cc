# Quickstart: 16-libro-cotejos (Libro de Cotejos y Certificaciones Fuera de Protocolo)

Guía paso a paso para validar la gestión del libro de cotejos, numeración correlativa atómica, digitalización de documentos y emisión de la razón notarial de cotejo.

---

## 1. Validación de Registro Ágil y Numeración Consecutiva (User Story 1 - MVP)

1. Iniciar sesión con un usuario que cuente con permisos notariales (`cotejos:ver`, `cotejos:crear`).
2. En el menú lateral principal, hacer clic en **"Libro de Cotejos"** (grupo *Operación*, ruta `/cotejos`).
3. Observar el encabezado:
   - Se muestra el libro activo (ej. *Libro No. 1 / 2026*).
   - Barra de progreso de actas y badge de próxima acta (ej. *Acta 1*).
4. Pulsar el botón principal **"+ Nuevo Cotejo"**:
   - Solicitante: `Lic. Carlos Mendoza Silva`.
   - Identificación: `INE Folio 0924081928491`.
   - Tipo de Documento: `Título Profesional`.
   - Descripción: `Título Profesional de Médico Cirujano expedido por la Universidad Nacional Autónoma de México a favor de Carlos Mendoza Silva con fecha 12 de junio de 2018`.
   - Fojas: `1`.
   - Tantos: `2`.
   - Observaciones: `Copia con sellos legibles de la Dirección General de Profesiones`.
5. Guardar el cotejo.
6. **Verificación**:
   - El acta aparece en la primera posición de la tabla con el número `1` (o correlativo exacto) y estatus `Autorizado`.
   - La métrica de actas del libro y la barra de progreso se incrementan en 1.
   - El badge indica que la próxima acta es la `2`.

---

## 2. Emisión e Impresión Canónica de la Razón de Cotejo (User Story 2)

1. En la fila del acta recién registrada, hacer clic en la acción **"Imprimir Razón de Cotejo"** (icono de impresora).
2. Se despliega la vista previa modal de certificación:
   - Membrete oficial con los datos institucionales de la notaría ([`useConfiguracionNotarial`](file:///Users/cosmic-chimps/IdeaProjects/pruebas%20de%20concepto/notarius-cc/app/composables/useConfiguracionNotarial.ts)): número de notaría, entidad federativa, titular y logotipo.
   - Texto canónico:
     > *"EL SUSCRITO NOTARIO TITULAR... HACE CONSTAR QUE LA PRESENTE 1 FOJA ÚTIL CONCUERDA FIEL Y EXACTAMENTE CON SU DOCUMENTO ORIGINAL QUE TUVE A LA VISTA Y DEVOLVÍ AL INTERESADO..."*
   - Facsímil del Sello Notarial de Autorizar y línea de firma.
3. Alternar al formato **"Etiqueta Certificada"**:
   - Verificar que el diseño se ajusta a un recuadro compacto listo para adhesión física al calce del documento.
4. Pulsar **"Imprimir"**:
   - Se abre el diálogo del navegador (`window.print()`).
   - El contenido se formatea limpiamente sin menús ni botones residuales.

---

## 3. Digitalización y Resguardo en Storage (User Story 3)

1. En la tabla de cotejos, hacer clic en la acción **"Evidencias Digitales"** (icono de clip o carpeta).
2. Seleccionar un archivo PDF o imagen representativo del documento original exhibido.
3. Pulsar **"Cargar Documento"**.
4. **Verificación**:
   - El archivo se transfiere al bucket privado `cotejos-documentos` de Supabase Storage.
   - Se habilita el enlace de previsualización y descarga directa en el visor notarial.
   - El registro del acta almacena la referencia permanente al documento.

---

## 4. Cancelación Justificada y Cierre Solemne de Tomo (User Story 4)

1. **Cancelación de Acta**:
   - En una de las actas registradas, pulsar la acción **"Cancelar Acta"**.
   - Ingresar el motivo legal: `Error manifiesto en la cantidad de tantos exhibidos a petición del solicitante antes de su entrega`.
   - Confirmar cancelación.
   - **Verificación**: El estatus cambia a chip rojo `Cancelado`. El número de acta se conserva en la secuencia numérica del libro y no desaparece del catálogo ni se reutiliza.
2. **Cierre Formal de Tomo**:
   - En el encabezado superior, hacer clic en **"Administrar Libros / Cierre de Tomo"**.
   - Seleccionar el libro activo y pulsar **"Cerrar Libro"**.
   - El modal genera el **Acta Solemne de Clausura**:
     > *"En la ciudad de Toluca... el suscrito Notario hace constar que el presente Libro de Cotejos No. 1 queda formalmente cerrado, conteniendo un balance de X actas válidamente autorizadas y 1 cancelada..."*
   - Confirmar el cierre.
   - **Verificación**: El estado del libro pasa a `cerrado`. El botón de nuevo cotejo en dicho libro se inhabilita y el sistema solicita abrir el siguiente libro consecutivo (*Libro No. 2*).
