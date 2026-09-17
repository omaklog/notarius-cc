# Quickstart & Verification Guide: 05-cumplimiento-pld

**Feature**: Cumplimiento PLD / Prevención de Lavado de Dinero y Fiscalización Notarial
**Date**: 2026-09-15

---

## Prerequisitos

1. Supabase local ejecutándose (`npx supabase status`).
2. Migraciones aplicadas hasta `05-cumplimiento-pld` (`public.pld_listas_catalogo`, `public.pld_consultas`, `public.pld_evaluaciones_escritura`, `public.pld_pep_diligencias`).
3. Bucket de almacenamiento `pld-evidencias` configurado en Supabase Storage.
4. Suite de pruebas frontend disponible (`npm run test:unit`).

---

## Escenarios de Validación End-to-End

### Escenario 1: Cotejo Manual Asistido con Subida de Captura de Pantalla
1. Crear una escritura de Compraventa y vincular a una Persona Física (e.g. "Juan Morales").
2. Navegar a la pestaña **Cumplimiento PLD** (`/escrituras/:id`).
3. Observar que el compareciente figura con estatus `Pendiente` (0/4 listas verificadas).
4. Abrir el modal de cotejo (`PldScreeningModal`).
5. Para cada una de las 4 listas (LPB UIF, OFAC SDN, ONU, SAT 69-B):
   - Hacer clic en el enlace oficial de consulta externa.
   - Seleccionar resultado `Limpio`.
   - Adjuntar una captura de pantalla `.png`.
6. Guardar y certificar el dictamen.
7. **Resultado esperado**:
   - El compareciente cambia a estatus `Verificado` (4/4 listas con chip verde).
   - Los archivos se almacenan en el bucket `pld-evidencias` con su hash SHA-256 registrado.

### Escenario 2: Coincidencia Bloqueante en LPB UIF / SAT 69-B
1. En el modal de cotejo de un compareciente, seleccionar resultado `Coincidencia Bloqueante` en la Lista de Personas Bloqueadas (LPB).
2. Guardar el dictamen.
3. **Resultado esperado**:
   - El compareciente se marca con estatus `Bloqueado`.
   - La evaluación global de la escritura cambia a semáforo rojo (`ROJO - Bloqueo Legal Activo`).
   - Se muestra la alerta: *"Operación Impedida por LPB — Se requiere Aviso de 24 horas a la UIF"*.
   - El botón **Protocolizar** se deshabilita; la función `fn_validar_protocolizacion` retorna `{ "permitido": false, "motivo": "Compareciente bloqueado en LPB" }`.

### Escenario 3: Documentación de Falso Positivo / Homonimia
1. Con el compareciente del Escenario 2, abrir nuevamente el modal de cotejo.
2. Cambiar el resultado a `Falso Positivo`.
3. Intentar guardar sin capturar justificación ni documento de contraste -> El sistema bloquea el guardado por validación de formulario.
4. Capturar la justificación analítica (e.g., *"El homónimo de la lista tiene fecha de nacimiento 1965 y RFC diferente"*).
5. Adjuntar el comprobante oficial (constancia de situación fiscal / CURP).
6. Guardar el dictamen.
7. **Resultado esperado**:
   - El bloqueo se levanta y el estatus cambia a `Verificado`.
   - La bitácora inmutable registra el descarte con autoría y fecha.

### Escenario 4: Reutilización Asistida de Screening Vigente (< 90 Días)
1. Crear una nueva escritura en borrador y vincular al mismo compareciente verificado en el Escenario 1.
2. Abrir la pestaña **Cumplimiento PLD**.
3. **Resultado esperado**:
   - El sistema muestra el banner: *"Screening previo vigente detectado en Instrumento X (hace Y días)"*.
   - Se presenta el botón *"Importar dictamen vigente"*.
4. Hacer clic en *"Importar dictamen vigente"*.
5. **Resultado esperado**:
   - Se importan los 4 cotejos vinculando los comprobantes existentes.
   - El compareciente queda `Verificado` inmediatamente sin requerir recaptura de archivos.

### Escenario 5: Cálculo de UMA y Restricción de Efectivo (Art. 32 LFPIORPI)
1. En una escritura de Compraventa de Inmueble con fecha 15/09/2026, capturar monto de operación: `$4,500,000.00 MXN`.
2. Capturar monto en efectivo: `$500,000.00 MXN`.
3. **Resultado esperado**:
   - UMA 2026 aplicada: `$113.14 MXN`.
   - Total operación: `39,773.73 UMA` (supera umbral de identificación 8,025 UMA y aviso 16,050 UMA).
   - Calificación: `aviso_ordinario` (aviso mensual SAT antes del día 17 del mes siguiente).
   - Efectivo: `4,419.30 UMA` <= tope de `8,025 UMA` -> `excede_limite_efectivo = false` (Semáforo verde en efectivo).
4. Cambiar el monto en efectivo a `$1,200,000.00 MXN` (10,606.33 UMA).
5. **Resultado esperado**:
   - `excede_limite_efectivo = true`.
   - Semáforo rojo en tarjeta de efectivo: *"Límite de efectivo Art. 32 excedido"*.
   - Gate de protocolización bloqueado estrictamente.

### Escenario 6: Diligencia Reforzada PEP y Aprobación RBAC
1. Registrar a un compareciente con condición `PEP Directo` (e.g. Ex-Director de Dependencia Pública).
2. Capturar el cuestionario de procedencia de fondos.
3. El compareciente queda en estatus `Diligencia Reforzada Pendiente`.
4. Iniciar sesión como usuario con rol auxiliar/abogado -> El botón de aprobar está deshabilitado o deniega por RBAC.
5. Iniciar sesión como usuario con rol `notario_titular` o `administrador`.
6. Abrir el modal de aprobación de PEP y confirmar la autorización.
7. **Resultado esperado**:
   - Se estampa `aprobado_por = auth.uid()` y `fecha_aprobacion = now()`.
   - El compareciente pasa a estatus `PEP Aprobado / Verificado`.

### Escenario 7: Gate de Protocolización Definitivo
1. Con todos los comparecientes verificados, sin bloqueos activos, PEPs aprobados y efectivo dentro del límite legal.
2. Invocar `fn_validar_protocolizacion(escritura_id)`.
3. **Resultado esperado**:
   - Retorna `{ "permitido": true, "motivos": [] }`.
   - El botón **Protocolizar** en el encabezado de la escritura se habilita con sello notarial verde institucional.
