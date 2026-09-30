# Feature Specification: 10-honorarios (Honorarios Notariales, Cotizaciones, Anticipos y Liquidación de Clientes)

**Feature Branch**: `10-honorarios`

**Created**: 2026-09-17

**Status**: Ready for Planning

**Input**: User description: "Implementar el módulo de Honorarios Notariales conforme a la Constitución del sistema (§3, §4, §7, §8), la hoja de ruta y los permisos definidos. Incluye cotización mediante partidas libres de honorarios y gastos propios de la notaría con cálculo de IVA (16%), estricta separación contable respecto a órdenes de pago de derechos de terceros, registro de pagos y anticipos del cliente (pago único o en parcialidades) que cubren de manera integral la cuenta del instrumento, saldo pendiente en tiempo real, emisión de presupuesto y hoja de liquidación consolidada para el cliente, infraestructura y modelo de datos preparado para facturación electrónica CFDI (con control administrativo de UUID y adjuntos en esta fase), pestaña HonorariosTab en escrituras/[id].vue y tablero consolidado de cobranza e ingresos en /honorarios."

---

## Clarifications

### Session 2026-09-17

- **Q1: Mecanismo de Cotización y Partidas de Honorarios**: ¿Cómo prefieres estructurar la cotización de honorarios en el sistema?
  - **Decisión**: **Partidas 100% Libres (Opción B)**. El usuario captura cada concepto de forma manual con su descripción textual, importe en MXN y selección explícita de si aplica o no IVA (16%), permitiendo flexibilidad total para honorarios por instrumento, testimonios, copias certificadas o gastos notariales específicos.
- **Q2: Gestión de Pagos, Anticipos y Derechos a Terceros**: ¿Cómo debe registrarse el anticipo y la liquidación del cliente frente a las órdenes de pago de derechos a dependencias?
  - **Decisión**: **Pago integral / Pago único (tanto de anticipo como de otros conceptos)**. El cliente suele realizar pagos únicos o anticipos globales que cubren la cuenta integral de la escritura (honorarios + gastos notariales + derechos a dependencias oficiales). El sistema registra estos pagos a nivel de la cuenta de la escritura y provee una **Hoja de Liquidación Consolidada** que totaliza honorarios, órdenes de pago de terceros y pagos recibidos, mostrando el saldo neto pendiente del cliente, mientras que en la base de datos se mantiene la estricta separación contable demandada por la Constitución (§7).
- **Q3: Alcance de Facturación CFDI**: ¿Qué alcance debe tener la gestión fiscal de comprobantes en esta fase?
  - **Decisión**: **Control Administrativo de CFDI con Infraestructura y Modelo de Datos Preparado para Timbrado Directo (Opción A extendida)**. En esta fase se gestionan administrativamente los datos fiscales del receptor (RFC, Razón Social, Régimen Fiscal, Código Postal, Uso de CFDI, Métodos SAT), el folio fiscal UUID timbrado y la custodia de archivos PDF y XML. Adicionalmente, el esquema de base de datos y la capa de servicios quedan completamente normalizados y preparados con los campos fiscales estándar del Anexo 20 (cadena original, sello SAT, certificados, forma/método de pago SAT) para permitir la conexión futura a un PAC sin requerir reestructuración de tablas.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Presupuesto y Cotización de Honorarios por Escritura con Partidas Libres (Priority: P1) 🎯 MVP

Como abogado responsable o titular de la notaría, quiero generar una cotización de honorarios y gastos notariales para una escritura específica capturando partidas libres (concepto, monto y tasa de IVA aplicable), para entregar al cliente un presupuesto claro, transparente y legalmente estructurado de los servicios notariales.

**Why this priority**: Todo acto notarial inicia con una propuesta de costos para el compareciente. Sin una cotización formal y registrada, no hay certeza sobre los honorarios pactados, se generan disputas con clientes y no se puede controlar el saldo por cobrar.

**Independent Test**: En la pestaña `Honorarios` de una escritura, pulsar "Nueva Cotización", agregar una partida de "Honorarios profesionales por protocolización de compraventa" por $28,000 MXN (+ IVA 16%) y una partida de "Gastos notariales de copias certificadas y archivo" por $3,200 MXN (sin IVA), verificar que el sistema calcula subtotal gravado ($28,000), subtotal exento ($3,200), IVA 16% ($4,480) y gran total cotizado de $35,680 MXN, y guardar la cotización en estado `cotizado`.

**Acceptance Scenarios**:
1. **Given** una escritura en cualquier estatus operativo, **When** el usuario accede a la pestaña `Honorarios`, **Then** puede generar o editar la cotización activa asociada a la escritura.
2. **Given** la captura de partidas libres, **When** el usuario ingresa conceptos personalizados, importes y activa o desactiva la casilla de IVA, **Then** el sistema recalcula en tiempo real el subtotal gravado, subtotal exento, IVA trasladado (16%) y total cotizado.
3. **Given** una cotización ya aprobada o con pagos registrados, **When** un usuario sin el permiso `honorarios.modificar_monto` intenta alterar las partidas o importes, **Then** el sistema deshabilita la edición y exige el permiso correspondiente.
4. **Given** la necesidad de aplicar un descuento comercial o cortesía institucional, **When** un usuario facultado agrega una partida de descuento, **Then** el sistema deduce el importe de la base gravable correspondiente y recalcula el total neto.

---

### User Story 2 - Registro de Pagos del Cliente (Pago Único / Anticipos) y Saldo Pendiente (Priority: P2)

Como cajero o auxiliar contable, quiero registrar los pagos realizados por el cliente —ya sea como pago único total o mediante anticipos parciales que cubren honorarios y otros conceptos—, capturando fecha, monto, método de pago y referencia bancaria, para mantener actualizado el saldo deudor de la escritura en tiempo real y emitir el recibo institucional correspondiente.

**Why this priority**: En la práctica diaria, el cliente realiza pagos que cubren tanto los honorarios como los anticipos de gastos y derechos de la escritura. La falta de control riguroso de cobros provoca entrega indebida de testimonios con saldos pendientes o descontrol en caja.

**Independent Test**: Registrar un pago de $20,000 MXN recibido mediante transferencia bancaria SPEI con clave de rastreo bancaria; constatar que el total pagado se incrementa a $20,000 MXN, el saldo pendiente disminuye automáticamente, el estatus de la cuenta transiciona a `anticipo_parcial` y se genera un recibo de cobro numerado. Posteriormente registrar un segundo pago por el saldo restante ($15,680 MXN) y verificar que la cuenta transiciona automáticamente a `liquidado` con saldo en cero.

**Acceptance Scenarios**:
1. **Given** una cuenta con saldo por liquidar, **When** el usuario registra un pago especificando monto, fecha, método de pago (`transferencia_spei`, `tarjeta_credito_debito`, `cheque`, `efectivo`) y referencia bancaria, **Then** el saldo se actualiza instantáneamente en pantalla.
2. **Given** un cliente que liquida el importe total en una sola exhibición ("pago único"), **When** se asienta el pago por el monto global exacto, **Then** la cuenta pasa de inmediato al estatus `liquidado`.
3. **Given** la necesidad de comprobación de pago al cliente, **When** se registra un pago, **Then** el sistema genera un folio consecutivo de recibo de caja con opción de imprimir o descargar el comprobante notarial.
4. **Given** un pago en efectivo, **When** el importe excede el límite permitido por las políticas antilavado (LFPIORPI), **Then** el sistema despliega una alerta preventiva de control de efectivo para el oficial de cumplimiento.

---

### User Story 3 - Hoja de Liquidación Consolidada y Control Fiscal CFDI (Priority: P3)

Como abogado notarial o cliente, quiero visualizar y generar la Hoja de Liquidación Consolidada del instrumento que integre de forma transparente tanto los Honorarios Notariales (con su IVA) como las Órdenes de Pago de Derechos a Terceros (RPP, Catastro, ISAI), y registrar los datos fiscales y el folio fiscal UUID de la factura electrónica emitida, para entregar al cliente cuentas claras y su comprobante fiscal correspondiente.

**Why this priority**: El cliente de la notaría requiere conocer el costo integral de su trámite en un solo documento ejecutivo. Separar internamente las cuentas de terceros de los honorarios propios garantiza salud contable y fiscal, mientras que la vista consolidada garantiza excelente experiencia al cliente.

**Independent Test**: Abrir la "Hoja de Liquidación Consolidada" de una escritura que tiene una cotización de honorarios de $35,680 MXN y dos órdenes de pago de derechos (RPP por $18,450 MXN y Catastro por $4,200 MXN); verificar que el desglose presenta con absoluta claridad ambos bloques, calcula el costo total integral del trámite ($58,330 MXN), deduce los pagos recibidos y muestra el saldo neto a pagar; capturar los datos fiscales del cliente (RFC, razón social, régimen, uso CFDI) y registrar el UUID del CFDI timbrado, marcando el estatus como `facturado`.

**Acceptance Scenarios**:
1. **Given** una escritura con cotización de honorarios y órdenes de pago de derechos existentes, **When** el usuario pulsa "Ver Hoja de Liquidación", **Then** el sistema genera el presupuesto consolidado diferenciando nítidamente ingresos de la notaría vs derechos gubernamentales.
2. **Given** la entrega de la factura de honorarios, **When** el usuario captura los datos fiscales del cliente y registra el folio fiscal UUID (36 caracteres) junto con los archivos PDF y XML en el expediente, **Then** el estatus de facturación cambia a `facturado`.
3. **Given** el modelo de datos preparado para facturación, **When** se inspeccionan las entidades del módulo, **Then** cuentan con la estructura y campos fiscales normalizados (método de pago SAT PUE/PPD, forma de pago SAT, régimen fiscal, UUID) listos para la futura integración directa con el servicio de timbrado PAC.
4. **Given** un directivo o administrador que accede a `/honorarios`, **When** consulta el tablero general, **Then** visualiza KPIs consolidados de ingresos del mes, cuentas por cobrar, desglose de cobranza y listado de todas las escrituras con saldo pendiente.

---

## Edge Cases

- **Partida de Descuento Mayor al Subtotal**: El sistema valida que la suma de partidas de descuento o bonificación no pueda superar el subtotal positivo de honorarios y gastos (el total cotizado no puede ser negativo).
- **Cancelación o Anulación de Escritura con Pagos Asentados**: Si una escritura es anulada tras haberse recibido pagos, la cuenta de honorarios pasa a estatus `en_devolucion` o `cancelado`, calculando el importe recibido a favor del cliente para su reembolso o transferencia a otro expediente.
- **Pago en Exceso o Diferencias a Favor**: Si el cliente transfiere un monto mayor al saldo de la cuenta (por ejemplo, para prever derechos registrales adicionales), el sistema calcula y muestra un saldo a favor en verde, permitiendo su aplicación posterior.
- **Modificación de Partidas tras Liquidación**: Una vez que la cuenta se encuentra en estatus `liquidado`, cualquier modificación a las partidas de cobro requiere que el usuario cuente con el permiso `honorarios.modificar_monto` y confirma una advertencia de recálculo de saldo.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mantener una tabla maestra de cuentas de honorarios (`honorarios_cuentas`) vinculada por clave foránea única a la escritura pública (`escritura_id`).
- **FR-002**: El sistema DEBE permitir registrar partidas libres (`honorarios_partidas`) para cada cuenta, con los siguientes campos:
  - `cuenta_id`: Referencia foránea obligatoria a `honorarios_cuentas`.
  - `concepto`: Texto libre obligatorio con la descripción del servicio o gasto (ej. "Honorarios de fe pública", "Elaboración de testimonio", "Certificaciones", "Gastos de gestoría").
  - `monto`: Importe numérico en moneda nacional (MXN), con 2 decimales.
  - `aplica_iva`: Booleano que indica si la partida genera IVA (16%).
  - `tasa_iva`: Tasa impositiva aplicable (0.16 para partidas gravadas, 0.00 para exentas).
  - `es_descuento`: Booleano que indica si la partida representa una deducción o bonificación comercial.
  - `orden`: Entero para ordenar secuencialmente las partidas en la cotización.
- **FR-003**: El sistema DEBE calcular automáticamente y mantener sincronizados los totales de la cuenta de honorarios:
  - `subtotal_gravado`: Suma de importes de partidas con `aplica_iva = true` (excluyendo descuentos).
  - `subtotal_exento`: Suma de importes de partidas con `aplica_iva = false` (excluyendo descuentos).
  - `descuento_total`: Suma de partidas con `es_descuento = true`.
  - `iva_total`: Impuesto al Valor Agregado calculado como `(subtotal_gravado - descuento_gravado) * 0.16`.
  - `total_cotizado`: `subtotal_gravado + subtotal_exento + iva_total - descuento_total`.
- **FR-004**: El sistema DEBE mantener un registro de pagos y anticipos (`honorarios_pagos`) asociados a la cuenta de la escritura:
  - `cuenta_id`: Referencia a `honorarios_cuentas`.
  - `folio_recibo`: Consecutivo institucional del recibo notarial (ej. `REC-2026-0001`).
  - `monto`: Importe liquidado en MXN.
  - `fecha_pago`: Fecha en que se recibió el cobro.
  - `metodo_pago`: `transferencia_spei`, `tarjeta_credito_debito`, `cheque`, `efectivo`.
  - `referencia_bancaria`: Clave de rastreo SPEI, número de cheque o folio de autorización.
  - `concepto`: Nota o descripción del pago (ej. "Pago único de escrituración", "Anticipo 50%").
  - `recibido_por`: Usuario que registró el ingreso.
  - `comprobante_documento_id`: Referencia opcional al comprobante digitalizado en `expedientes_documentos`.
- **FR-005**: El sistema DEBE calcular dinámicamente:
  - `total_pagado`: Suma de todos los pagos registrados en `honorarios_pagos`.
  - `saldo_pendiente`: `total_cotizado - total_pagado`.
  - `estatus`: Transición automática entre `borrador`, `cotizado`, `anticipo_parcial`, `liquidado`, `cancelado`.
- **FR-006**: El sistema DEBE aplicar la separación contable estricta exigida por la Constitución (§7):
  - Las tablas `honorarios_*` y `ordenes_pago` deben mantenerse completamente desacopladas a nivel relacional.
  - Las órdenes de pago gestionan dinero de paso hacia dependencias gubernamentales; las cuentas de honorarios gestionan ingresos propios de la notaría.
- **FR-007**: El sistema DEBE generar una **Hoja de Liquidación Consolidada** (en pantalla y formato imprimible/PDF) que presente al cliente:
  - Bloque 1: Honorarios y Gastos Notariales Propios (desglose de partidas, subtotales, IVA y total notaría).
  - Bloque 2: Derechos, Impuestos y Gastos a Terceros (relación de órdenes de pago registradas en la escritura: RPP, Catastro, ISAI, Avalúo).
  - Bloque 3: Resumen Integral de Cuenta (Gran Total del Trámite = Total Notaría + Total Derechos, Total de Pagos/Anticipos Recibidos, Saldo Neto Pendiente del Cliente).
- **FR-008**: El sistema DEBE implementar el control administrativo y el modelo de datos preparado para CFDI:
  - Campos del receptor: `rfc_receptor`, `razon_social`, `regimen_fiscal_receptor`, `codigo_postal_fiscal`, `uso_cfdi`.
  - Campos de emisión y timbrado: `estatus_facturacion` (`no_requerida`, `pendiente`, `facturada`, `cancelada`), `uuid_fiscal`, `fecha_timbrado`, `metodo_pago_sat` (`PUE`, `PPD`), `forma_pago_sat` (`01` efectivo, `02` cheque, `03` transferencia, `04` tarjeta crédito, `28` tarjeta débito).
  - Custodia de archivos: referencias a `factura_pdf_id` y `factura_xml_id` en el repositorio documental.
  - Infraestructura de datos extensible: columnas normalizadas listas para almacenar la respuesta técnica de un Web Service de timbrado PAC sin migraciones destructivas futuras.
- **FR-009**: El sistema DEBE proveer la pestaña `HonorariosTab.vue` en [`escrituras/[id].vue`](file:///Users/cosmic-chimps/IdeaProjects/pruebas%20de%20concepto/notarius-cc/app/pages/escrituras/%5Bid%5D.vue) y la página de cobranza global `/honorarios` con tarjetas KPI, filtros de búsqueda y exportación de relación de cobros.
- **FR-010**: El sistema DEBE restringir la modificación de montos en cotizaciones confirmadas o con pagos al permiso `honorarios.modificar_monto`, registrando auditoría completa (`created_by`, `updated_by`, timestamps).

---

### Key Entities *(include if feature involves data)*

- **`honorarios_cuentas`**:
  - `id`: UUID (PK).
  - `escritura_id`: UUID (FK a `escrituras`, UNIQUE).
  - `subtotal_gravado`: Numeric(12, 2).
  - `subtotal_exento`: Numeric(12, 2).
  - `descuento_total`: Numeric(12, 2).
  - `iva_total`: Numeric(12, 2).
  - `total_cotizado`: Numeric(12, 2).
  - `total_pagado`: Numeric(12, 2).
  - `saldo_pendiente`: Numeric(12, 2).
  - `estatus`: Enum (`borrador`, `cotizado`, `anticipo_parcial`, `liquidado`, `cancelado`).
  - `rfc_receptor`, `razon_social`, `regimen_fiscal`, `codigo_postal_fiscal`, `uso_cfdi`.
  - `estatus_facturacion`: Enum (`no_requerida`, `pendiente`, `facturada`, `cancelada`).
  - `uuid_fiscal`: Varchar(36).
  - `fecha_timbrado`: Timestamptz.
  - `metodo_pago_sat`: Varchar(5).
  - `forma_pago_sat`: Varchar(5).
  - `factura_pdf_id`, `factura_xml_id`: UUID (FK a `expedientes_documentos`).
  - `created_by`, `updated_by`: UUID (FK a `auth.users`).
  - `created_at`, `updated_at`: Timestamptz.

- **`honorarios_partidas`**:
  - `id`: UUID (PK).
  - `cuenta_id`: UUID (FK a `honorarios_cuentas`, ON DELETE CASCADE).
  - `concepto`: Text.
  - `monto`: Numeric(12, 2).
  - `aplica_iva`: Boolean (default true).
  - `tasa_iva`: Numeric(4, 2) (default 0.16).
  - `es_descuento`: Boolean (default false).
  - `orden`: Integer.
  - `created_at`: Timestamptz.

- **`honorarios_pagos`**:
  - `id`: UUID (PK).
  - `cuenta_id`: UUID (FK a `honorarios_cuentas`, ON DELETE CASCADE).
  - `folio_recibo`: Varchar(50).
  - `monto`: Numeric(12, 2).
  - `fecha_pago`: Date.
  - `metodo_pago`: Enum (`transferencia_spei`, `tarjeta_credito_debito`, `cheque`, `efectivo`).
  - `referencia_bancaria`: Varchar(100).
  - `concepto`: Text.
  - `recibido_por`: UUID (FK a `auth.users`).
  - `comprobante_documento_id`: UUID (FK opcional a `expedientes_documentos`).
  - `notas`: Text.
  - `created_at`: Timestamptz.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede capturar partidas libres y generar una cotización completa de honorarios con cálculo automático de IVA y subtotales en menos de 45 segundos.
- **SC-002**: El cálculo aritmético de subtotales, IVA 16%, descuentos, total pagado y saldo pendiente se realiza en tiempo real (< 50 ms) con exactitud al centavo sin discrepancias de redondeo.
- **SC-003**: La Hoja de Liquidación Consolidada genera en pantalla y en PDF un estado de cuenta integral combinando honorarios y órdenes de pago de derechos de terceros, manteniendo cero acoplamiento entre sus tablas de base de datos.
- **SC-004**: El 100% de los pagos y cambios a cotizaciones confirmadas quedan trazados en auditoría con usuario, fecha y método de pago.
- **SC-005**: La suite de pruebas unitarias y de integración cubre todas las operaciones de cálculo, transiciones de estado, permisos de edición de montos y componentes UI sin ninguna regresión sobre los 250 tests existentes.

---

## Assumptions

- **Moneda**: Todas las cotizaciones, partidas y pagos se expresan en Pesos Mexicanos (MXN).
- **Tasa de IVA**: Se aplica el 16% sobre partidas gravadas de servicios profesionales notariales; gastos de recuperación o copias exentas aplican 0% según se indique en `aplica_iva`.
- **Permisos**: Usuarios con rol `Auxiliar` pueden registrar cobros y pagos según su alcance; únicamente usuarios con permiso `honorarios.modificar_monto` pueden editar partidas de cotizaciones aprobadas.
- **Facturación CFDI**: El timbrado fiscal en esta versión se realiza externamente o se deja preparado con los campos normativos del SAT Anexo 20 para el conector PAC posterior.
