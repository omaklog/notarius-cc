# Quickstart: 11-avisos-sat (Avisos SAT / UIF - Prevención de Lavado de Dinero SPPLD)

Este documento describe la guía de verificación rápida de los flujos de la **Feature 11: Avisos SAT / UIF**.

---

## Escenario 1: Compraventa de Inmueble sujeta a Aviso Ordinario (Individual)

1. **Navegación al Hub**:
   - Acceder al expediente de una escritura de Compraventa de Inmueble con monto superior a 16,050 UMAs (e.g. $3,500,000 MXN) y fecha de acto celebrada el 15 de agosto de 2026.
   - Hacer clic en la pestaña **"Avisos SAT/UIF"** (`AvisosTab.vue`).

2. **Verificación de Dictamen**:
   - Constatar que la tarjeta muestra el badge **"Sujeta a Aviso Ordinario SAT"**.
   - Validar que muestra el monto en pesos ($3,500,000 MXN), el cálculo en UMAs y la fecha límite inteligente calculada (e.g. 17 de septiembre de 2026 + prórroga por RFC del Notario).

3. **Generación de Archivos**:
   - Pulsar **"Generar Layout XML SPPLD"**: El sistema descarga el archivo `.xml` estructurado con la estructura oficial del SAT para Fedatarios Públicos.
   - Pulsar **"Descargar Cédula PDF"**: El sistema genera el documento PDF oficial con membrete notarial, desglose de partes, medio de pago y dictamen normativo.

4. **Registro de Acuse Oficial**:
   - Pulsar **"Registrar Acuse de Aceptación SAT"**.
   - Ingresar el folio oficial emitido por el portal del SAT (e.g. `SAT-SPPLD-2026-98124`).
   - Seleccionar la fecha y hora de presentación y adjuntar el archivo PDF de acuse.
   - Guardar: Comprobar que el estatus cambia a **"Presentado con Acuse"** con check verde y enlace de descarga del comprobante.

---

## Escenario 2: Tablero Mensual `/avisos-sat` y Paquete Consolidado

1. **Acceso al Tablero**:
   - Navegar a `/avisos-sat` desde el menú lateral de navegación.
   - Seleccionar el periodo `Agosto 2026`.

2. **Indicadores y Semáforo de Vencimiento**:
   - Validar las 5 tarjetas KPI:
     - Total Operaciones Vulnerables.
     - Sujetas a Aviso en el Periodo.
     - Avisos Presentados.
     - Avisos Pendientes.
     - Avisos de 24 Horas.
   - Verificar el semáforo y cuenta regresiva al día 17 + días de prórroga por RFC.

3. **Paquete Mensual Consolidado**:
   - Hacer clic en **"Generar Paquete Mensual XML"**.
   - El sistema construye y descarga un archivo XML consolidado conteniendo todas las operaciones reportables del mes para carga masiva en el portal SPPLD.

---

## Escenario 3: Periodo sin Operaciones (Informe en Ceros)

1. **Detección de Cero Operaciones**:
   - Seleccionar un mes sin operaciones que rebasen el umbral de aviso.
   - El tablero muestra el banner informativo: *"En este periodo no se formalizaron actos que superen el umbral de aviso. Conforme al Art. 17 LFPIORPI, debe presentarse Informe en Ceros ante el SAT a más tardar el día 17."*

2. **Declaración de Ceros**:
   - Pulsar el botón **"Declarar Informe en Ceros"**.
   - Capturar el folio de acuse emitido por el portal SPPLD y adjuntar el comprobante PDF.
   - Guardar: El periodo se marca como **"Cumplido en Ceros"** en la bitácora mensual.

---

## Escenario 4: Alerta Urgente de Aviso de 24 Horas (LPB)

1. **Detección de Coincidencia**:
   - En una escritura con compareciente marcado con coincidencia confirmada en Lista de Personas Bloqueadas (LPB).
   - El sistema activa de inmediato la alerta roja en la escritura y en el tablero: **"AVISO DE 24 HORAS REQUERIDO (Art. 17 LFPIORPI)"** con temporizador de horas restantes.

2. **Atención y Acuse**:
   - Generar el XML de aviso urgente con prioridad `3` (Alerta 24h).
   - Asentar el folio de acuse SAT presentado y verificar que la alerta de 24 horas queda solventada con registro inmutable en bitácora.
