# Feature Specification: 11-avisos-sat (Avisos SAT / UIF - Prevención de Lavado de Dinero SPPLD)

**Feature Branch**: `11-avisos-sat`

**Created**: 2026-09-17

**Status**: Ready for Planning

**Input**: User description: "Implementar el módulo de Avisos SAT / UIF conforme al Art. 17 de la LFPIORPI y la Constitución del sistema (§5). Incluye la detección de actos vulnerables que superan el umbral de aviso en UMA histórica a la fecha del acto, generación del layout XML oficial para el portal SPPLD del SAT (Fedatarios Públicos), cédula de datos en pantalla y opción de descarga en PDF, flujo de aviso ordinario mensual, soporte dual (individual y paquete mensual consolidado), informe mensual en ceros, aviso urgente de 24 horas por coincidencia en Lista de Personas Bloqueadas (LPB), cálculo inteligente de vencimiento legal con prórroga por sexto dígito del RFC, registro de folios oficiales de acuse SAT con carga de PDF de confirmación, la pestaña integrada en el Hub de Escritura (AvisosTab) y el tablero central mensual en /avisos-sat."

---

## Clarifications

### Session 2026-09-17

- **Q1: Formato de Salida y Generación de Archivos para el Portal SPPLD** → **A: Opción A + Opción PDF**. El sistema genera y descarga el archivo `.xml` estructurado oficial listo para cargarse en el portal SPPLD del SAT conforme al esquema de Fedatarios Públicos (Art. 17 Fracc. XII LFPIORPI). Además, incluye una cédula/tarjeta interactiva en pantalla para cotejo previo y la opción de generar y descargar la **Cédula de Aviso SAT en PDF** con membrete notarial para revisión interna del Notario y respaldo documental del expediente físico.
- **Q2: Modalidad de Envío (Individual por Escritura vs Paquete Mensual Consolidado)** → **A: Opción A - Soporte Dual**. El sistema permite generar y descargar el archivo XML de aviso de una escritura específica desde su propia pestaña (`AvisosTab`), y adicionalmente ofrece la funcionalidad en el tablero central (`/avisos-sat`) para compilar y descargar en un solo clic un paquete XML mensual consolidado conteniendo todas las operaciones reportables del periodo para su carga masiva en el portal del SAT.
- **Q3: Cálculo de Fecha Límite y Prórroga por Sexto Dígito del RFC** → **A: Opción A - Fecha límite inteligente con prórroga por RFC**. El sistema calcula como base de vencimiento legal el día 17 del mes inmediato posterior a la fecha del acto celebrado, y adiciona automáticamente los días hábiles de prórroga conforme al sexto dígito numérico del RFC del Notario registrado en la configuración del sistema (conforme a la Resolución Miscelánea Fiscal: dígitos 1-2: +1 día hábil; 3-4: +2 días hábiles; 5-6: +3 días hábiles; 7-8: +4 días hábiles; 9-0: +5 días hábiles), mostrando en tiempo real los días hábiles restantes y el semáforo preventivo.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Diagnóstico, Generación XML/PDF y Gestión de Aviso Individual en la Escritura (Priority: P1) 🎯 MVP

Como abogado o auxiliar responsable de la escritura, quiero que el sistema dictamine en tiempo real si el instrumento es una Actividad Vulnerable sujeta a aviso ante el SAT/UIF, me permita visualizar la cédula de datos en pantalla, generar el archivo XML oficial para el portal SPPLD, descargar la Cédula en PDF y registrar el folio de acuse oficial con su comprobante digital, para garantizar el cumplimiento normativo específico del expediente.

**Why this priority**: Es la necesidad operativa directa dentro del expediente notarial. El abogado necesita saber si la escritura que tramita genera aviso fiscal y contar con las herramientas para cotejar, generar XML y PDF, y archivar el acuse en el expediente sin salir del hub de la escritura.

**Independent Test**: Abrir una escritura de compraventa o constitución de sociedad que rebase el umbral de aviso en UMAs, acceder a la pestaña "Avisos SAT/UIF", verificar que el sistema muestra el semáforo y dictamen legal "Sujeta a Aviso Ordinario SAT", visualizar la cédula de datos, pulsar "Generar XML SPPLD" para descargar el archivo XML, pulsar "Descargar Cédula PDF" para obtener la ficha impresa, y registrar el folio oficial del acuse SAT cargando el PDF del comprobante, verificando que el estatus cambia a "Presentado con Acuse".

**Acceptance Scenarios**:

1. **Given** una escritura con acto jurídico vulnerable (`es_actividad_vulnerable = true`) cuyo monto en UMAs excede el umbral de aviso a la fecha del acto, **When** el usuario navega a la pestaña "Avisos SAT/UIF", **Then** el sistema muestra la tarjeta de dictamen con estatus "Pendiente de Presentación", monto en MXN y UMAs, y fecha límite legal calculada con prórroga por RFC.
2. **Given** una escritura con acto no vulnerable o con monto inferior al umbral de aviso, **When** se consulta la pestaña, **Then** el sistema muestra el dictamen "Operación Exenta de Aviso SAT" indicando claramente el fundamento en UMAs y liberando cualquier restricción de cumplimiento.
3. **Given** un aviso ordinario pendiente en una escritura, **When** el usuario pulsa "Generar Layout XML SPPLD", **Then** el sistema construye y descarga el archivo XML validado contra la estructura oficial de fedatarios públicos, conteniendo los datos de la notaría, comparecientes, forma de pago y datos del bien.
4. **Given** la necesidad de revisión interna o expediente físico, **When** el usuario pulsa "Descargar Cédula PDF", **Then** el sistema genera un documento PDF oficial foliado con membrete notarial conteniendo el desglose íntegro de la operación, comparecientes, montos, forma de pago y dictamen PLD.
5. **Given** un aviso presentado en el portal del SAT, **When** el usuario captura el número de folio oficial de aceptación y adjunta el archivo PDF del acuse emitido por el SAT, **Then** el sistema almacena el documento en el bucket de expedientes, registra la fecha/hora de presentación, sella al usuario responsable y actualiza el estatus del aviso a "Presentado con Acuse".

---

### User Story 2 - Tablero Central Mensual de Cumplimiento SAT y Paquete Consolidado (Priority: P2)

Como Notario Titular o Responsable de Cumplimiento PLD, quiero disponer de un tablero centralizado en `/avisos-sat` que concentre todas las operaciones vulnerables del mes, muestre la cuenta regresiva al vencimiento legal inteligente (día 17 + prórroga por RFC) y permita exportar el paquete mensual consolidado XML para cumplir en tiempo y forma ante la autoridad.

**Why this priority**: La responsabilidad administrativa y económica por avisos extemporáneos u omitidos recae solidariamente sobre el Notario Público. Un tablero de control mensual asegura que ninguna escritura quede sin presentar antes de la fecha límite fiscal y agiliza la presentación masiva.

**Independent Test**: Acceder a la ruta `/avisos-sat`, seleccionar un mes y año determinado, verificar el cálculo de las métricas (escrituras totales vulnerables, avisos presentados, avisos pendientes y días restantes para el vencimiento legal), pulsar "Generar Paquete Mensual XML" y constatar la descarga del XML consolidado con todas las operaciones del mes.

**Acceptance Scenarios**:

1. **Given** el ingreso a la vista `/avisos-sat`, **When** se selecciona un periodo fiscal (año y mes), **Then** el sistema calcula y muestra: días hábiles restantes considerando el sexto dígito del RFC de la notaría, semáforo de urgencia (verde > 5 días, amarillo ≤ 5 días, rojo vencido), total de operaciones vulnerables, monto total reportable y conteo de avisos pendientes.
2. **Given** la lista de escrituras del mes seleccionado, **When** el usuario aplica filtros por estatus ("Pendientes", "Presentados", "Exentos"), **Then** la tabla se actualiza de forma reactiva mostrando folios de escritura, clientes principales, montos y accesos directos al hub del instrumento.
3. **Given** un conjunto de escrituras con aviso pendiente en el mes, **When** el usuario pulsa "Generar Paquete Mensual XML", **Then** el sistema compila en un único archivo XML consolidado todas las operaciones del periodo listas para su carga masiva en el portal SPPLD.

---

### User Story 3 - Informe Mensual en Ceros y Avisos Urgentes de 24 Horas (Priority: P3)

Como oficial de cumplimiento, quiero poder asentar formalmente el "Informe en Ceros" ante el SAT cuando no existan actos sujetos a aviso en un mes concluido, así como gestionar con máxima prioridad los "Avisos de 24 Horas" derivados de coincidencias en Lista de Personas Bloqueadas (LPB), para cumplir con los mandatos extraordinarios de la LFPIORPI.

**Why this priority**: Declarar el informe en ceros es una obligación mensual ineludible si no hubo operaciones reportables (omitirlo genera multas graves); y los avisos de 24 horas por LPB son un mandato perentorio de seguridad nacional.

**Independent Test**: Seleccionar un mes sin operaciones que superen el umbral, verificar que el sistema habilita el flujo de "Declarar Informe en Ceros", capturar el folio de acuse emitido por el SAT con su PDF adjunto; asimismo, simular una coincidencia en LPB y constatar que se genera una alerta prioritaria de "Aviso de 24h" con temporizador de horas restantes.

**Acceptance Scenarios**:

1. **Given** un mes calendario donde ninguna escritura superó el umbral de aviso, **When** el usuario abre el tablero `/avisos-sat`, **Then** el sistema muestra la recomendación destacada: "Periodo sin operaciones reportables — Requiere Informe en Ceros ante el SAT".
2. **Given** la presentación del informe en ceros en el portal SPPLD, **When** el usuario pulsa "Registrar Acuse de Informe en Ceros" e ingresa el folio oficial y el PDF emitido por el SAT, **Then** el periodo queda cerrado con estatus "Cumplido en Ceros" en la bitácora inmutable.
3. **Given** una escritura donde un compareciente arrojó coincidencia en Lista de Personas Bloqueadas (LPB), **When** se detecta la coincidencia, **Then** el sistema emite inmediatamente una alerta crítica en el tablero y en la escritura indicando "Aviso de 24 Horas Requerido", calculando el plazo perentorio de 24 horas naturales desde el momento de la confirmación del screening.
4. **Given** un aviso de 24 horas generado, **When** se registra su acuse de presentación ante la UIF/SAT, **Then** la alerta se desactiva y se estampa el sello de tiempo y usuario en la bitácora de auditoría.

---

## Edge Cases

- **Operaciones Acumuladas en 6 Meses**: Si un mismo cliente realiza múltiples operaciones en un lapso de 6 meses que individualmente no superan el umbral de aviso pero cuya suma sí lo excede (Art. 17 regla de acumulación LFPIORPI), el sistema debe alertar la condición de acumulación e invitar a consolidar el aviso.
- **Escrituras Modificadas con Posterioridad al Aviso**: Si una escritura ya cuenta con acuse de presentación ante el SAT y posteriormente se modifica su monto o comparecientes, el sistema debe bloquear la edición directa del aviso original y forzar la creación de un "Aviso Modificatorio / Complementario" vinculando el folio de acuse anterior.
- **Inhábiles y Fines de Semana en Prórroga**: El cálculo de la fecha límite considera días hábiles (lunes a viernes no festivos), de modo que si el día 17 o el último día de prórroga cae en día inhábil, se traslada al siguiente día hábil conforme al CFF.
- **Caída o Inaccesibilidad del Portal SPPLD**: Si el portal del SAT se encuentra fuera de servicio, el sistema permite descargar y conservar el XML/PDF generado y mantener la escritura en estado "Generado — Pendiente de Carga en Portal" sin bloquear la operatividad interna de la notaría.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE calcular automáticamente si una escritura requiere Aviso Ordinario al SAT, cotejando el monto de la operación contra el umbral legal en UMA vigente a la fecha del acto (`uma_historico`), clasificándolo como `exento`, `aviso_ordinario` o `aviso_24h`.
- **FR-002**: El sistema DEBE permitir generar y descargar el archivo XML estructurado conforme al esquema oficial del SAT/UIF para Fedatarios Públicos (FPP), integrando datos del fedatario, instrumento, comparecientes, formas de liquidación y bienes, además de generar y descargar la Cédula de Aviso en PDF para revisión y archivo.
- **FR-003**: El sistema DEBE permitir registrar los datos del acuse oficial emitido por el SAT: folio oficial de recepción/aceptación, fecha y hora de presentación, y adjuntar el archivo PDF del acuse oficial, almacenándolo en el bucket `expedientes`.
- **FR-004**: El sistema DEBE proporcionar la pestaña `AvisosTab.vue` en `app/pages/escrituras/[id].vue` reemplazando el `<PlaceholderTab />` del tab `avisos`.
- **FR-005**: El sistema DEBE implementar el tablero central de cumplimiento en `app/pages/avisos-sat/index.vue` con selector de año/mes, semáforo de cuenta regresiva al día 17 con prórroga por RFC, KPIs de operaciones vulnerables y listado filtrable.
- **FR-006**: El sistema DEBE ofrecer soporte dual para la emisión de avisos: generación individual por escritura desde `AvisosTab.vue` y generación de un paquete mensual consolidado XML desde el tablero `/avisos-sat` con todas las operaciones reportables del periodo.
- **FR-007**: El sistema DEBE permitir el registro y control del "Informe en Ceros" para los meses en que no se hayan celebrado operaciones que superen el umbral de aviso, almacenando el folio de acuse y PDF oficial.
- **FR-008**: El sistema DEBE generar una alerta crítica inmediata de "Aviso de 24 Horas" ante coincidencias confirmadas en Lista de Personas Bloqueadas (LPB) con temporizador ininterrumpido de 24 horas.
- **FR-009**: El sistema DEBE calcular la fecha límite legal inteligente tomando como base el día 17 del mes siguiente a la fecha del acto y sumando los días hábiles de prórroga que correspondan al sexto dígito numérico del RFC de la notaría según la RMF.
- **FR-010**: El sistema DEBE restringir la manipulación de avisos a roles autorizados mediante permisos dinámicos (`avisos_sat.ver`, `avisos_sat.crear`, `avisos_sat.generar_xml`, `avisos_sat.registrar_acuse`).

### Key Entities

- **AvisoSat**: Representa la declaración presentada o por presentar ante el SAT/UIF por una escritura o por el periodo. Atributos: `id`, `escritura_id` (opcional si es informe en ceros), `periodo_mes`, `periodo_anio`, `tipo_aviso` (`ordinario`, `ceros`, `24_horas`, `modificatorio`), `estatus` (`pendiente`, `xml_generado`, `presentado`, `extemporaneo`), `folio_acuse_sat`, `fecha_presentacion_sat`, `archivo_xml_url`, `archivo_acuse_pdf_url`, `monto_operacion_mxn`, `monto_operacion_uma`, `detalles_json`, `notas`, `created_at`, `created_by`.
- **AvisoSatBitacora**: Bitácora inmutable de eventos sobre avisos (generación de XML, emisión de PDF, registro de acuse, sustitución de comprobante, descarga) para trazabilidad legal de 10 años conforme a la LFPIORPI.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El cálculo y dictamen de obligación de aviso SAT para cualquier escritura se evalúa en menos de 100 ms tras consultar la fecha y monto del acto.
- **SC-002**: La generación y descarga del archivo XML estructurado conforme al layout SPPLD toma menos de 1 segundo para una escritura individual, y menos de 3 segundos para el paquete mensual consolidado.
- **SC-003**: La generación de la Cédula de Aviso en PDF toma menos de 1.5 segundos con formato institucional.
- **SC-004**: El tablero `/avisos-sat` permite al Notario o Responsable de Cumplimiento consultar el estado mensual de todas las operaciones y el tiempo restante al vencimiento legal en una sola pantalla sin recargas.
- **SC-005**: Cero operaciones vulnerables que rebasen el umbral de aviso quedan sin trazabilidad de su estatus de presentación en el expediente notarial.
- **SC-006**: 100% de cobertura en pruebas unitarias del motor de evaluación de avisos, generador XML y generador de Cédula PDF con 0 regresiones sobre la suite existente de pruebas del sistema.

---

## Assumptions

- Se asume que el portal SPPLD del SAT no provee una API REST pública para transmisión directa máquina a máquina, por lo que el flujo estándar consiste en la generación del archivo XML desde el sistema, su carga manual por el usuario en el portal web del SAT, y la posterior captura del folio de acuse y carga del PDF emitido.
- Se reutiliza la tabla existente `uma_historico` y la lógica de cálculo de UMAs implementada en `usePldCalculations.ts`.
- Los archivos PDF de acuses oficiales y cédulas se almacenan de forma segura en el bucket `expedientes` de Supabase Storage con control de acceso RLS.
- El sexto dígito del RFC para el cálculo de prórroga se obtiene de los datos configurados de la notaría o del perfil del Notario Titular.
