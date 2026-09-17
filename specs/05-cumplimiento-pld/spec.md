# Feature Specification: 05-cumplimiento-pld (Cumplimiento PLD / UIF y Prevención de Lavado de Dinero)

**Feature Branch**: `05-cumplimiento-pld`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "Implementar el módulo de Cumplimiento PLD / UIF conforme al Art. 17 LFPIORPI y la Constitución del sistema (§5). Incluye screening de comparecientes contra listas de restricción (LPB, OFAC, ONU, SAT 69-B, PEP), gestión manual de evidencias (capturas y sellado de tiempo), cálculo dinámico de umbrales en UMA (identificación y aviso según fecha del acto y monto de operación), tratamiento diferenciado para PEPs (diligencia reforzada) y bloqueo estricto de protocolización ante coincidencias no resueltas o falta de verificación."

---

## Clarifications

### Session 2026-09-15

- Q: ¿Cómo debe comportarse el sistema si un compareciente vinculado a una nueva escritura ya fue consultado en las listas de restricción (LPB, OFAC, ONU, SAT 69-B) en otra escritura dentro de los últimos 90 días? → A: Opción B - Importación asistida a petición del usuario. El sistema detecta automáticamente si existe un screening previo vigente (< 90 días naturales) para el compareciente en la notaría y muestra una alerta informativa con la opción "Importar dictamen vigente (hace X días)". Al confirmar el usuario deliberadamente, se vinculan las evidencias documentales y dictámenes a la nueva escritura conservando la fecha original del cotejo, sin obligar a recapturar evidencias manualmente.
- Q: ¿Debe este módulo de Cumplimiento PLD incluir el control y validación de los topes de liquidación en efectivo conforme al Art. 32 de la LFPIORPI (prohibición de efectivo que exceda 8,025 UMA en inmuebles o 3,210 UMA en actos societarios/poderes)? → A: Opción A - Incluir control de efectivo en PLD. La evaluación de PLD en la escritura debe capturar el monto liquidado en efectivo y contrastarlo contra el límite legal en UMA vigente a la fecha del acto (e.g., 8,025 UMA para inmuebles; 3,210 UMA para actos corporativos o poderes); si el monto en efectivo rebasa dicho tope, el sistema emite alerta crítica en semáforo rojo y bloquea estrictamente la protocolización conforme al Art. 32 de la LFPIORPI.
- Q: ¿Qué mecanismo de autorización debe exigirse para que el Notario Titular o Administrador apruebe la excepción de Debida Diligencia Reforzada ante un compareciente clasificado como PEP (o PEP asimilado)? → A: Opción A - Confirmación en modal con validación estricta de rol RBAC y sellado de auditoría inmutable. El Notario Titular o Administrador revisa la declaración de origen de fondos y el expediente del PEP en un modal dedicado y autoriza la excepción mediante confirmación explícita; el sistema valida permisos en backend (`notario_titular` o `administrador`) y estampa el identificador del autorizante, notas justificativas y marca de tiempo inmutable.
- Q: ¿Qué requisitos y evidencias debe exigir el sistema para permitir el descarte de una coincidencia en listas de restricción como falso positivo u homonimia? → A: Opción A - Motivación analítica escrita y documento probatorio obligatorio. Para asentar el dictamen de "falso positivo / homónimo descartado", el sistema exige obligatoriamente capturar la justificación analítica fundamentando las discrepancias (e.g., diferencia en CURP, RFC, fecha de nacimiento o nacionalidad) y adjuntar el archivo soporte documental oficial (constancia de situación fiscal, identificación oficial o reporte de contraste), registrando autoría y fecha del descarte en la bitácora inmutable.
- Q: ¿Cómo opera el screening de listas y el gate de protocolización para escrituras cuyos actos jurídicos NO están catalogados como actividad vulnerable bajo el Art. 17 LFPIORPI (e.g., poderes notariales, testamentos, protocolizaciones de actas o cancelaciones no vulnerables)? → A: Opción A - Screening universal obligatorio contra listas negras; omisión de umbrales económicos y avisos SAT. Ninguna escritura de la notaría puede autorizarse para protocolización si algún compareciente no cuenta con screening de listas verificado o presenta un bloqueo activo, garantizando la fe pública notarial; sin embargo, en escrituras con actos jurídicos no vulnerables (`es_actividad_vulnerable = false`), la pestaña de PLD omite las validaciones de umbrales en UMA, avisos SAT y límites de efectivo.

---

## User Scenarios & Testing

### User Story 1 - Screening y Cotejo de Comparecientes contra Listas Negras (Priority: P1) 🎯 MVP

Como oficial de cumplimiento o auxiliar notarial, quiero realizar el cotejo de cada compareciente vinculado a una escritura contra las listas oficiales de restricción (LPB UIF/SHCP, OFAC, ONU, SAT 69-B) y registrar los dictámenes con evidencia documental obligatoria, para asegurar que la notaría no celebre actos con personas impedidas legalmente.

**Why this priority**: Es el mandato legal más estricto de la LFPIORPI. Un match no atendido en Lista de Personas Bloqueadas (LPB) compromete la responsabilidad penal y la patente del Notario Público. Sin este screening no puede autorizarse legalmente ninguna escritura.

**Independent Test**: Vincular un compareciente a una escritura, abrir su checklist de listas oficiales con enlaces directos a los portales públicos, cargar capturas de pantalla como evidencia de no localización en cada lista, sellar el dictamen "Limpio" y comprobar que el estado de cumplimiento del compareciente cambia a "Verificado".

**Acceptance Scenarios**:
1. **Given** un compareciente vinculado a una escritura en borrador, **When** el usuario abre la sección de PLD, **Then** el sistema presenta un checklist con las 4 listas obligatorias (LPB UIF, OFAC SDN, ONU Consolidada, SAT 69-B EFOS) con enlaces directos a sus portales oficiales de consulta.
2. **Given** una consulta realizada en portal externo, **When** el usuario captura el resultado para una lista específica, **Then** el sistema exige adjuntar obligatoriamente una imagen/captura de pantalla como comprobante y registra automáticamente el usuario, fecha y hora exacta del cotejo.
3. **Given** un compareciente con resultado "Coincidencia Confirmada" en Lista de Personas Bloqueadas (LPB) o SAT 69-B definitivo, **When** se guarda el dictamen, **Then** el sistema marca al compareciente con "Bloqueo Activo", coloca la escritura en semáforo rojo, genera una bandera de "Aviso de 24 horas requerido" e inhabilita inmediatamente la opción de protocolizar.
4. **Given** una coincidencia homónima que resulta ser un homónimo no coincidente, **When** el oficial de cumplimiento documenta el descarte ("Falso Positivo") redactando la justificación analítica y adjuntando obligatoriamente el documento soporte oficial de contraste (constancia fiscal, CURP o identificación), **Then** el bloqueo se levanta y queda registrado en la bitácora de auditoría con sello de autoría.
5. **Given** un compareciente vinculado que ya cuenta con un screening completo y limpio realizado en otra escritura en los últimos 90 días, **When** el usuario ingresa a su sección de PLD, **Then** el sistema muestra el aviso de screening previo disponible y permite importar con un clic dicho dictamen y evidencias a la escritura actual.

---

### User Story 2 - Evaluación de Umbrales en UMA y Calificación del Acto Vulnerable (Priority: P2)

Como abogado responsable de la escritura, quiero que el sistema calcule automáticamente si la operación rebasa los umbrales de identificación y aviso de la LFPIORPI en función del monto celebrado y el valor histórico de la UMA, para determinar con certeza las obligaciones fiscales y documentales del instrumento.

**Why this priority**: El cálculo manual de UMAs suele inducir a errores por cambio de año o por no cotejar la fecha exacta del acto. La calificación automatizada evita multas graves del SAT por avisos omitidos o extemporáneos.

**Independent Test**: Crear una escritura de Compraventa con un monto de operación determinado y fecha de celebración específica; el sistema debe consultar la UMA vigente a esa fecha, calcular el equivalente en UMAs y clasificar si la escritura es "Exenta de aviso", "Sujeta a identificación" o "Sujeta a aviso mensual SAT/UIF".

**Acceptance Scenarios**:
1. **Given** una escritura con acto jurídico clasificado como actividad vulnerable (`es_actividad_vulnerable = true`) y con fecha de celebración capturada, **When** se guarda o actualiza el monto de operación, **Then** el sistema consulta la tabla histórica de UMA para esa fecha y calcula el número de veces UMA de la transacción.
2. **Given** una Compraventa inmueble (umbral de identificación > 8,025 UMA; umbral de aviso > 16,050 UMA), **When** el monto supera el umbral de aviso, **Then** la interfaz muestra una alerta informativa en bronce notarial: "Operación sujeta a Aviso Ordinario SAT a más tardar el día 17 del mes siguiente" y marca la escritura como `requiere_aviso_sat = true`.
3. **Given** una escritura con fecha anterior donde la UMA era distinta a la del año en curso, **When** se realiza el cálculo, **Then** el sistema utiliza rigurosamente el valor de la UMA vigente en la fecha del acto, no la UMA del día en que se captura.
4. **Given** una operación vulnerable donde se captura el monto liquidado en efectivo, **When** dicho monto excede el tope legal de efectivo (e.g., > 8,025 UMA en inmuebles o > 3,210 UMA en actos societarios según Art. 32 LFPIORPI), **Then** el sistema marca inmediatamente la evaluación en semáforo rojo por "Prohibición de Efectivo Excedida" y bloquea la protocolización.

---

### User Story 3 - Tratamiento de PEPs y Debida Diligencia Reforzada (Priority: P3)

Como Notario Titular, quiero gestionar las alertas por Personas Políticamente Expuestas (PEP) directas o por asimilación (cónyuges, familiares hasta 2° grado, socios patrimoniales), documentando el origen de los recursos y aprobando expresamente la continuidad del trámite para cumplir con la diligencia reforzada sin frenar innecesariamente las operaciones legítimas.

**Why this priority**: La normativa internacional GAFI y la regulación mexicana no prohíben operar con PEPs, pero exigen una debida diligencia intensificada y aprobación de la alta dirección (Notario Titular).

**Independent Test**: Marcar a un compareciente como PEP en su screening, verificar que la escritura no se bloquea penalmente pero solicita cuestionario de origen de fondos y aprobación del Notario Titular para permitir su protocolización.

**Acceptance Scenarios**:
1. **Given** un compareciente detectado o declarado como PEP (o PEP asimilado), **When** se registra su dictamen, **Then** el sistema le asigna estatus "PEP Detectado — Requiere Diligencia Reforzada".
2. **Given** un compareciente en estado de diligencia reforzada, **When** el abogado integra el cuestionario de procedencia de fondos y el Notario Titular o Administrador confirma la autorización dentro del modal de aprobación, **Then** el sistema valida los privilegios de rol, libera la restricción de protocolización y conserva el expediente de debida diligencia con sello inmutable de auditoría.
3. **Given** un usuario sin rol de Administrador o Notario Titular, **When** intenta aprobar una excepción de PEP, **Then** el sistema deniega la acción por falta de privilegios.

---

### User Story 4 - Gate de Protocolización Definitivo y Pestaña Notarial de Cumplimiento PLD (Priority: P4)

Como usuario del sistema, quiero ver el estatus consolidado de cumplimiento PLD en la pestaña dedicada dentro de la escritura, de modo que la acción de protocolización evalúe en tiempo real las reglas de cumplimiento reales garantizando certeza jurídica antes de autorizar el instrumento.

**Why this priority**: Conecta el módulo de PLD con el flujo central de la Notaría (`Escrituras`), sustituyendo el placeholder temporal por una interfaz compacta, profesional y con retroalimentación instantánea.

**Independent Test**: Abrir la pestaña Cumplimiento PLD de una escritura en borrador, visualizar las tarjetas de semáforo de riesgo por compareciente, resolver los cotejos pendientes y comprobar que el botón "Protocolizar" se habilita únicamente al tener el 100% de requisitos satisfechos.

**Acceptance Scenarios**:
1. **Given** la vista de detalle de una escritura, **When** se selecciona la pestaña "Cumplimiento PLD", **Then** el sistema presenta el semáforo global del instrumento, el desglose de UMA de la operación y la tabla de comparecientes con su estatus de verificación.
2. **Given** una escritura con al menos un compareciente en estado "No verificado" o "Bloqueado", **When** se intenta protocolizar, **Then** la validación del sistema rechaza la transición, retorna el mensaje de bloqueo específico y mantiene inhabilitado el botón "Protocolizar".
3. **Given** una Persona Moral que comparece en una escritura de actividad vulnerable, **When** no tiene registrado ningún beneficiario controlador en su expediente KYC, **Then** el gate de protocolización bloquea el instrumento requiriendo acreditar la estructura de control (Art. 32-B Quáter CFF).
4. **Given** una escritura cuyo acto jurídico no es actividad vulnerable (`es_actividad_vulnerable = false`), **When** se evalúa el cumplimiento PLD, **Then** el sistema exige el 100% de screening limpio de todos sus comparecientes para protocolizar, pero omite el cálculo de umbrales UMA, límites de efectivo y avisos SAT.

---

## Edge Cases

- **Homónimos Perfectos**: Casos donde el nombre coincide con una persona en lista de bloqueo pero difiere en fecha de nacimiento, CURP o RFC. El sistema DEBE exigir asentar la justificación analítica del descarte como "Homónimo Verificado / Falso Positivo" y adjuntar obligatoriamente el documento oficial probatorio de contraste.
- **Vigencia del Screening (Caducidad)**: Si una escritura permanece en borrador durante más de 90 días naturales, el screening de listas caduca automáticamente y requiere actualización para garantizar que ningún otorgante fue incluido en listas en el intermedio.
- **Escrituras sin Monto de Operación**: En actos no cuantificables económicamente (como Poderes o Testamentos), el cálculo de veces UMA no aplica y el sistema lo clasifica como "Sin cuantía / Exento de umbral económico", aplicando únicamente el screening de personas.
- **Operaciones Fraccionadas o Acumuladas**: Cuando un mismo cliente realiza múltiples operaciones en un periodo de 6 meses que en lo individual no rebasan el umbral de aviso pero en su conjunto sí, el sistema debe alertar sobre la posible acumulación de umbral (Art. 17 regla general LFPIORPI).

---

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE mantener un catálogo de listas de restricción obligatorias (`LPB_UIF`, `OFAC_SDN`, `ONU_CONSOLIDADA`, `SAT_69B`, `PEP`), configurable con sus URLs oficiales de consulta.
- **FR-002**: El sistema DEBE registrar individualmente cada consulta de listas realizada para un compareciente en una escritura, almacenando:
  - Lista consultada.
  - Método (`manual` en Fase 1, extensible a `api_proveedor` en Fase 2 per Constitución §5).
  - Resultado: `limpio`, `coincidencia_bloqueante`, `pep`, `falso_positivo`.
  - Archivo de evidencia obligatorio (captura de pantalla o reporte PDF guardado en storage seguro).
  - Para el resultado `falso_positivo`, se DEBE exigir de forma obligatoria tanto la justificación analítica como el archivo documental de contraste (constancia fiscal, CURP o identificación) que demuestre la discrepancia de identidad.
  - Justificación o notas analíticas del oficial de cumplimiento.
  - Sello inmutable de autoría: usuario responsable, fecha y hora exacta.
  - Si existe un screening vigente (< 90 días naturales) realizado al compareciente en otro instrumento dentro de la notaría, el sistema DEBE ofrecer su importación asistida con confirmación deliberada del usuario, preservando las evidencias documentales originales y la trazabilidad de autoría.
- **FR-003**: El sistema DEBE determinar el estatus de cumplimiento PLD consolidado por compareciente en una escritura:
  - `pendiente`: Cuando falta consultar al menos una de las listas obligatorias o la consulta tiene más de 90 días.
  - `verificado`: Todas las listas consultadas limpias o con falsos positivos debidamente descartados.
  - `bloqueado`: Coincidencia confirmada en listas de personas bloqueadas o 69-B.
  - `diligencia_reforzada`: Coincidencia con PEP pendiente de aprobación del Notario Titular.
- **FR-004**: El sistema DEBE calcular automáticamente en tiempo real los umbrales LFPIORPI para cada escritura:
  - Consultando el valor diario de la UMA vigente en la fecha de celebración de la escritura.
  - Dividiendo el monto de operación entre el valor de dicha UMA.
  - Contrastando contra los umbrales configurados para el acto jurídico (umbral de identificación y umbral de aviso en UMA).
  - Evaluando el campo `monto_efectivo` liquidado contra el límite legal de efectivo en UMA del acto (Art. 32 LFPIORPI; e.g. 8,025 UMA en inmuebles, 3,210 UMA en actos societarios o poderes). Si excede dicho límite, se marca `excede_limite_efectivo = true`.
  - Asignando la clasificación de aviso: `exento`, `identificacion_obligatoria`, `aviso_mensual_sat`, `aviso_24h_urgente`.
  - Para escrituras cuyo acto jurídico no esté catalogado como actividad vulnerable (`es_actividad_vulnerable = false`), el cálculo económico se omite y la escritura se clasifica automáticamente como exenta de obligaciones fiscales de aviso SAT, manteniendo únicamente la exigencia del screening universal de listas.
- **FR-005**: El sistema DEBE permitir registrar y gestionar expedientes de Debida Diligencia Reforzada para comparecientes PEP, requiriendo:
  - Declaración del cargo público, periodo y dependencia.
  - Tipo de vínculo si es PEP asimilado (cónyuge, parentesco por consanguinidad/afinidad hasta 2° grado, socio comercial).
  - Cuestionario de procedencia de los fondos involucrados en la operación.
  - Autorización explícita realizada a través de un modal de confirmación con validación de privilegios RBAC (`notario_titular` o `administrador`), registrando autor (`aprobado_por`), fecha/hora y notas de resolución inmutables.
- **FR-006**: La validación de negocio del Gate de Protocolización DEBE sustituir cualquier comprobación condicional temporal por las reglas definitivas, impidiendo la protocolización si:
  - Algún compareciente de la escritura no tiene estatus `verificado`.
  - Existe algún compareciente con bloqueo activo.
  - Existe algún compareciente PEP sin la debida diligencia reforzada aprobada.
  - El monto liquidado en efectivo excede el tope legal en UMA permitido para el acto (Art. 32 LFPIORPI).
  - El acto es traslativo o actividad vulnerable y la compareciente Persona Moral no tiene Beneficiario Controlador acreditado.
- **FR-007**: El sistema DEBE implementar la pestaña notarial de Cumplimiento PLD en el detalle de la escritura con:
  - Banner superior de semáforo general del instrumento (`VERDE - Cumplimiento Satisfecho`, `AMARILLO - Diligencia o Screening Pendiente`, `ROJO - Bloqueo Legal Activo o Exceso de Efectivo`).
  - Tarjeta de análisis de umbral UMA (Valor UMA aplicada, Monto en UMA, Dictamen de Aviso SAT y Control de Límite de Efectivo Art. 32).
  - Tabla de comparecientes vinculados con indicadores de estado de screening por lista y botón de acción para ejecutar cotejo.
  - Modal ergonómico para registrar evidencia y dictamen de cada lista.
- **FR-008**: Todas las evidencias y registros de cumplimiento PLD DEBEN conservarse de manera íntegra e inmutable durante un periodo mínimo de 10 años conforme al Art. 18 Fracc. IV LFPIORPI y Constitución §5.

---

### Key Entities

- **`public.pld_listas_catalogo`**:
  - `id uuid PK`, `codigo text unique`, `nombre text`, `entidad_emisora text`, `url_consulta text`, `es_bloqueante boolean`, `activo boolean`.
- **`public.pld_consultas`**:
  - `id uuid PK`, `escritura_id uuid FK -> escrituras(id)`, `compareciente_id uuid FK -> comparecientes(id)`, `lista_id uuid FK -> pld_listas_catalogo(id)`.
  - `metodo text ('manual', 'api_proveedor') default 'manual'`.
  - `resultado text ('limpio', 'coincidencia_bloqueante', 'pep', 'falso_positivo')`.
  - `evidencia_documento_id uuid FK -> expediente_documentos(id)`.
  - `notas text`, `created_at timestamptz`, `created_by uuid references auth.users(id)`.
- **`public.pld_evaluaciones_escritura`**:
  - `escritura_id uuid PK FK -> escrituras(id)`.
  - `uma_valor_aplicado numeric(10,2)`, `uma_fecha_aplicada date`.
  - `monto_operacion numeric(14,2)`, `veces_uma numeric(12,2)`.
  - `monto_efectivo numeric(14,2) default 0.00`, `veces_uma_efectivo numeric(12,2)`, `limite_efectivo_uma numeric(12,2)`, `excede_limite_efectivo boolean default false`.
  - `calificacion_aviso text ('exento', 'identificacion', 'aviso_ordinario', 'aviso_24h')`.
  - `estatus_global text ('pendiente', 'aprobado', 'bloqueado')`.
  - `updated_at timestamptz`.
- **`public.pld_pep_diligencias`**:
  - `id uuid PK`, `escritura_id uuid FK`, `compareciente_id uuid FK`.
  - `cargo_publico text`, `dependencia text`, `tipo_vinculo text`.
  - `origen_fondos_declarado text`.
  - `aprobado_por uuid references auth.users(id)`, `fecha_aprobacion timestamptz`, `aprobado boolean`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100% de las escrituras que alcanzan el estatus `protocolizada` cuentan con evidencia de screening verificada para todos sus otorgantes.
- **SC-002**: Cero escrituras protocolizadas con comparecientes que tengan coincidencias activas en Lista de Personas Bloqueadas (LPB) o SAT 69-B.
- **SC-003**: El cálculo de umbrales UMA y determinación de la obligación de aviso SAT se ejecuta en menos de 100 milisegundos al guardar el monto y fecha del acto.
- **SC-004**: El tiempo promedio que le toma a un auxiliar notarial capturar y anexar la evidencia de screening para las 4 listas de un compareciente es inferior a 3 minutos gracias a los enlaces directos y flujo guiado.
- **SC-005**: La totalidad de evidencias documentales de PLD quedan archivadas y vinculadas formalmente al repositorio digital de la notaría con sellado de tiempo de autoría.

---

## Assumptions

- En la Fase 1 del sistema (actual), las consultas se realizan de forma manual por el personal de la notaría en los portales públicos de la UIF, SAT, OFAC y ONU, capturando pantallas como comprobante per Constitución §5.
- El catálogo `public.uma_historico` cuenta con los valores de la UMA vigentes para los años en que se celebran los instrumentos.
- Las consultas de listas tienen una vigencia estándar de 90 días naturales para el mismo compareciente en el mismo instrumento.
- La gestión de avisos en este módulo se enfoca en la calificación y gate preventivo; la generación de los archivos XML/reportes mensuales para el portal SPPLD se abordará en el módulo específico posterior (`Avisos SAT/UIF`).
