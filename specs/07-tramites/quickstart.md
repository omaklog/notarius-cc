# Quickstart: 07-tramites — Validación Rápida de Tarjetas de Gestoría y Dependencias

**Feature**: `07-tramites`  
**Date**: 2026-09-16  
**Status**: Ready

---

## 1. Prerrequisitos

1. Base de datos Supabase con migraciones de trámites y dependencias aplicadas:
   - `20260802000000_tramites_notariales.sql`
   - `20260803000000_ordenes_pago.sql`
   - `20260804000000_pasos_tramites_y_dependencias.sql` (con vista agregada y bitácora repetible).
2. Entorno de frontend Nuxt 3 activo (`npm run dev`) o suite Vitest (`npm test`).

---

## 2. Escenarios de Validación End-to-End

### Escenario 1: Visualización Inicial Bajo Demanda (Solo Dependencias Activas)
1. Abrir una escritura recién creada que aún no tenga movimientos de ventanilla registrados.
2. Navegar a la pestaña **Trámites**.
3. **Resultado esperado**:
   - No se despliegan tarjetas vacías innecesarias.
   - Se muestra un estado inicial limpio con el mensaje *"No se han registrado gestiones de ventanilla para este instrumento"* y el botón destacado **+ Iniciar Gestión en Dependencia**.

---

### Escenario 2: Iniciar Gestión en Dependencia (Catastro Estatal)
1. Presionar el botón superior **+ Iniciar Gestión en Dependencia**.
2. En el diálogo emergente, seleccionar **Dirección de Catastro Estatal**.
3. En el formulario modal compacto:
   - Seleccionar el paso `ING. CAT. EST.`.
   - Capturar el folio oficial: `VOL-4412`.
   - Capturar notas: `Ingreso de avalúo y planos para emisión de cédula`.
   - Presionar **Guardar Paso**.
4. **Resultado esperado**:
   - Aparece la tarjeta de **Dirección General de Catastro Estatal**.
   - Columna izquierda: exhibe el encabezado con el nombre de la dependencia, y la sección "Paso Actual" muestra `ING. CAT. EST.`, fecha actual, folio `VOL-4412` y el nombre del usuario autenticado.
   - Columna derecha: muestra el botón `+ Agregar Paso` y `Historial Completo (1 movimiento) ▼`.

---

### Escenario 3: Opciones de Pasos Filtradas Exclusivamente por Dependencia
1. En la tarjeta de **Catastro Estatal**, hacer clic en **+ Agregar Paso**.
2. **Resultado esperado**:
   - El selector muestra **únicamente** los pasos asociados a Catastro Estatal:
     - `ING. CAT. EST.`
     - `RECHAZO CAT. EST.`
     - `O.P. CAT. EST.`
     - `CORREGIR CED. EST.`
     - `CEDULA CAT. EST.`
   - No se muestran pasos de RPP (`INGRESO A R.P.P.`) ni de Notaría (`CAPTURA`).

---

### Escenario 4: Registro de Bitácora Repetible (Rechazo y Reingreso)
1. En la tarjeta de Catastro Estatal, seleccionar `RECHAZO CAT. EST.`.
2. Capturar notas: `Rechazado por plano sin firma de perito valuador`.
3. Guardar.
4. Posteriormente, seleccionar `ING. CAT. EST.` nuevamente con nuevo folio `VOL-4490` y nota `Reingreso con plano corregido`.
5. Guardar.
6. **Resultado esperado**:
   - La base de datos no arroja error de clave duplicada (sin restricción única por paso).
   - El "Paso Actual" de la tarjeta se actualiza inmediatamente al último movimiento: `ING. CAT. EST.` con folio `VOL-4490`.

---

### Escenario 5: Expansión de Acordeón Inline (Historial Completo)
1. En la tarjeta de Catastro Estatal, hacer clic en el botón secundario **Historial Completo (3 movimientos) ▼**.
2. **Resultado esperado**:
   - La tarjeta se expande suavemente hacia abajo dentro del mismo flujo (sin abrir modal ni cambiar de página).
   - El ícono del botón cambia a `▲`.
   - Se despliega la línea de tiempo vertical cronológica mostrando los 3 movimientos en orden descendente con sus fechas, folios oficiales y notas completas.
   - Al pulsar nuevamente, el acordeón se contrae.

---

### Escenario 6: Enlace con Órdenes de Pago en Pasos de O.P.
1. En la tarjeta de Catastro Estatal, pulsar `+ Agregar Paso` y seleccionar `O.P. CAT. EST.`.
2. En el modal compacto, verificar que el paso tiene la marca `genera_orden_pago` activa.
3. Hacer clic en el enlace/botón **+ Generar Orden de Pago de Derechos**.
4. **Resultado esperado**:
   - Se abre el diálogo de creación de Orden de Pago con la dependencia Catastro Estatal y el instrumento precargados.
   - Tras asentar el monto y línea de captura, el paso histórico asocia el `orden_pago_id` y exhibe el chip verde con el folio de la orden (e.g. `O.P. #OP-2026-081`).

---

### Escenario 7: Validación Automatizada con Vitest
Ejecutar la suite completa de pruebas:
```bash
npm test
```
**Resultado esperado**: 100% de suites y pruebas pasando, incluyendo las pruebas de renderizado de tarjetas, layout de 2 columnas, filtrado de pasos por autoridad y acordeón inline.
