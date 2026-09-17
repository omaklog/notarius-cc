# Quickstart: 08-ordenes-pago — Validación Rápida de Órdenes de Pago y Conciliación

**Feature**: `08-ordenes-pago`  
**Date**: 2026-09-16  
**Status**: Ready

---

## 1. Prerrequisitos

1. Base de datos con migración `20260803000000_ordenes_pago.sql` aplicada.
2. Catálogo de dependencias oficiales (`cat_dependencias_oficiales`) disponible desde el módulo 07.
3. Servidor de desarrollo corriendo (`npm run dev`) o suite de pruebas Vitest (`npm test`).

---

## 2. Escenarios de Validación End-to-End

### Escenario 1: Alta de Orden de Pago con Línea de Captura Gubernamental
1. En la escritura seleccionada, navegar a la pestaña **Órdenes de Pago**.
2. Presionar el botón **+ Registrar Orden de Pago**.
3. Completar el formulario:
   - Dependencia: `RPP`
   - Concepto: `Derechos de Inscripción de Compraventa e Hipoteca`
   - Monto: `$ 18,450.00`
   - Línea de captura: `08264918237461298471`
   - Fecha de vencimiento: 5 días en el futuro.
   - Quién cubre: `Adquirente`
4. Guardar.
5. **Resultado esperado**:
   - Se genera el folio correlativo anual (ej. `ORD-2026-0001`).
   - Estado inicial: `pendiente`.
   - Chip de semáforo de vigencia: `verde` (*"Vence en 5 días"*).
   - Tarjetas de resumen financiero actualizan: Total Derechos `$ 18,450.00`, Pendiente `$ 18,450.00`, Pagado `$ 0.00`.

---

### Escenario 2: Semáforo de Vigencia de Línea de Captura
1. Modificar o registrar una orden con vencimiento en 2 días:
   - **Resultado**: Chip de semáforo en `amarillo` (*"Vence en 2 días"*).
2. Modificar o registrar una orden vencida (fecha de vencimiento de ayer):
   - **Resultado**: Chip de semáforo en `rojo` (*"Línea vencida"*).
3. Registrar una orden sin fecha de vencimiento:
   - **Resultado**: Chip en `gris` (*"Sin vencimiento"*).

---

### Escenario 3: Sincronización Bidireccional con Trámites Notariales
1. Vincular una orden de pago al registrarla con un trámite existente (ej. trámite de CLG con volante `VOL-2026-98124`).
2. **Resultado en base de datos**:
   - `ordenes_pago.tramite_id` apunta a `tramites_escritura.id`.
   - `tramites_escritura.orden_pago_id` se actualiza automáticamente apuntando a la orden.
3. En la pestaña de Trámites (`TramitesTab`), el trámite muestra el botón/enlace a la orden de pago.

---

### Escenario 4: Alerta Informativa No Bloqueante en Escritura
1. Con órdenes pendientes de pago, verificar la cabecera de la escritura y la pestaña de órdenes.
2. **Resultado esperado**:
   - Se visualiza un banner ámbar: *"Existen órdenes de derechos pendientes de liquidar por un total de $... "*.
3. Invocar la función de validación de protocolización `fn_validar_protocolizacion(escritura_id)`:
   - **Resultado esperado**: No genera error ni bloqueo por concepto de derechos pendientes (cumpliendo la decisión de clarificación C acordada con el usuario).

---

### Escenario 5: Liquidación Bancaria SPEI y Registro de Comprobante
1. En la orden de pago pendiente, hacer clic en la acción **Liquidar**.
2. En el modal `OrdenPagoLiquidarModal`:
   - Método de pago: `Transferencia SPEI`
   - Folio/Clave de rastreo bancaria: `20260916000491823`
   - Fecha de pago: Fecha actual.
   - Adjuntar comprobante PDF de la transferencia.
3. Confirmar pago.
4. **Resultado esperado**:
   - La orden pasa a estado `pagado`.
   - El semáforo pasa a color `azul` (*"Pagado"*).
   - El archivo se guarda en el storage `expedientes` bajo la subcarpeta de la escritura y se vincula en `expediente_documentos`.
   - Si estaba vinculada a un trámite, el chip del trámite se actualiza a *"Derechos Pagados"*.
   - El saldo pendiente de la escritura disminuye y el monto pagado incrementa en `$ 18,450.00`.

---

### Escenario 6: Tablero Notarial Global `/ordenes-pago`
1. Navegar a la ruta `/ordenes-pago`.
2. **Resultado esperado**:
   - Se despliega el panel consolidado de tesorería y caja de la notaría.
   - KPIs superiores: Total Requerido, Total Liquidado, Saldo en Tránsito, Líneas en Riesgo de Vencimiento.
   - Filtros por dependencia, vigencia (vencidas, por vencer, vigentes) y estado.
   - Enlace directo a la escritura correspondiente al hacer clic en cualquier registro.
