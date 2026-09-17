# Feature Specification: 07-tramites (Trámites Notariales, Fases Procesales y Dependencias RPP/Catastro)

**Feature Branch**: `07-tramites`

**Created**: 2026-09-16

**Status**: Ready for Planning

**Input**: User description: "Implementar el módulo de Trámites Notariales conforme a la Constitución del sistema (§3, §4, §7, §8). Incluye catálogo de dependencias oficiales (RPP/RPC, Catastro, SACMEX, Tesorería, SAT, Secretaría de Economía, Archivo General de Notarías), fases procesales (previo, firma/otorgamiento, posterior/fiscal, inscripción registral y entrega), máquina de estados del trámite (solicitado, en proceso, ingresado con volante/folio, prevenido/observado, subsanado, concluido y cancelado), cálculo dinámico de plazos y semáforo de vencimiento en días hábiles, registro y resolución de notas de prevención registral, enlace con órdenes de pago de derechos, bloqueo estricto de protocolización ante trámites previos pendientes, y tablero de control consolidado para gestores y Notario."

---

## Clarifications

### Session 2026-09-16

- Q: ¿Cómo deben originarse los trámites notariales de una escritura? → A: **Generación por plantilla de acto jurídico + Alta manual asistida**. Para los actos jurídicos que por su naturaleza generan gestiones externas (e.g. *Compraventa*, *Donación*, *Sociedades*, *Créditos*), el sistema genera automáticamente la plantilla de trámites base en estatus `solicitado` (o permite instanciarla con 1 clic); para actos que no requieren trámites previos obligatorios (e.g. *Testamentos*, *Fe de hechos*, *Certificaciones*), no se crean trámites por omisión, permitiendo al gestor agregar trámites específicos libremente.
- Q: ¿Cómo debe relacionarse el trámite ante la dependencia con el pago de derechos oficiales (derechos a terceros: RPP, Catastro, ISABI)? → A: **Opción A - Campo de enlace `orden_pago_id` opcional con indicador de estatus financiero**. La ficha del trámite permite asociar la orden de pago de derechos oficiales correspondiente, exhibiendo un chip de estatus (*"Derechos Pagados"* vs *"Pendiente de Pago"*), preparando la integración natural y sin fricción con el módulo 08 de Órdenes de Pago.
- Q: ¿Debe la existencia de trámites previos pendientes condicionar o bloquear la protocolización de la escritura? → A: **Opción B - Bloqueo estricto ante trámites previos pendientes; pase libre si no tiene trámites**. Si la escritura tiene registrados trámites previos a la firma (`fase = 'previo'`) que permanezcan pendientes, en proceso o prevenidos (`estado <> 'concluido_favorable'` y `estado <> 'rechazado_cancelado'`), la función `fn_validar_protocolizacion` bloquea estrictamente la transición de la escritura a estado `firmada` o `protocolizada`. Por el contrario, si la escritura no tiene registrado ningún trámite previo (porque el acto notarial no los genera) o todos los trámites previos están debidamente concluidos, la protocolización procede sin bloqueo.
- Q: ¿Cómo deben estructurarse en la base de datos y en la interfaz de la notaría los 17 pasos y las dependencias solicitadas (`Catastro Estatal`, `Catastro Municipal`, `Registro Público`, `Infonavit`, `Control Interno`, `Notaría`)? → A: **Opción A - Pipeline secuencial de gestoría + Catálogo administrable de dependencias y pasos**. Se crea el seeder con las dependencias base (`0: Notaría/Interno`, `1: Catastro Estatal`, `2: Catastro Municipal`, `3: Registro Público`, `4: Control Interno`, más `INFONAVIT`) y la tabla `cat_pasos_tramite` con los 17 pasos en orden. Los pasos de "O.P." habilitan el registro de órdenes de pago, y se crea la sección en Administración General para configurar/reordenar pasos y dependencias.
- Q: ¿Cómo debe registrarse la dependencia `INFONAVIT` en el catálogo y a qué entidad corresponde el identificador 4 asignado a los pasos 12 y 13 (`SALIDA DE R.P.P` y `1ER TEST AL CLIENTE`)? → A: **INFONAVIT en catálogo general de dependencias + Grupo 4 como Control Interno**. Se registra `INFONAVIT` en el catálogo maestro de dependencias y el grupo 4 se denomina `Control Interno`. El paso de `1ER TEST AL CLIENTE` refleja que la escritura ya se protocolizó y se le entregó su primer testimonio al cliente (cierre del expediente).
- Q: ¿Cómo debe estructurarse visualmente la tarjeta por dependencia de gobierno y el despliegue de su historial? → A: **Layout a dos columnas en cada tarjeta**: En la columna izquierda se ubica el nombre de la dependencia y su estado/último paso alcanzado, y en la columna derecha se ubican los botones de acción para agregar nuevos pasos y desplegar el historial completo de eventos.
- Q: Al hacer clic en el botón de agregar pasos de una tarjeta, ¿las opciones de pasos disponibles deben limitarse a los pasos de esa dependencia o mostrar el catálogo completo? → A: **Opción A - Filtradas por la dependencia**: El selector o menú desplegable muestra exclusivamente los pasos configurados para esa dependencia gubernamental en el catálogo maestro, garantizando orden y evitando errores de captura cruzada.
- Q: Al hacer clic en el botón "Historial Completo" de la tarjeta, ¿cómo debe desplegarse la línea de tiempo de los pasos históricos? → A: **Opción A - Acordeón expandible en la misma tarjeta**: La tarjeta se expande verticalmente hacia abajo revelando la cronología de pasos registrados con fechas, usuario responsable, folios y chips de O.P., permitiendo consultar y contrastar varias dependencias simultáneamente.
- Q: ¿Qué tarjetas de dependencias de gobierno deben mostrarse en la pestaña de trámites de la escritura? → A: **Opción B - Solo dependencias con historial activo + botón "+ Iniciar Gestión / Agregar Dependencia"**: La vista despliega únicamente las tarjetas de las dependencias que ya cuentan con al menos un paso registrado en esa escritura, manteniendo la interfaz limpia y concisa. Un botón superior "+ Iniciar Gestión en Dependencia" permite seleccionar cualquier dependencia del catálogo para incorporar su tarjeta y registrar el primer paso.
- Q: Al seleccionar un paso para agregarlo al historial de la dependencia, ¿cómo debe confirmarse y capturarse la información del evento? → A: **Opción A - Modal breve de confirmación y notas**: Al seleccionar el paso en el menú, se abre un diálogo compacto donde se precarga la fecha actual y se permite registrar opcionalmente notas explicativas (e.g. causas del rechazo o requisitos faltantes) y folio oficial, vinculando a la creación de Orden de Pago si el paso lo amerita.

---

## User Scenarios & Testing

### User Story 1 - Gestión del Ciclo de Vida de Trámites por Escritura (Priority: P1) 🎯 MVP

Como abogado o gestor notarial, quiero registrar y dar seguimiento a los trámites oficiales de una escritura organizados por fase procesal (previos a la firma, posteriores y de inscripción definitiva), capturando el número de volante/folio de la dependencia y actualizando su avance, para asegurar que todas las gestiones legales ante autoridades se concluyan oportunamente.

**Why this priority**: Todo acto notarial requiere gestiones ante dependencias públicas para adquirir plena eficacia frente a terceros. Sin un control de trámites por escritura, el personal pierde la trazabilidad de volantes y comprobantes oficiales.

**Independent Test**: Abrir la pestaña "Trámites" de una escritura, registrar un nuevo trámite ante el RPP (e.g. "Certificado de Libertad de Gravámenes con 1er Aviso Preventivo"), capturar el número de entrada/volante, cambiar su estado a "Ingresado" y verificar que se refleja en la línea de tiempo de la escritura.

**Acceptance Scenarios**:
1. **Given** una escritura en cualquier etapa, **When** el usuario ingresa a la pestaña "Trámites", **Then** el sistema presenta el listado de trámites clasificados por fase procesal (`previo`, `firma_otorgamiento`, `posterior_fiscal`, `inscripcion_definitiva`, `entrega_cliente`).
2. **Given** una escritura recién creada de un acto que requiere trámites (e.g. Compraventa), **When** se consulta la pestaña de trámites, **Then** el sistema presenta los trámites previos generados por plantilla en estado `solicitado`, permitiendo asignar gestor y capturar volante de ingreso.
3. **Given** un trámite en curso, **When** el gestor actualiza su estado (e.g. de `en_proceso` a `ingresado_dependencia` o `concluido_favorable`), **Then** el sistema guarda la transición con sello de usuario y fecha inmutable en la bitácora de auditoría.
4. **Given** un trámite concluido favorablemente, **When** el usuario adjunta el documento probatorio (e.g. Boleta de Inscripción con Folio Real), **Then** el trámite se marca en verde con enlace directo al visor del documento.

---

### User Story 2 - Control de Dependencias, Plazos de Respuesta y Semáforo de Vencimiento (Priority: P2)

Como Notario Titular o coordinador de gestoría, quiero que el sistema calcule automáticamente los días hábiles transcurridos y el semáforo de tiempo de respuesta para cada trámite ingresado ante una dependencia oficial, emitiendo alertas preventivas antes de que se venzan los términos legales.

**Why this priority**: Las dependencias registrales y catastrales operan bajo términos legales estrictos. Los avisos preventivos del RPP caducan y las demoras en inscripciones causan quejas graves de clientes e instituciones bancarias acreedoras.

**Independent Test**: Registrar un trámite con fecha de ingreso y plazo compromiso de 10 días hábiles; verificar que el sistema calcula la fecha estimada de respuesta y asigna el color de semáforo correspondiente (verde si restan más de 3 días, amarillo si restan 1-3 días, rojo si está vencido).

**Acceptance Scenarios**:
1. **Given** un catálogo configurable de dependencias con sus tiempos típicos de respuesta en días hábiles (e.g. RPP: 15 días; SACMEX: 10 días; Avalúo: 7 días), **When** se registra el ingreso de un trámite, **Then** el sistema calcula automáticamente la fecha compromiso de resolución excluyendo fines de semana.
2. **Given** un trámite activo con fecha compromiso, **When** la fecha actual se aproxima al vencimiento (<= 3 días hábiles), **Then** el semáforo cambia a amarillo con chip de advertencia "Próximo a Vencer".
3. **Given** un trámite que supera la fecha compromiso sin resolución, **When** se evalúa su estado, **Then** el semáforo cambia a rojo con alerta de "Término Excedido", permitiendo filtrar todos los trámites rezagados de la notaría.
4. **Given** la ficha del trámite, **When** existe una orden de pago de derechos vinculada (`orden_pago_id`), **Then** la interfaz exhibe el indicador de estatus financiero del derecho a terceros (*"Pagado"* o *"Pendiente de Pago"*).

---

### User Story 3 - Gestión de Prevenciones Registrales y Gate de Protocolización (Priority: P3)

Como abogado responsable de la escritura y Notario Titular, quiero gestionar las notas de prevención o suspensión de la autoridad registral con plazos de subsanación y garantizar que ninguna escritura con trámites previos pendientes pueda ser protocolizada.

**Why this priority**: Es la garantía de seguridad jurídica: autorizar una escritura sin que el Certificado de Libertad de Gravámenes o los permisos previos hayan salido favorables vulnera la fe pública notarial y puede generar duplicidad de gravámenes.

**Independent Test**: Intentar protocolizar una escritura con un trámite previo en estado `en_proceso` o `prevenido_observado`; comprobar que `fn_validar_protocolizacion` rechaza la acción. Posteriormente concluir el trámite favorablemente y comprobar que la protocolización se desbloquea.

**Acceptance Scenarios**:
1. **Given** una escritura con trámites en fase `previo` que no estén en `concluido_favorable` ni `rechazado_cancelado`, **When** se invoca `fn_validar_protocolizacion`, **Then** la función bloquea el cambio a `protocolizada` e informa explícitamente cuáles trámites previos están pendientes.
2. **Given** una escritura que no tiene ningún trámite previo registrado (e.g. Testamento o Fe de hechos que no generan trámites), **When** se valida la protocolización, **Then** el gate de trámites no genera ningún bloqueo.
3. **Given** una nota de prevención emitida por el registrador de la propiedad, **When** el usuario registra la prevención (`prevenido_observado`), **Then** el sistema captura las causas, el registrador y la fecha perentoria para subsanar, destacando la alerta en ámbar en la escritura.
4. **Given** un escrito de subsanación elaborado por el abogado, **When** se captura el reingreso con nuevo folio, **Then** el estado pasa a `subsanado` preservando el historial completo de la incidencia.

---

### User Story 4 - Tablero Global de Trámites Notariales para Gestores y Notario (Priority: P4)

Como gestor notarial o Notario Titular, quiero un tablero consolidado en `/tramites` con vista de tabla y tarjetas con filtros por dependencia, fase, gestor asignado y semáforo de vencimiento, para supervisar en un solo lugar todas las gestiones externas de la notaría.

**Why this priority**: Evita que los gestores tengan que entrar escritura por escritura para revisar sus pendientes diarios en calle o en ventanillas de RPP/Catastro, optimizando la ruta y el despacho de documentos.

**Independent Test**: Acceder a `/tramites`, filtrar por gestor asignado y dependencia "RPP", y comprobar que el tablero muestra los trámites agrupados con sus folios y semáforos, permitiendo actualizar el estado con un clic.

**Acceptance Scenarios**:
1. **Given** un usuario autenticado con permiso de gestión de trámites, **When** navega a `/tramites`, **Then** el sistema despliega el tablero general con contadores de trámites en proceso, ingresados, prevenidos y concluidos.
2. **Given** el tablero global, **When** el usuario filtra por dependencia, responsable o semáforo (e.g. solo trámites vencidos), **Then** la vista actualiza reactivamente los resultados.
3. **Given** un trámite listado en el tablero, **When** el usuario hace clic en el número de instrumento, **Then** navega directamente a la pestaña de trámites de la escritura correspondiente.
4. **Given** la necesidad de reporte operativo, **When** el usuario presiona "Exportar Relación", **Then** el sistema genera una hoja o listado de volantes para entrega en ventanilla de dependencias.

---

### User Story 5 - Tarjetas por Dependencia con Historial Cronológico y Catálogo Administrable (Priority: P2)

Como gestor notarial y abogado, quiero que en la pestaña de trámites de la escritura se presenten tarjetas estructuradas por dependencia gubernamental a dos columnas (izquierda: datos de dependencia y último paso actual; derecha: botones para agregar pasos e historial completo), permitiendo registrar la cronología histórica repetible de incidencias de ventanilla (e.g. ingreso -> rechazo -> reingreso -> O.P. -> cédula), desplegar el historial mediante un acordeón expandible inline en la misma tarjeta, e incorporar nuevas dependencias bajo demanda mediante el botón "+ Iniciar Gestión en Dependencia".

**Why this priority**: Refleja la realidad operativa de ventanilla notarial donde un trámite no es una casilla lineal fija, sino una sucesión cronológica de eventos (ingresos, notas de rechazo, liquidación de derechos y entrega final) específica para cada dependencia.

**Independent Test**: En la escritura, abrir la pestaña de trámites; observar las tarjetas de dependencias activas con su último paso alcanzado; pulsar "+ Iniciar Gestión en Dependencia" y seleccionar "Catastro Estatal"; agregar un paso de ingreso con notas; agregar luego un rechazo; pulsar "Historial Completo" y verificar que el acordeón inline despliega cronológicamente ambos pasos.

**Acceptance Scenarios**:
1. **Given** una escritura con gestiones iniciadas, **When** el gestor consulta la sección de dependencias, **Then** visualiza tarjetas a dos columnas para cada autoridad con actividad: columna izquierda con nombre de dependencia y último paso alcanzado con fecha/estado; columna derecha con botón para agregar paso y botón para desplegar historial.
2. **Given** una tarjeta de dependencia, **When** el gestor pulsa "Agregar Paso", **Then** el menú despliega exclusivamente los pasos asociados a esa dependencia en el catálogo maestro.
3. **Given** un paso seleccionado (e.g. `RECHAZO CAT. EST.`), **When** se confirma, **Then** un modal breve permite capturar opcionalmente el folio de volante/ticket, la fecha y las causas/notas de la prevención.
4. **Given** un paso de orden de pago (e.g. `O.P. CAT. EST.`, `ORD. DE PAG. R.P.P.`), **When** se registra, **Then** enlaza directamente con el modal de captura de Orden de Pago y asienta el chip de folio y monto en la tarjeta e historial.
5. **Given** el botón "Historial Completo", **When** el usuario lo presiona, **Then** la tarjeta se expande verticalmente mediante un acordeón inline mostrando la línea de tiempo completa de todos los eventos históricos registrados.
6. **Given** una dependencia que aún no ha sido iniciada para la escritura, **When** el usuario presiona "+ Iniciar Gestión en Dependencia", **Then** puede seleccionarla del catálogo e incorporar de inmediato su tarjeta con su primer paso registrado.
7. **Given** el administrador notarial, **When** ingresa a Administración General (`/administracion-general/tramites-pasos`), **Then** puede configurar, agregar, reordenar y activar/desactivar pasos y dependencias.

---

- **Múltiples Trámites ante una Misma Dependencia**: Una escritura puede requerir más de una gestión en la misma dependencia en momentos distintos (e.g. en RPP: 1er Certificado de Gravámenes, 2do Aviso Preventivo y Testimonio Definitivo); cada uno debe tener su propio folio, plazo y ciclo de vida independiente.
- **Cancelación o Desistimiento de Trámite**: Si un trámite no se concluye por desistimiento del cliente o error de ventanilla, debe permitirse cancelarlo registrando el motivo obligatorio sin borrar el registro histórico.
- **Trámites Foráneos (Otras Entidades Federativas)**: Inmuebles ubicados en el interior de la República exigen plazos registrales más amplios y gestores corresponsales; el sistema permite personalizar el plazo compromiso por trámite.
- **Dependencias sin Término Fijo**: En trámites internos o gestiones judiciales sin plazo estricto, el cálculo de semáforo opera de forma opcional o en modo informativo.

---

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE mantener un catálogo de dependencias oficiales (`cat_dependencias_oficiales`) con nombre, clave numérica, sigla oficial (NOTARIA, CATASTRO_EST, CATASTRO_MUN, RPP, CONTROL_INT, INFONAVIT), y tiempo de respuesta compromiso en días hábiles.
- **FR-002**: El sistema DEBE mantener un catálogo de tipos de trámites notariales (`cat_tipos_tramite_notarial`) asociado a cada dependencia, especificando la fase procesal por omisión (`previo`, `firma_otorgamiento`, `posterior_fiscal`, `inscripcion_definitiva`, `entrega_cliente`).
- **FR-003**: El sistema DEBE permitir registrar y gestionar trámites asociados a una escritura (`tramites_escritura`), almacenando:
  - `escritura_id`: referencia a la escritura pública.
  - `tipo_tramite_id`: referencia al catálogo de trámites.
  - `dependencia_id`: referencia a la dependencia oficial.
  - `fase`: fase procesal del trámite.
  - `estado`: `solicitado`, `en_proceso`, `ingresado_dependencia`, `prevenido_observado`, `subsanado`, `concluido_favorable`, `rechazado_cancelado`.
  - `folio_dependencia`: número de entrada, volante o folio oficial.
  - `responsable_id`: usuario gestor o abogado asignado.
  - `fecha_solicitud`, `fecha_ingreso`, `fecha_limite_estimada`, `fecha_conclusion`.
  - `orden_pago_id`: enlace opcional al módulo de órdenes de pago de derechos.
  - `documento_resultado_id`: enlace opcional al archivo del expediente resultante.
  - `observaciones`: texto descriptivo.
- **FR-004**: El sistema DEBE proveer la generación asistida o por plantilla de trámites sugeridos para los actos jurídicos que lo requieran (e.g. *Compraventa*, *Donación*, *Sociedades*, *Créditos*), omitiéndola para actos que no generen trámites por omisión.
- **FR-005**: El sistema DEBE calcular automáticamente la fecha estimada de resolución sumando los días hábiles compromiso de la dependencia a partir de la fecha de ingreso, excluyendo fines de semana.
- **FR-006**: El sistema DEBE asignar un semáforo dinámico a cada trámite en curso:
  - `verde`: Restan más de 3 días hábiles para el vencimiento.
  - `amarillo`: Restan entre 1 y 3 días hábiles.
  - `rojo`: La fecha actual es posterior a la fecha límite estimada.
  - `azul / gris`: Concluido o cancelado.
- **FR-007**: El sistema DEBE permitir asentar notas de prevención registral (`tramite_prevenciones`), capturando motivo, registrador, fecha límite legal de subsanación, fecha de reingreso y volante de reingreso.
- **FR-008**: La función de validación de protocolización (`fn_validar_protocolizacion`) DEBE evaluar:
  - Si la escritura tiene registrados trámites en fase `previo` con estado distinto de `concluido_favorable` o `rechazado_cancelado`, la protocolización queda ESTRICTAMENTE BLOQUEADA.
  - Si la escritura no tiene ningún trámite previo registrado o todos están concluidos, no se genera bloqueo por trámites.
- **FR-009**: El sistema DEBE proveer la vista consolidada en `/tramites` con filtros multicriterio (dependencia, estado, responsable, semáforo, rango de fechas).
- **FR-010**: El sistema DEBE integrar la pestaña `Trámites` en el detalle de la escritura (`app/components/escrituras/tabs/TramitesTab.vue`), sustituyendo el `PlaceholderTab` actual.
- **FR-011**: El seeder inicial de la base de datos DEBE incluir las dependencias predeterminadas con sus claves: `0: Notaría / Interno`, `1: Catastro Estatal`, `2: Catastro Municipal`, `3: Registro Público`, `4: Control Interno` e `INFONAVIT`.
- **FR-012**: El seeder inicial DEBE insertar los 17 pasos predeterminados en la tabla `cat_pasos_tramite` con su identificador, nombre, orden secuencial, dependencia asociada y bandera si genera orden de pago de derechos (`genera_orden_pago`):
  1. `CAPTURA` (orden 1, dep: 0)
  2. `ING. CAT. EST.` (orden 2, dep: 1)
  3. `RECHAZO CAT. EST.` (orden 3, dep: 1)
  4. `O.P. CAT. EST.` (orden 4, dep: 1, genera_orden_pago = true)
  5. `CORREGIR CED. EST.` (orden 5, dep: 1)
  6. `CEDULA CAT. EST.` (orden 6, dep: 1)
  7. `ING. TRAM. MUN.` (orden 7, dep: 2)
  8. `RECHAZO MUNICIPAL` (orden 8, dep: 2)
  9. `O.P. MUNICIPAL` (orden 9, dep: 2, genera_orden_pago = true)
  10. `PAGO T.D.` (orden 10, dep: 0)
  11. `P.T. FIRMADO Y SELLADO` (orden 11, dep: 0)
  12. `ORD. DE PAG. R.P.P.` (orden 12, dep: 3, genera_orden_pago = true)
  13. `INGRESO A R.P.P.` (orden 13, dep: 3)
  14. `RECHAZO R.P.P.` (orden 14, dep: 3)
  15. `REINGRESO A R.P.P` (orden 15, dep: 3)
  16. `SALIDA DE R.P.P` (orden 16, dep: 4)
  17. `1ER TEST AL CLIENTE` (orden 17, dep: 4, entrega formal del primer testimonio al cliente)
- **FR-013**: El sistema DEBE presentar las gestiones en la pestaña de trámites de la escritura mediante tarjetas estructuradas por dependencia gubernamental a dos columnas (columna izquierda: nombre de la dependencia y último paso actual; columna derecha: botones de acción para agregar pasos y desplegar el historial). Solo se muestran tarjetas de dependencias que tengan al menos un paso registrado en la escritura, proveyendo un botón superior "+ Iniciar Gestión en Dependencia" para incorporar nuevas autoridades bajo demanda.
- **FR-014**: Al presionar "Agregar Paso", el sistema DEBE desplegar un menú filtrado exclusivamente con los pasos pertenecientes a esa dependencia en el catálogo maestro. Al seleccionar uno, DEBE abrir un modal breve de confirmación para capturar opcionalmente la fecha del evento, el folio de volante/rechazo y observaciones, enlazando directamente al modal de creación de Orden de Pago si el paso tiene habilitada la bandera `genera_orden_pago`.
- **FR-015**: La tarjeta de dependencia DEBE incluir un botón "Historial Completo" que despliegue mediante un acordeón inline en la misma tarjeta la bitácora cronológica de todos los pasos ocurridos en esa ventanilla (con fechas, folios, notas, responsable y chips de O.P.), admitiendo pasos repetibles en el tiempo (e.g. múltiples ingresos y rechazos sucesivos).
- **FR-016**: El sistema DEBE proveer en el módulo de Administración General (`/administracion-general/tramites-pasos`) una interfaz para que el administrador pueda crear, editar, alterar el orden secuencial y activar/desactivar pasos y dependencias del catálogo.

### Key Entities

- **DependenciaOficial (`cat_dependencias_oficiales`)**: Instituciones y oficinas gubernamentales ante las que se gestiona la fe notarial (incluye Catastro Estatal, Catastro Municipal, Registro Público, Control Interno e Infonavit).
- **PasoTramite (`cat_pasos_tramite`)**: Pasos predeterminados y configurables del catálogo maestro con orden, dependencia asignada y vinculación financiera a órdenes de pago.
- **HistorialPasoEscritura (`tramite_pasos_escritura`)**: Evento cronológico de la bitácora de pasos por escritura y dependencia (escritura_id, paso_id, dependencia_clave, fecha, usuario responsable, folio_volante, notas, orden_pago_id). Admite múltiples eventos sucesivos del mismo paso en el tiempo.
- **TipoTramiteNotarial (`cat_tipos_tramite_notarial`)**: Catálogo maestro de gestiones (CLG, Aviso Preventivo, No Adeudo de Agua, Certificación Catastral, Pago ISABI, Inscripción de Escritura, etc.).
- **TramiteEscritura (`tramites_escritura`)**: Instancia de trámite asociada a un instrumento notarial con trazabilidad de folios, fechas y estados.
- **TramitePrevencion (`tramite_prevenciones`)**: Incidencias registrales, observaciones y subsanaciones de trámites.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: El personal notarial puede registrar el ingreso de un trámite con su folio oficial en menos de 10 segundos desde la pestaña Trámites.
- **SC-002**: 100% de los trámites con fecha de ingreso calculan automáticamente su fecha límite y semáforo de vencimiento en días hábiles.
- **SC-003**: 100% de las escrituras con trámites previos pendientes quedan bloqueadas en el gate de protocolización, garantizando que ninguna compraventa o hipoteca sea firmada con gravámenes no resueltos.
- **SC-004**: El tablero global `/tramites` carga y filtra cientos de trámites en menos de 200 ms.
- **SC-005**: Mantenimiento de la suite de pruebas unitarias existente con 100% de tests pasando y cero regresiones.

---

## Assumptions

- El calendario del sistema maneja días hábiles de lunes a viernes en el cálculo básico de términos.
- Los documentos emitidos por las dependencias (boletas de inscripción, certificados de gravámenes) se custodian en el bucket de Storage `expedientes` vinculados al trámite correspondiente.
- Las órdenes de pago de derechos se modelarán en el módulo 08, enlazándose mediante la columna referencial `orden_pago_id`.
