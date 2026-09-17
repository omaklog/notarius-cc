# Feature Specification: 08-ordenes-pago (Órdenes de Pago de Derechos a Terceros, Líneas de Captura y Conciliación)

**Feature Branch**: `08-ordenes-pago`

**Created**: 2026-09-16

**Status**: Ready for Planning

**Input**: User description: "Implementar el módulo de Órdenes de Pago conforme a la Constitución del sistema (§3, §4, §7, §8) y la hoja de ruta de spec-kit. Incluye registro de órdenes de pago por derechos a terceros (RPP, Catastro, ISAI/ISABI, SACMEX, SAT, SE), líneas de captura bancarias y gubernamentales con fecha de vencimiento, comprobantes de pago y folio de autorización bancaria o SPEI, conciliación directa con los trámites notariales correspondientes, pestaña OrdenesPagoTab en la escritura y tablero consolidado de tesorería y caja."

---

## Clarifications

### Session 2026-09-16

- Q: ¿Deben las órdenes de pago de derechos pendientes condicionar o bloquear la protocolización de la escritura en `fn_validar_protocolizacion`, o deben mantenerse como un control financiero y de tesorería independiente que no impida la firma del instrumento? → A: **Opción C - Alerta informativa no bloqueante**. El sistema no bloquea la protocolización formal en `fn_validar_protocolizacion` ante órdenes de pago pendientes, pero despliega una alerta informativa visible en la cabecera de la escritura y en la pestaña de órdenes de pago para advertir al Notario y al personal sobre derechos aún no liquidados.
- Q: ¿Cómo deben originarse las órdenes de pago de derechos en la escritura: sugeridas/precargadas automáticamente al instanciar los trámites del acto o registradas conforme la dependencia oficial emite la línea de captura de cobro? → A: **Opción A - Captura asistida bajo demanda**. La orden de pago se registra cuando el gestor, cajero o portal oficial de la dependencia emite la línea de captura gubernamental con su monto exacto y vigencia real, evitando órdenes borrador con montos en cero o inexactos.
- Q: ¿Debe este módulo controlar el saldo de anticipos y depósitos recibidos del cliente para cubrir el dinero de paso, o debe enfocarse estrictamente en la gestión de egresos y líneas de captura hacia dependencias oficiales, reservando la cuenta corriente de anticipos para el módulo de Honorarios? → A: **Opción A - Gestión de egresos a terceros con procedencia de fondos**. El módulo se enfoca en líneas de captura, montos a dependencias y comprobantes bancarios, registrando quién aportó los fondos (`adquirente`, `enajenante`, `notaria_fondo_revolvente`, `banco_acreedor`), reservando la cuenta corriente de anticipos, cobros y liquidación al cliente para el módulo posterior de Honorarios.
- Q: ¿Cómo se articulan las órdenes de pago con el catálogo de dependencias del seeder y el pipeline de 17 pasos de gestoría? → A: **Enlace directo en pasos de "O.P." con dependencias predeterminadas**. Los pasos 3 (`O.P. CAT. EST.`), 8 (`ORD. DE PAG. R.P.P.`) y 16 (`O.P. MUNICIPAL`) del pipeline de gestoría enlazan directamente a la creación y conciliación de órdenes de pago hacia sus respectivas dependencias oficiales (`Catastro Estatal`, `Registro Público`, `Catastro Municipal`), precargando la entidad acreedora correspondiente.

---

### User Story 1 - Registro y Gestión de Órdenes de Pago por Escritura y Trámite (Priority: P1) 🎯 MVP

Como auxiliar contable o gestor notarial, quiero registrar una orden de pago de derechos oficiales vinculada a una escritura y opcionalmente a un trámite específico, capturando el concepto, dependencia, monto exacto y la línea de captura emitida por la autoridad con su fecha de vencimiento, para tener el control preciso de los recursos de paso destinados a entidades gubernamentales.

**Why this priority**: En una notaría pública, el dinero de paso para pago de derechos registrales e impuestos locales (ISAI, predial, RPP) representa la mayor parte del flujo financiero del cliente. Sin un registro riguroso por instrumento, se producen omisiones de pago, recargos fiscales o suspensión de trámites por falta de pago.

**Independent Test**: En la pestaña "Órdenes de Pago" de una escritura, presionar "Nueva Orden de Pago", seleccionar la dependencia "RPP", capturar el concepto "Derechos de Inscripción de Testimonio", ingresar la línea de captura gubernamental con fecha de vencimiento y monto de $18,450 MXN, asociarlo al trámite correspondiente y verificar que se despliega en la lista de órdenes de la escritura con estatus "Pendiente de Pago".

**Acceptance Scenarios**:
1. **Given** una escritura en proceso, **When** el usuario accede a la pestaña `Órdenes de Pago`, **Then** el sistema presenta el listado de órdenes agrupadas por dependencia y estatus financiero (`pendiente`, `en_tesoreria`, `pagado`, `cancelado`).
2. **Given** un trámite notarial registrado (e.g. Avalúo Catastral), **When** se genera la orden de pago asociada, **Then** el trámite refleja automáticamente el enlace a la orden y muestra su estatus de pago en tiempo real.
3. **Given** una línea de captura emitida por la Tesorería o RPP, **When** se captura en el sistema con su fecha límite de pago, **Then** el sistema valida el formato y activa un semáforo de vigencia de la línea de captura.

---

### User Story 2 - Liquidación Bancaria, Comprobante y Conciliación Financiera (Priority: P2)

Como cajero o responsable de administración notarial, quiero asentar el pago efectivo de la orden de pago especificando el método de pago (transferencia SPEI, cheque de caja, tarjeta, ventanilla bancaria), capturar la clave de rastreo / folio de autorización bancaria y adjuntar el comprobante o acuse en PDF/imagen, para que el gestor pueda acudir a ventanilla gubernamental con el comprobante validado.

**Why this priority**: Las dependencias oficiales exigen el comprobante bancario con sello o acuse para liberar testimonios o certificados de gravamen. Vincular el comprobante bancario directamente a la orden y custodiarlo en el expediente digital garantiza certeza contable y evita duplicidad de pagos.

**Independent Test**: Seleccionar una orden de pago pendiente, hacer clic en "Asentar Pago", seleccionar método "Transferencia SPEI", ingresar la clave de rastreo bancaria, adjuntar el archivo PDF del comprobante bancario y confirmar; constatar que la orden cambia a estado "Pagado", el archivo se almacena en el expediente digital de la escritura y el trámite vinculado actualiza su chip a "Derechos Pagados".

**Acceptance Scenarios**:
1. **Given** una orden de pago en estatus `pendiente`, **When** el usuario captura los datos de liquidación (fecha de pago, método, folio bancario, monto cubierto) y adjunta el comprobante, **Then** la orden pasa a estado `pagado` y se asienta el usuario y fecha de confirmación.
2. **Given** una orden pagada con comprobante bancario adjunto, **When** el gestor revisa el trámite ante la dependencia, **Then** tiene acceso directo para visualizar o descargar el recibo oficial de pago.
3. **Given** una orden de pago que fue cancelada por error de línea de captura o revocación del acto, **When** el usuario la cancela, **Then** se requiere justificación obligatoria y la orden queda archivada en estado `cancelado` sin eliminarse de la auditoría.

---

### User Story 3 - Tablero Consolidado de Tesorería Notarial y Vencimiento de Líneas (Priority: P3)

Como Notario Titular o contador general de la notaría, quiero supervisar en una vista global `/ordenes-pago` todas las órdenes de pago activas en la notaría, con filtros por dependencia oficial, rango de fechas, estatus de pago y semáforo de vencimiento de líneas de captura, para coordinar el fondeo bancario oportuno y prevenir el pago extemporáneo de derechos.

**Why this priority**: Las líneas de captura gubernamentales (particularmente las de ISAI y RPP) tienen vigencias cortas (a menudo de 5 a 15 días naturales). Si vencen, es necesario recalcular recargos y tramitar nuevas líneas, generando retrasos operativos.

**Independent Test**: Navegar a `/ordenes-pago`, consultar los contadores de montos totales por pagar hoy vs pagados en el mes, filtrar por líneas próximas a vencer (menos de 48 horas) y verificar que la tabla muestra las órdenes ordenadas por urgencia.

**Acceptance Scenarios**:
1. **Given** el usuario con permisos de tesorería o administración, **When** ingresa a `/ordenes-pago`, **Then** visualiza tarjetas KPI con: Total Monto por Pagar, Total Pagado en el Mes, Órdenes Pendientes y Líneas de Captura por Vencer en 48 hrs.
2. **Given** una línea de captura cuya fecha de vencimiento es igual o anterior al día actual sin haberse pagado, **When** se consulta el tablero, **Then** se marca en rojo con alerta de "Línea de captura vencida".
3. **Given** la necesidad de corte de caja del día, **When** el usuario pulsa "Exportar Relación de Pagos", **Then** el sistema genera una relación descargable con los folios de línea de captura, bancos y montos liquidados.

---

## Edge Cases

- **Línea de Captura Vencida sin Pagar**: Si una línea de captura gubernamental caduca antes del pago, el sistema permite registrar la "Reexpedición de Línea de Captura" con nuevo folio y nueva vigencia manteniendo el histórico de la anterior.
- **Pago en Exceso o Diferencias de Centavos**: Si la autoridad gubernamental ajusta los derechos al calificar el documento (e.g. derechos complementarios por fojas adicionales de testimonio), el sistema permite crear una orden complementaria vinculada al mismo trámite.
- **Cancelación o Desistimiento del Acto Notarial con Orden Pagada**: Si el cliente desiste de la operación habiendo pagado derechos, se registra el estatus `en_devolucion` o `cancelado` para tramitar la devolución de pago de lo indebido ante la Tesorería de la CDMX.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mantener una tabla de órdenes de pago (`ordenes_pago`) vinculada a la escritura pública (`escritura_id`) y opcionalmente al trámite correspondiente (`tramite_id`).
- **FR-002**: Cada orden de pago DEBE registrar:
  - `escritura_id`: Referencia obligatoria a la escritura matriz.
  - `tramite_id`: Referencia opcional al trámite oficial vinculado.
  - `dependencia_id`: Referencia a la dependencia oficial acreedora de los derechos (`cat_dependencias_oficiales`).
  - `concepto`: Concepto de pago (ej. Derechos de Inscripción RPP, ISAI, Avalúo Catastral, Constancia de No Adeudo de Agua, Derechos Federales).
  - `monto`: Importe en moneda nacional (MXN) con dos decimales.
  - `linea_captura`: Código o referencia alfanumérica de la línea de captura gubernamental/bancaria.
  - `fecha_emision_linea`: Fecha de expedición del formato de pago.
  - `fecha_vencimiento_linea`: Fecha fatal de caducidad de la línea de captura.
  - `estado`: `pendiente`, `en_tesoreria`, `pagado`, `cancelado`.
  - `metodo_pago`: `transferencia_spei`, `cheque_caja`, `tarjeta_credito_debito`, `efectivo_ventanilla`.
  - `folio_autorizacion_bancaria`: Clave de rastreo o número de autorización bancaria.
  - `fecha_pago`: Fecha en que se liquidó.
  - `pagado_por`: Usuario que registró/confirmó el pago.
  - `comprobante_documento_id`: Referencia al archivo en `expediente_documentos`.
  - `quien_cubre`: Quién suministró los fondos (`adquirente`, `enajenante`, `notaria_fondo_revolvente`, `banco_acreedor`).
  - `observaciones`: Notas internas.
- **FR-003**: El sistema DEBE calcular dinámicamente el semáforo de vigencia de la línea de captura:
  - `verde`: Restan más de 3 días para el vencimiento de la línea.
  - `amarillo`: Restan entre 1 y 3 días para el vencimiento de la línea.
  - `rojo`: La línea de captura está vencida o vence hoy sin haber sido pagada.
  - `azul`: Pagada.
  - `gris`: Cancelada.
- **FR-004**: Al liquidar una orden de pago vinculada a un trámite, el sistema DEBE actualizar reactivamente el estado y el enlace en el trámite correspondiente (`tramites_escritura`), permitiendo que el gestor visualice el comprobante inmediatamente.
- **FR-005**: El sistema DEBE aplicar la separación contable estricta exigida por la Constitución (§7): las órdenes de pago registran únicamente dinero de paso para terceros y no se mezclan con los honorarios notariales.
- **FR-006**: El sistema DEBE proveer la pestaña `OrdenesPagoTab.vue` en el detalle de la escritura (`app/pages/escrituras/[id].vue`), sustituyendo el `PlaceholderTab` de la pestaña `ordenes`.
- **FR-007**: El sistema DEBE proveer el tablero consolidado en `/ordenes-pago` (`app/pages/ordenes-pago/index.vue`) con KPIs de montos pendientes/pagados y filtros de tesorería.
- **FR-008**: El sistema NO DEBE bloquear la protocolización formal en `fn_validar_protocolizacion` ante órdenes de pago de derechos pendientes; en su lugar, DEBE desplegar una alerta informativa en la cabecera de la escritura y en la pestaña de órdenes de pago advirtiendo sobre derechos pendientes de liquidación.
- **FR-009**: Las órdenes de pago de derechos DEBEN originarse mediante captura asistida bajo demanda cuando el gestor, cajero o portal oficial de la dependencia emite la línea de captura gubernamental, capturando su vigencia, dependencia y monto exacto.
- **FR-010**: El módulo DEBE enfocarse estrictamente en la gestión de egresos y líneas de captura de dinero de paso hacia dependencias oficiales, registrando en cada orden quién fondeó el pago (`adquirente`, `enajenante`, `notaria_fondo_revolvente`, `banco_acreedor`), reservando la cuenta corriente de anticipos, cobros y liquidación al cliente para el módulo de Honorarios.

---

### Key Entities *(include if feature involves data)*

- **OrdenPago (`ordenes_pago`)**: Registro financiero de dinero de paso destinado al pago de derechos e impuestos ante dependencias oficiales.
- **DependenciaOficial (`cat_dependencias_oficiales`)**: Entidad gubernamental receptora de los derechos (reutilizada del módulo 07).
- **TramiteEscritura (`tramites_escritura`)**: Trámite oficial que originó la necesidad del pago de derechos (reutilizada del módulo 07).
- **ExpedienteDocumento (`expediente_documentos`)**: Archivo digital del comprobante o acuse de pago bancario (reutilizada del módulo 06).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El personal de caja o gestoría puede registrar una nueva orden de pago con línea de captura en menos de 20 segundos.
- **SC-002**: 100% de las órdenes de pago con fecha de vigencia muestran su semáforo de caducidad en tiempo real, previniendo líneas de captura vencidas.
- **SC-003**: Al liquidar una orden de pago vinculada a un trámite, el trámite refleja el estado "Derechos Pagados" de forma instantánea.
- **SC-004**: El tablero global `/ordenes-pago` totaliza montos pagados y por pagar en menos de 200 ms.
- **SC-005**: Mantenimiento del 100% de pruebas pasando en la suite existente de Vitest (174 pruebas actuales) con cero regresiones.

---

## Assumptions

- Las tarifas oficiales de derechos de inscripción o avalúos pueden variar anualmente conforme al Código Fiscal de la CDMX y leyes hacendarias locales; las líneas de captura contienen el monto oficial fijado por la autoridad.
- Los comprobantes bancarios se custodian en el bucket de Storage `expedientes` vinculados a la escritura correspondiente.
- El módulo de Honorarios (ingreso propio de la notaría) se mantendrá en una tabla separada conforme al mandato de separación contable de la Constitución (§7).
