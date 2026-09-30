# Feature Specification: 14-bitacora-turnado (Bitácora de Turnado y Cadena de Custodia de Trámites: Redactor ↔ Gestor)

**Feature Branch**: `14-bitacora-turnado`  
**Created**: 2026-09-25  
**Status**: Draft  
**Input**: User description: "debemos tener una bitacora de tramites el tramite se rola entre el gestor y los redactores, el gestor devuelve tramites al redactor cuando hay algo por solventar o se termino el tramite pero la escriura sigue en curso con otros tramites, cuando el redactor solvente el problema o asigne un nuevo tramite de la escritura al gestor el gestor es responsable del seguimiento cuando el gestor entrega al redactor el redactor es responsable, si buscamos en el sistema el historial en esa bitacora podremos ver quien detuvo o tiene la tramitacion de la escritura en curso"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Turnado Formal de Trámites y Asignación de Custodia Operativa (Priority: P1) 🎯 MVP

Como Abogado Redactor o Coordinador de Notaría, quiero turnar formalmente un trámite notarial (o la escritura completa) al Gestor Notarial asignado, indicando dependencia de destino, documentación física/digital de soporte e instrucciones, para que el sistema transfiera la responsabilidad operativa y marque al Gestor como el custodio activo del trámite.

**Why this priority**: Es el cimiento esencial de la cadena de custodia. Sin un pase formal de estafeta del Redactor al Gestor, no es posible deslindar responsabilidades ni saber formalmente quién tiene el expediente.

**Independent Test**: Desde la pestaña de Trámites de una escritura o desde el panel de trámites, seleccionar un trámite en estado inicial, hacer clic en "Turnar a Gestor", seleccionar al gestor receptor e ingresar instrucciones. Constatar que el estado de custodia cambia a *"En manos del Gestor: [Nombre]"*, la fecha y hora de turnado se fijan inmutablemente y se inicia el conteo de tiempo en custodia del gestor.

**Acceptance Scenarios**:
1. **Given** un trámite creado por el redactor en estatus preliminar, **When** el redactor ejecuta la acción "Turnar a Gestor" con el gestor seleccionado e instrucciones, **Then** el sistema actualiza el custodio actual a dicho gestor, registra el asiento inmutable en la bitácora con `tipo_evento = 'turnado_a_gestor'` y muestra un badge visual distintivo (*Custodia: Gestor [Nombre]*).
2. **Given** un trámite en custodia del Gestor, **When** el gestor acude o ingresa el trámite ante la dependencia (RPP, Catastro), **Then** la responsabilidad operativa permanece formalmente en el gestor hasta que ocurra una devolución formal o entrega de conclusión.

---

### User Story 2 - Devolución por Solventación (Prevención / Observación) y Re-turnado (Priority: P2)

Como Gestor Notarial, cuando una dependencia oficial o autoridad registral emite una prevención, suspensión u observación que requiere aclaración legal, ajuste en el instrumento o documentación complementaria, quiero devolver formalmente el trámite al Abogado Redactor con el motivo detallado de la devolución y oficio/folio de prevención, para que la responsabilidad de atención se traslade formalmente al Redactor y quede constancia transparente de que el trámite está detenido por solventación.

**Why this priority**: Resuelve la mayor fricción operativa en notarías: saber quién tiene detenido el trámite cuando hay prevenciones registrales o catastrales, evitando disputas internas sobre demoras o vencimientos de plazos.

**Independent Test**: Con un trámite en manos del Gestor, presionar "Devolver al Redactor por Solventación", capturar el motivo (ej. "Aclaración de medidas y colindancias por diferencia catastral") y la fecha límite de prevención. Verificar que el estatus cambia a *"Detenido por Solventación — En manos del Redactor: [Nombre]"*, la bitácora registra la devolución y, al solventarlo, el redactor presiona "Solventar y Re-turnar" devolviendo la custodia al Gestor con el tiempo total computado.

**Acceptance Scenarios**:
1. **Given** un trámite en custodia del Gestor con una observación o prevención, **When** el Gestor ejecuta "Devolver a Redactor por Solventación" capturando motivo obligatorio y fecha límite, **Then** la custodia se transfiere de inmediato al Abogado Redactor, el semáforo cambia a ámbar/alerta (*Detenido por Solventación*) y se genera un registro en la bitácora con `tipo_evento = 'devuelto_a_redactor_prevencion'`.
2. **Given** un trámite devuelto al Redactor, **When** el Redactor subsana la observación y acciona "Solventar y Re-turnar a Gestor" con notas de solventación, **Then** la custodia regresa al Gestor, el trámite cambia a estatus solventado/reingresado, y la bitácora audita el tiempo exacto que tardó el redactor en solventar.

---

### User Story 3 - Conclusión Parcial de Trámite y Entrega al Redactor para Continuidad (Priority: P3)

Como Gestor Notarial, cuando un trámite ante una dependencia concluye exitosamente (ej. Certificado de Libertad de Gravamen liberado o avalúo catastral aprobado) pero la escritura continúa en proceso (aún requiere otros trámites, firma de las partes o emisión de proyecto), quiero devolver el trámite y expediente al Abogado Redactor asentando la entrega formal de los documentos obtenidos, para que el Redactor retome la integración del instrumento.

**Why this priority**: Permite documentar el flujo continuo de la escritura donde los trámites no son terminales aislados, sino fases que nutren el avance de la protocolización notarial.

**Independent Test**: Al concluir un trámite en dependencia, el Gestor captura los datos de salida (folio, documento obtenido) y ejecuta "Entregar Trámite Concluido al Redactor". Constatar que el trámite se marca como concluido favorablemente, la custodia de la siguiente fase pasa al Redactor y queda registrado el tiempo total que tomó la gestión externa.

**Acceptance Scenarios**:
1. **Given** un trámite con salida favorable de la dependencia, **When** el Gestor acciona "Entregar a Redactor (Trámite Concluido)", **Then** el sistema archiva el resultado, registra en bitácora `tipo_evento = 'tramite_concluido_entregado'` y transfiere la custodia del expediente al Redactor responsable de la escritura.
2. **Given** una escritura con múltiples trámites sucesivos, **When** el Redactor recibe el trámite concluido, **Then** puede aperturar o turnar el siguiente trámite necesario (ej. ingresar al RPP tras obtener la constancia municipal) asignándolo nuevamente al gestor.

---

### User Story 4 - Bitácora Histórica de Custodia, Auditoría de Tiempos y Cuellos de Botella (Priority: P4)

Como Notario Titular, Administrador o Coordinador, quiero consultar una línea de tiempo (timeline) cronológica e inmutable de todos los movimientos de turnado de una escritura o trámite, con métricas de tiempo de permanencia en manos de cada parte, para saber con precisión quién detuvo o tiene actualmente la tramitación en curso y auditar la eficiencia del equipo.

**Why this priority**: Proporciona trazabilidad legal y administrativa inalterable ante el Notario Titular y los clientes, permitiendo responder con certeza en qué escritorio y etapa procesal se encuentra cada instrumento.

**Independent Test**: Ingresar a la pestaña de trámites de una escritura o a la vista de Bitácora de Turnado en `/tramites`. Verificar que se despliega el historial completo de transferencias con emisor, receptor, motivo, fecha/hora y duración en cada etapa. Filtrar el listado general por "En manos del Gestor" o "En manos del Redactor (Solventando)".

**Acceptance Scenarios**:
1. **Given** una consulta de historial de un trámite o escritura, **When** se visualiza la bitácora de turnado, **Then** se muestra un timeline con:
   - Fecha y hora exacta del movimiento.
   - Usuario que entrega (nombre y rol: Redactor / Gestor).
   - Usuario que recibe (nombre y rol).
   - Tipo de movimiento (`Turnado Inicial`, `Devolución por Prevención`, `Solventado y Re-turnado`, `Entrega por Conclusión`).
   - Motivo y observaciones capturadas.
   - Tiempo transcurrido durante la custodia anterior (días y horas hábiles).
2. **Given** la lista general de trámites en el sistema, **When** el usuario aplica el filtro *"Custodia Actual"*, **Then** puede segmentar rápidamente entre:
   - *En manos del Gestor (En gestión externa activa)*
   - *En manos del Redactor (En solventación de observaciones o redacción)*
   - *Concluidos / Entregados*

---

## Edge Cases

- **Múltiples trámites activos en una misma escritura**: Cada trámite individual (`tramites_escritura`) posee su propia custodia independiente (ej. el gestor A tiene el avalúo catastral mientras el redactor B solventa una prevención en RPP). Adicionalmente, la escritura mantiene un indicador sintético de custodia general.
- **Reasignación de personal por ausencia o baja**: Si un gestor o redactor se ausenta o es reasignado, el Notario Titular o Administrador puede reasignar la custodia con un evento especial de `reasignacion_administrativa`, asentando el motivo en la bitácora sin borrar el historial previo.
- **Campos obligatorios en devoluciones por prevención**: Para evitar devoluciones ambiguas que detengan el flujo, el sistema no permite devolver un trámite sin especificar el motivo detallado de la observación y, si aplica, el folio o documento de requerimiento.
- **Cálculo de tiempos hábiles vs naturales**: La bitácora computa tanto los días naturales como los días hábiles en custodia para no penalizar a los redactores o gestores durante fines de semana y días inhábiles oficiales.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE registrar una bitácora inmutable de turnado y custodia de trámites (`bitacora_turnado_tramites`) que preserve la cadena de custodia entre redactores y gestores.
- **FR-002**: Cada registro de la bitácora DEBE almacenar: `tramite_id`, `escritura_id`, `usuario_origen_id`, `rol_origen`, `usuario_destino_id`, `rol_destino`, `tipo_evento`, `motivo_observacion`, `fecha_movimiento`, y `tiempo_custodia_horas`.
- **FR-003**: Los tipos de eventos de turnado PERMITIDOS DEBEN ser:
  - `turnado_a_gestor` (inicio o avance de gestión).
  - `devuelto_a_redactor_prevencion` (prevención, suspensión u observación de autoridad que requiere solventación).
  - `solventado_reingresado` (redactor solventa la observación y regresa la custodia al gestor).
  - `tramite_concluido_entregado` (gestor finaliza el trámite y entrega resultados al redactor).
  - `reasignacion_administrativa` (notario/admin reasigna responsable).
- **FR-004**: El sistema DEBE mantener en la entidad del trámite (`tramites_escritura`) los campos denormalizados de estado actual: `custodia_actual_rol` ('redactor' | 'gestor'), `custodio_actual_id` (referencia a `profiles`) y `fecha_inicio_custodia_actual`.
- **FR-005**: La interfaz DEBE mostrar de forma destacada en cada trámite un badge o indicador de semáforo con la custodia actual:
  - 🔵 *"En manos del Gestor: [Nombre]"* (en gestión activa).
  - 🟠 *"Detenido por Solventación — En manos del Redactor: [Nombre]"* (en solventación de prevención).
  - 🟢 *"Concluido y Entregado al Redactor"*.
- **FR-006**: El sistema DEBE proveer la acción modal **"Turnar al Gestor"**, permitiendo al redactor seleccionar el gestor responsable, ingresar instrucciones y adjuntar enlaces a documentos del expediente.
- **FR-007**: El sistema DEBE proveer la acción modal **"Devolver al Redactor por Solventación"**, exigiendo al gestor capturar el motivo de la observación, folio del oficio de prevención (si existe) y fecha límite legal para subsanar.
- **FR-008**: El sistema DEBE proveer la acción modal **"Solventar y Re-turnar"**, permitiendo al redactor describir las medidas correctivas adoptadas y devolver la estafeta al gestor para su reingreso.
- **FR-009**: El sistema DEBE proveer la acción modal **"Entregar Trámite Concluido"**, permitiendo al gestor asentar el resultado exitoso y regresar el expediente al redactor para la fase subsiguiente.
- **FR-010**: El sistema DEBE calcular automáticamente el tiempo transcurrido (en días y horas) que el trámite permaneció en manos de la parte que entrega antes de cada transferencia.
- **FR-011**: El componente de visualización DEBE presentar una línea de tiempo (timeline) cronológica con diseño Stitch Notarial (`#1B3A5F`, `#A9762E`) accesible tanto desde el detalle de la escritura (`TramitesTab.vue`) como desde la gestión global de trámites.
- **FR-012**: En el listado general de trámites (`/tramites`), el sistema DEBE incorporar filtros por *"Custodia Actual"* (`Todos`, `En manos del Gestor`, `En manos del Redactor / Solventación`, `Concluidos`) y buscador por redactor o gestor custodio.
- **FR-013**: Los registros de la bitácora DEBEN ser inmutables: ningún usuario (incluso con privilegios) puede modificar o eliminar eventos históricos de turnado (garantía de no repudio y auditoría notarial).

---

## Success Criteria *(mandatory)*

- **SC-001**: 100% de los trámites turnados reflejan de forma inmediata e inequívoca quién es el custodio responsable en la interfaz de usuario.
- **SC-002**: Reducción a 0 de disputas internas sobre "quién tiene la tramitación de la escritura" o "quién detuvo el expediente", verificable mediante la consulta del historial de la bitácora.
- **SC-003**: Tiempo de respuesta en la visualización de la línea de tiempo de turnado inferior a 250ms.
- **SC-004**: Cumplimiento del 100% de las pruebas unitarias existentes (404+ tests) sin ninguna regresión en el sistema.
- **SC-005**: Adhesión estricta a la Constitución Notarial (§3: Pestañas autónomas por contrato sin romper `TramitesTab.vue` ni `[id].vue`; §8: Prototipado y paleta Stitch).
