# Feature Specification: 13-reportes (Panel Ejecutivo, Reportes Operativos, Reporte General de Escrituras e Índices Notariales por Volumen)

**Feature Branch**: `13-reportes`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "1 si me gustarian las graficas del mes en curso, un resumen de escrituras abiertas en el mes, un detalle de a que redactores fueron asignadas y en que cantidad, los 5 actos juridicos con mas demanda en el mes, 2 solo un reporte general de escrituras en el sistema, cuantas ya estan firmadas o canceladas, cuantas en tramite, y cuentas se firmaron en el mes, cuantas tiene asignadas el gestor y cuantas ya liberó (con nota para bitácora de turnado redactor-gestor en siguiente spec), 3 estandar imprimible n veces, y generacion de los indices notariales del protocolo con pantalla/menú adicional de volúmenes en cards con indicador de foliado inicial/final, edición de páginas y reporte con estatus legal y certificación"

## Clarifications

### Session 2026-09-25
- **Q1 (Dashboard Gráfico)**: ¿Qué indicadores y gráficas deben priorizarse en el panel del mes en curso?
  - **A**: Gráficas del mes en curso con:
    1. Resumen de escrituras abiertas en el mes.
    2. Detalle de a qué redactores/abogados fueron asignadas y en qué cantidad (balance de carga).
    3. Top 5 de actos jurídicos con mayor demanda en el mes.
- **Q2 (Reporte General de Escrituras y Gestoría)**: ¿Qué dimensiones debe incluir el reporte general de control?
  - **A**: Un reporte general consolidado de escrituras en el sistema que desglose:
    1. Cuántas están firmadas (protocolizadas).
    2. Cuántas canceladas (anuladas).
    3. Cuántas en trámite (borrador / proceso).
    4. Cuántas se firmaron en el mes actual.
    5. Cuántas tiene asignadas el gestor y cuántas ya liberó (concluidas).
  - **Nota de Arquitectura para Futuro Spec**: *Bitácora y Custodia de Trámites entre Redactor y Gestor*: Se documenta la necesidad de modelar el historial de traspaso de trámites (rolado del trámite, devolución por solventación, asignación de responsabilidades y trazabilidad de quién detuvo o tiene la tramitación de la escritura).
- **Q3 (Impresión e Índices Notariales por Volumen)**: ¿Cómo debe operar la pantalla de índices y qué campos debe incluir el reporte legal?
  - **A**:
    1. **Pantalla / Menú Dedicado de Índices**: Vista organizada por **Volúmenes representados como Cards**. Cada card muestra el número de volumen y un indicador visual claro de completitud: **si todas las escrituras cuentan ya con número de página inicial y final capturados**.
    2. **Captura y Actualización de Foliado**: Al seleccionar un volumen, se despliega la lista de todas las escrituras pertenecientes a ese volumen con la opción de capturar o actualizar ágilmente la `pagina_inicial` y `pagina_final` de cada instrumento.
    3. **Columnas Oficiales del Reporte del Índice**:
       - Número de Escritura (Instrumento).
       - Volumen.
       - Fecha de Celebración (Otorgamiento/Firma).
       - Acto Jurídico formalizado.
       - Comparecientes (con indicación de su carácter legal: Adquirente, Enajenante, Otorgante, etc.).
       - Página Inicial.
       - Página Final.
       - **Estatus Notarial / Observaciones legales** (Firmada, Cancelada / Razón de No Pasó, Pendiente de Firma).
       - **Certificación Oficial al Cierre del Volumen** (Leyenda reglamentaria de cierre del índice con mención del Notario Titular, número de notaría, instrumentos comprendidos, espacio para sello y firma).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dashboard Ejecutivo y Gráficas del Mes en Curso (Priority: P1) 🎯 MVP

Como Notario Titular o Administrador General, quiero ingresar a `/reportes` y ver un panel gráfico interactivo del mes en curso que resuma el pulso operativo de la notaría: escrituras abiertas, distribución de asignaciones por redactor y el Top 5 de actos notariales más solicitados.

**Why this priority**: Es la necesidad analítica central del despacho notarial. Permite al Notario supervisar en segundos la productividad de su equipo de abogados redactores y la demanda de servicios sin tener que consultar registros individuales.

**Independent Test**: Navegar a `/reportes` con un usuario con permiso `reportes:ver_operativos`, seleccionar el mes en curso y constatar que se renderizan las tarjetas de KPI del mes, la gráfica de carga de trabajo por redactor y la gráfica de dona/barras del Top 5 de actos jurídicos, pudiendo alternar a meses previos.

**Acceptance Scenarios**:
1. **Given** un usuario autenticado con permiso `reportes:ver_operativos`, **When** accede a `/reportes`, **Then** visualiza el Dashboard del mes en curso con tarjetas de resumen: Total de Escrituras Abiertas en el Mes, Firmadas en el Mes, En Trámite y Canceladas.
2. **Given** escrituras asignadas a distintos abogados redactores en el mes seleccionado, **When** se consulta la sección de distribución de personal, **Then** el sistema muestra una gráfica y tabla con el nombre de cada redactor y el conteo exacto de escrituras a su cargo.
3. **Given** los actos jurídicos formalizados en el periodo, **When** se evalúa la demanda de trámites, **Then** el sistema despliega el Top 5 de actos notariales con mayor volumen porcentual y absoluto (ej. Compraventa, Donación, Poderes, etc.).
4. **Given** el selector de periodo mensual, **When** el usuario selecciona otro mes del año, **Then** todos los gráficos y KPIs se recalculan reactivamente sin recargar la página.

---

### User Story 2 - Reporte General Consolidado de Escrituras y Carga de Gestoría (Priority: P2)

Como Notario, Administrador o Gestor, quiero consultar un reporte tabular general de todas las escrituras en el sistema, con filtros por estatus (firmadas, canceladas, en trámite) y métricas de trámites en gestoría (asignadas al gestor vs. ya liberadas), con capacidad de exportación a Excel/CSV y vista de impresión estándar.

**Why this priority**: Facilita la rendición de cuentas operativa y el seguimiento puntual de las escrituras que están en gestoría externa (RPP, Catastro) frente a las que ya fueron liberadas para entrega de testimonio.

**Independent Test**: En la pestaña "Reporte General de Escrituras", filtrar por estatus "En Trámite" o por gestor, verificar el desglose de trámites asignados vs liberados, y accionar "Exportar a Excel" para verificar que se descargue un archivo estructurado con los datos mostrados.

**Acceptance Scenarios**:
1. **Given** el listado general de escrituras, **When** el usuario filtra por estado, **Then** puede conmutar entre:
   - Escrituras Firmadas / Protocolizadas (histórico y del mes).
   - Escrituras en Trámite (en integración, en firma o en trámite registral).
   - Escrituras Canceladas / Sin Efecto.
2. **Given** los trámites vinculados a cada instrumento, **When** se analiza el estado de la gestoría, **Then** el reporte indica cuántos trámites activos tiene asignados el gestor y cuántos ya fueron formalmente liberados/concluidos.
3. **Given** una consulta filtrada, **When** el usuario pulsa "Exportar a Excel (CSV)", **Then** el sistema genera de inmediato un archivo descargable con columnas: Instrumento, Año, Volumen, Acto Jurídico, Redactor Responsable, Fecha Firma, Estatus y Trámites (Asignados/Liberados).
4. **Given** la necesidad de imprimir el reporte, **When** el usuario pulsa "Imprimir Reporte", **Then** se abre la vista estandarizada limpia con membrete notarial, sin barras laterales ni botones, lista para imprimir N veces o guardar como PDF.

---

### User Story 3 - Gestión de Índices Notariales por Volumen y Foliado del Protocolo (Priority: P3)

Como Notario Titular, archivista o personal de control de libros, quiero acceder a una pantalla o menú de **Índices del Protocolo** donde visualice los volúmenes del año como **Cards** con un semáforo de completitud de foliado (página inicial y final), para que al seleccionar un volumen pueda capturar/actualizar las páginas de sus escrituras e imprimir el **Índice Oficial del Volumen** con todas las formalidades de ley.

**Why this priority**: Es una exigencia jurídica indelegable de la Ley del Notariado. Los volúmenes deben encuadernarse con su respectivo índice foliado de inicio a fin antes de su entrega o resguardo en el Archivo de Notarías.

**Independent Test**: 
1. Acceder a la vista de Índices Notariales (`/reportes` -> pestaña Índices o `/reportes/indices`).
2. Constatar la cuadrícula de Cards de Volúmenes, donde cada Card muestra el número de volumen, cantidad de escrituras y un badge indicador (Verde: *Foliado Completo* si todas tienen página inicial y final; Ámbar: *Foliado Pendiente (X sin foliar)*).
3. Seleccionar un card de volumen; verificar que se lista el desglose de sus escrituras.
4. Actualizar la `pagina_inicial` y `pagina_final` de una escritura y verificar que se guarda en la base de datos y actualiza el semáforo del volumen en tiempo real.
5. Presionar "Imprimir Índice Oficial del Volumen" y verificar que abre el reporte formal con membrete, No. Instrumento, Volumen, Fecha Celebración, Acto, Comparecientes con rol, Páginas Inicial y Final, Observaciones (Firmada/Cancelada) y Certificación de Cierre del Notario.

**Acceptance Scenarios**:
1. **Given** la vista de volúmenes de índices, **When** se consultan los volúmenes registrados, **Then** cada card muestra:
   - Número de Volumen y Año.
   - Conteo de escrituras e intervalo de instrumentos comprendidos (ej. Escrituras 501 al 540).
   - Estado de foliado: Verde ("Completo - N/N foliadas") o Ámbar ("Pendiente - K pendientes").
2. **Given** un volumen seleccionado, **When** el usuario entra a su detalle, **Then** visualiza la tabla de escrituras ordenadas por número de instrumento con campos editables o modal ágil para capturar `pagina_inicial` y `pagina_final`.
3. **Given** la edición de páginas, **When** el usuario captura una página final menor que la inicial, **Then** el sistema valida y previene el error con una alerta clara.
4. **Given** el botón "Imprimir Índice del Volumen", **When** se acciona, **Then** se despliega la plantilla imprimible estándar con:
   - Encabezado Notarial oficial (Notaría, Notario Titular, Entidad, Número de Volumen).
   - Tabla reglamentaria: Instrumento, Volumen, Fecha Celebración, Acto Jurídico, Comparecientes (agrupados por su carácter: Adquirente, Enajenante, Otorgante, etc.), Página Inicial, Página Final y Estatus/Observaciones.
   - Pie de página con Certificación de Cierre del Volumen (conteo de instrumentos válidos, cancelados y líneas de firma y sello notarial).

---

### User Story 4 - Resumen Financiero y Control de Honorarios (Priority: P4)

Como Notario Titular o personal administrativo con permiso `reportes:ver_financieros`, quiero visualizar un resumen de cobranza de honorarios propios, cuentas por cobrar por escritura y fondos en custodia para órdenes de pago de derechos, con exportación para conciliación contable.

**Why this priority**: Asegura el control de ingresos propios de la notaría, detecta clientes con saldos vencidos y separa contablemente los honorarios de la notaría respecto a los derechos e impuestos pagados a dependencias oficiales.

**Independent Test**: Iniciar sesión con un usuario con permiso `reportes:ver_financieros`, abrir la pestaña "Financiero", verificar el total de honorarios cobrados vs. saldos pendientes, y verificar que usuarios sin dicho permiso no tengan acceso a esta pestaña.

**Acceptance Scenarios**:
1. **Given** un usuario con permiso `reportes:ver_financieros`, **When** accede a la sección financiera de reportes, **Then** visualiza:
   - Cobranza total de honorarios en el mes/año.
   - Saldo pendiente por cobrar (clientes deudores agrupados por escritura).
   - Fondos aportados para órdenes de pago ejercidos vs. por ejercer.
2. **Given** un usuario con solo permiso `reportes:ver_operativos` (ej. gestor o redactor), **When** ingresa a `/reportes`, **Then** la pestaña de datos financieros no se muestra ni es accesible vía API (control RLS estricto).

---

## Edge Cases

- **Volumen sin escrituras foliadas**: El card del volumen resalta en color neutro o ámbar indicando "0 de N foliadas", permitiendo ingresar al detalle para iniciar la captura consecutiva.
- **Salto o hueco en el foliado**: El sistema advierte si entre una escritura y la siguiente existe una discrepancia inusual en la numeración de páginas (ej. escritura A termina en pág. 15 y escritura B inicia en pág. 20).
- **Escrituras canceladas o que no pasaron**: Deben aparecer obligatoriamente en el índice del volumen, marcando en la columna de observaciones "CANCELADA / NO PASÓ" y conservando los folios que le correspondieron en el protocolo para evitar que el libro quede con huecos.
- **Comparecientes múltiples en un mismo acto**: El reporte del índice formatea limpiamente las partes (ej. "Enajenantes: Juan Pérez y María Gómez; Adquirente: Inmobiliaria del Norte S.A. de C.V.") sin encimar el texto ni truncar nombres en la impresión.
- **Periodos sin escrituras radicadas**: Las gráficas del dashboard muestran un estado vacío elegante ("Sin instrumentos registrados en este periodo") sin errores de canvas.
- **Impresión física repetida**: La hoja de estilos `@media print` garantiza márgenes reglamentarios (márgenes de encuadernación en hoja tamaño oficio o carta notarial) para imprimirse N veces con fidelidad idéntica.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE proveer la página principal de reportes en la ruta `/reportes` protegida por el permiso `reportes:ver_operativos`.
- **FR-002**: El sistema DEBE calcular y renderizar en tiempo real los KPIs del mes seleccionado: Total de escrituras abiertas, firmadas en el mes, en trámite y canceladas.
- **FR-003**: El sistema DEBE generar una gráfica interactiva de barras mostrando la distribución de escrituras abiertas en el mes por cada abogado redactor responsable.
- **FR-004**: El sistema DEBE calcular y mostrar una gráfica de dona con el **Top 5 de actos jurídicos con más demanda** en el mes consultado.
- **FR-005**: El sistema DEBE permitir filtrar dinámicamente el periodo del dashboard (mes y año) recalculando los datos sin recargar la página.
- **FR-006**: El sistema DEBE proveer una tabla general consolidada de escrituras con filtros por estatus (`firmadas`, `en_tramite`, `canceladas`, `todas`) y buscador de instrumentos.
- **FR-007**: El sistema DEBE mostrar para cada escritura el estado de su gestoría: conteo de trámites asignados al gestor y trámites ya liberados / concluidos.
- **FR-008**: El sistema DEBE permitir exportar el reporte general y los índices a formato **CSV / Excel** con codificación UTF-8 para análisis administrativo.
- **FR-009**: El sistema DEBE proveer una vista/sección de **Índices del Protocolo por Volumen** presentando los volúmenes en tarjetas (cards) con número de volumen, año, rango de escrituras y semáforo de completitud de foliado inicial y final.
- **FR-010**: El sistema DEBE permitir al usuario ingresar al detalle de un volumen y capturar o actualizar en la tabla los campos `pagina_inicial` y `pagina_final` de cada escritura, persistiendo en la columna correspondiente de `public.escrituras`.
- **FR-011**: El sistema DEBE validar que `pagina_final` sea mayor o igual que `pagina_inicial` y emitir retroalimentación si los valores son inválidos.
- **FR-012**: El sistema DEBE generar la plantilla imprimible del **Índice Oficial del Volumen** conteniendo: No. de Instrumento, Volumen, Fecha de Celebración, Acto Jurídico, Comparecientes con rol notarial, Página Inicial, Página Final, Observaciones (Firmada / Cancelada) y Certificación de Cierre del Volumen para firma del Notario.
- **FR-013**: El sistema DEBE contar con una plantilla estandarizada de impresión limpia (sin cabeceras de navegación, sidebar ni botones de acción) diseñada con CSS `@media print` para imprimirse N veces.
- **FR-014**: El sistema DEBE restringir los datos financieros (honorarios cobrados, saldos pendientes y cuentas por cobrar) exclusivamente a usuarios con el permiso `reportes:ver_financieros`.
- **FR-015**: El sistema DEBE incorporar en la documentación de arquitectura la nota técnica para la futura **Bitácora de Turnado y Custodia de Trámites entre Redactor y Gestor**.

---

## Non-Functional Requirements & Governance

- **Arquitectura Desacoplada (§3 Constitución Notarial)**: El módulo de reportes utiliza los campos ya existentes en `public.escrituras` (`volumen`, `pagina_inicial`, `pagina_final`, `fecha_celebracion`, `estatus`, `acto_juridico_id`) y sus relaciones (`escritura_comparecientes`, `tramites`) sin modificar los contratos de las pestañas en `escrituras/[id].vue`.
- **Diseño Notarial Institucional (§8 Constitución Notarial)**: Interfaz construida con tokens sobrios (`#1B3A5F`, `#A9762E`), tipografía legible y alta densidad de información sin saturar visualmente.
- **Seguridad y RLS (§4 Constitución Notarial)**: Las consultas agregadas respetan el rol y permisos del usuario autenticado; ninguna métrica financiera se expone a roles operativos básicos.
- **Rendimiento**: Los queries agregados utilizan índices existentes (`idx_escrituras_anio`, `idx_escrituras_estatus`, `created_at`) asegurando tiempos de respuesta menores a 500ms en el dashboard.
