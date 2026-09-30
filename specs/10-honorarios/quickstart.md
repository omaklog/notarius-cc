# Quickstart: 10-honorarios — Validación Rápida de Honorarios Notariales y Liquidación

**Feature**: `10-honorarios`  
**Date**: 2026-09-17  
**Status**: Ready

---

## 1. Prerrequisitos

1. Base de datos con migración `20260805000000_honorarios.sql` aplicada.
2. Servidor Nuxt en desarrollo (`npm run dev`) o suite Vitest (`npm test`).

---

## 2. Escenarios de Validación End-to-End

### Escenario 1: Cotización con Partidas Libres y Cálculo Automático de IVA (16%)
1. En el detalle de una escritura, hacer clic en la pestaña **Honorarios**.
2. Presionar **+ Agregar Partida**.
3. Capturar:
   - Concepto: `Honorarios profesionales por instrumentación de compraventa`
   - Monto: `$ 30,000.00`
   - Aplica IVA: `Sí` (Activo)
4. Presionar **Guardar Partida**.
5. Agregar una segunda partida:
   - Concepto: `Certificaciones y cotejos notariales antecedentes`
   - Monto: `$ 2,500.00`
   - Aplica IVA: `No` (Inactivo / Exento)
6. **Resultado esperado**:
   - Subtotal gravado: `$ 30,000.00`
   - Subtotal exento: `$ 2,500.00`
   - IVA 16%: `$ 4,800.00`
   - Total Cotizado: `$ 37,300.00`
   - Saldo Pendiente: `$ 37,300.00`
   - Chip de estado: `Cotizado`

---

### Escenario 2: Registro de Anticipo y Transición a Anticipo Parcial
1. En la misma pestaña de Honorarios, presionar **+ Registrar Pago / Anticipo**.
2. Capturar:
   - Monto: `$ 20,000.00`
   - Fecha de pago: Fecha actual
   - Método de pago: `Transferencia SPEI`
   - Referencia bancaria: `BBVA-8491203`
   - Concepto: `Anticipo inicial del 50% para inicio de trámite`
3. Confirmar.
4. **Resultado esperado**:
   - Se genera el folio de recibo consecutivo: `REC-2026-0001`.
   - Total pagado se actualiza a `$ 20,000.00`.
   - Saldo pendiente disminuye a `$ 17,300.00`.
   - Estatus de la cuenta pasa automáticamente a `anticipo_parcial`.

---

### Escenario 3: Liquidación al 100% y Saldo en Cero
1. Registrar un segundo pago:
   - Monto: `$ 17,300.00`
   - Método: `Tarjeta de Débito`
   - Referencia: `Auth TPV 99312`
   - Concepto: `Liquidación final de honorarios`
2. Confirmar.
3. **Resultado esperado**:
   - Total pagado: `$ 37,300.00`.
   - Saldo pendiente: `$ 0.00`.
   - Estatus de la cuenta pasa automáticamente a `liquidado` (chip verde).

---

### Escenario 4: Hoja de Liquidación Consolidada (Notaría + Terceros)
1. Presionar **Generar Hoja de Liquidación (PDF)**.
2. **Resultado esperado**:
   - Se despliega el modal del estado de cuenta integral con:
     - Bloque 1: Desglose de Honorarios Propios de la Notaría ($37,300.00).
     - Bloque 2: Desglose de Órdenes de Pago de Derechos a Terceros (RPP, Catastro, ISAI).
     - Bloque 3: Resumen general con el costo integral del trámite, total de anticipos recibidos y saldo total.
   - Opción para imprimir o descargar en PDF oficial.

---

### Escenario 5: Registro Fiscal CFDI 4.0
1. En la tarjeta de Facturación Electrónica, capturar datos fiscales:
   - RFC: `XAXX010101000`
   - Razón Social: `CLIENTE DE PRUEBA S.A. DE C.V.`
   - Régimen Fiscal: `601 - General de Ley Personas Morales`
   - Uso CFDI: `G03 - Gastos en general`
   - Método de Pago: `PUE`
   - Folio Fiscal UUID: `4D8B2A91-9F3C-4E12-B810-7D03A48F91B4`
2. Guardar.
3. **Resultado esperado**:
   - Estatus de facturación cambia a `facturada` con badge verde y datos registrados.
