import type { HojaLiquidacionConsolidada } from '~/types/honorarios'

export interface DatosNotariaMembrete {
  notarioTitular?: string
  numeroNotaria?: string | number
  entidadFederativa?: string
  direccion?: string
  telefono?: string
}

function formatMoneda(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '$ 0.00 MXN'
  return `$ ${Number(val).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MXN`
}

/**
 * Genera el documento HTML profesional de la Hoja de Liquidación Notarial Consolidada
 */
export function generarHtmlHojaLiquidacion(
  datos: HojaLiquidacionConsolidada,
  notaria: DatosNotariaMembrete = {}
): string {
  const titular = notaria.notarioTitular || 'Lic. Roberto Méndez'
  const numNotaria = notaria.numeroNotaria || '42'
  const entidad = notaria.entidadFederativa || 'Ciudad de México'
  const direccion = notaria.direccion || 'Av. Insurgentes Sur 1450, Piso 6, Col. Actipan, Benito Juárez, CDMX'

  // Partidas de Honorarios Notariales
  const filasHonorarios = datos.honorarios.partidas.length > 0
    ? datos.honorarios.partidas.map((p, idx) => {
        const iva = (p.aplica_iva && !p.es_descuento) ? (p.monto * 0.16) : 0
        const total = p.es_descuento ? p.monto : (p.monto + iva)
        return `
        <tr style="border-bottom: 1px solid #E2E6EC;">
          <td style="padding: 6px 8px; text-align: center; color: #5B6472; font-size: 11px;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-size: 11px; color: #1C222B;">
            ${p.es_descuento ? '<span style="color: #B23A34; font-weight: bold;">[DESCUENTO] </span>' : ''}
            ${p.concepto}
          </td>
          <td style="padding: 6px 8px; text-align: right; font-size: 11px; font-family: monospace;">
            ${p.es_descuento ? `-${formatMoneda(p.monto)}` : formatMoneda(p.monto)}
          </td>
          <td style="padding: 6px 8px; text-align: center; font-size: 11px; color: #5B6472;">
            ${(!p.es_descuento && p.aplica_iva) ? formatMoneda(iva) : 'Exento (0%)'}
          </td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-size: 11px; font-family: monospace; ${p.es_descuento ? 'color: #B23A34;' : 'color: #1B3A5F;'}">
            ${p.es_descuento ? `-${formatMoneda(total)}` : formatMoneda(total)}
          </td>
        </tr>
      `
      }).join('')
    : `<tr><td colspan="5" style="padding: 12px; text-align: center; color: #5B6472; font-size: 11px;">Sin partidas de honorarios registradas</td></tr>`

  // Órdenes de pago a terceros
  const filasTerceros = datos.terceros.ordenes.length > 0
    ? datos.terceros.ordenes.map((o) => `
        <tr style="border-bottom: 1px solid #E2E6EC;">
          <td style="padding: 6px 8px; font-size: 11px; font-weight: bold; color: #1B3A5F; font-family: monospace;">${o.folio}</td>
          <td style="padding: 6px 8px; font-size: 11px; color: #5B6472;">${o.dependencia}</td>
          <td style="padding: 6px 8px; font-size: 11px; color: #1C222B;">${o.concepto}</td>
          <td style="padding: 6px 8px; text-align: center; font-size: 10px;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; background: ${o.estado === 'pagado' ? '#D6EEDF; color: #14402A' : '#F4E8D6; color: #5C3E14'};">
              ${o.estado.toUpperCase()}
            </span>
          </td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-size: 11px; font-family: monospace; color: #1C222B;">
            ${formatMoneda(o.monto)}
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="5" style="padding: 12px; text-align: center; color: #5B6472; font-size: 11px;">Sin derechos gubernamentales registrados</td></tr>`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Hoja de Liquidación Notarial — Instrumento ${datos.instrumento_numero}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 12mm 15mm;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1C222B;
      margin: 0;
      padding: 0;
      background: #FFFFFF;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-box {
      border-bottom: 2px solid #1B3A5F;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .notaria-title {
      font-size: 16px;
      font-weight: bold;
      color: #1B3A5F;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .notaria-sub {
      font-size: 11px;
      color: #5B6472;
      margin-top: 2px;
    }
    .doc-badge {
      text-align: right;
    }
    .doc-title {
      font-size: 15px;
      font-weight: bold;
      color: #A9762E;
      text-transform: uppercase;
    }
    .doc-num {
      font-size: 12px;
      font-weight: bold;
      color: #1B3A5F;
    }
    .section-title {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      color: #1B3A5F;
      background: #F0F2F4;
      padding: 5px 8px;
      margin-top: 10px;
      margin-bottom: 6px;
      border-left: 3px solid #1B3A5F;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    th {
      background: #E8ECF0;
      color: #1C222B;
      font-size: 10px;
      text-transform: uppercase;
      padding: 5px 8px;
      border-bottom: 1px solid #CBD2DC;
    }
    .summary-card {
      border: 1px solid #CBD2DC;
      border-radius: 6px;
      padding: 10px 14px;
      background: #F8FAFC;
      margin-top: 10px;
    }
    .balance-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 12px;
    }
    .balance-total {
      border-top: 2px solid #1B3A5F;
      margin-top: 6px;
      padding-top: 6px;
      font-size: 15px;
      font-weight: bold;
      color: #1B3A5F;
    }
    .footer-note {
      font-size: 9px;
      color: #5B6472;
      text-align: center;
      margin-top: 20px;
      border-top: 1px solid #E2E6EC;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <div class="notaria-title">Notaría Pública No. ${numNotaria} · ${entidad}</div>
      <div class="notaria-sub">Titular: <strong>${titular}</strong></div>
      <div class="notaria-sub">${direccion}</div>
    </div>
    <div class="doc-badge">
      <div class="doc-title">Hoja de Liquidación</div>
      <div class="doc-num">Instrumento: ${datos.instrumento_numero}</div>
      <div class="notaria-sub">Fecha: ${datos.fecha_emision}</div>
    </div>
  </div>

  <div style="background: #F8FAFC; border: 1px solid #E2E6EC; border-radius: 4px; padding: 6px 10px; margin-bottom: 10px; font-size: 11px;">
    <strong>Acto Notarial:</strong> ${datos.acto_juridico} &nbsp;|&nbsp; 
    <strong>Objeto:</strong> ${datos.objeto}
  </div>

  <!-- Bloque A: Honorarios y Gastos Notariales Propios -->
  <div class="section-title">A. Honorarios y Gastos Notariales Propios</div>
  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">#</th>
        <th style="text-align: left;">Concepto / Partida</th>
        <th style="width: 120px; text-align: right;">Importe Base</th>
        <th style="width: 110px; text-align: center;">IVA (16%)</th>
        <th style="width: 130px; text-align: right;">Total Notaría</th>
      </tr>
    </thead>
    <tbody>
      ${filasHonorarios}
    </tbody>
  </table>

  <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
    <div style="width: 280px; font-size: 11px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span style="color: #5B6472;">Subtotal Gravado (IVA 16%):</span>
        <strong style="font-family: monospace;">${formatMoneda(datos.honorarios.subtotal_gravado)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span style="color: #5B6472;">Subtotal Exento (0%):</span>
        <strong style="font-family: monospace;">${formatMoneda(datos.honorarios.subtotal_exento)}</strong>
      </div>
      ${datos.honorarios.descuento_total > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #B23A34;">
        <span>Descuento Aplicado:</span>
        <strong style="font-family: monospace;">-${formatMoneda(datos.honorarios.descuento_total)}</strong>
      </div>` : ''}
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span style="color: #5B6472;">IVA Trasladado (16%):</span>
        <strong style="font-family: monospace;">${formatMoneda(datos.honorarios.iva_total)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-top: 1px solid #CBD2DC; padding-top: 3px; font-weight: bold; color: #1B3A5F;">
        <span>Total Honorarios & Gastos:</span>
        <span style="font-family: monospace;">${formatMoneda(datos.honorarios.total_notaria)}</span>
      </div>
    </div>
  </div>

  <!-- Bloque B: Derechos, Impuestos y Gastos a Terceros -->
  <div class="section-title">B. Derechos Gubernamentales e Impuestos a Terceros (Órdenes de Pago)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 110px; text-align: left;">Folio Orden</th>
        <th style="width: 120px; text-align: left;">Dependencia</th>
        <th style="text-align: left;">Concepto</th>
        <th style="width: 90px; text-align: center;">Estatus</th>
        <th style="width: 120px; text-align: right;">Monto</th>
      </tr>
    </thead>
    <tbody>
      ${filasTerceros}
    </tbody>
  </table>

  <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
    <div style="width: 280px; font-size: 11px; display: flex; justify-content: space-between; border-top: 1px solid #CBD2DC; padding-top: 3px; font-weight: bold;">
      <span>Total Derechos a Terceros:</span>
      <span style="font-family: monospace;">${formatMoneda(datos.terceros.total_derechos)}</span>
    </div>
  </div>

  <!-- Bloque C: Balance y Resumen General de la Cuenta -->
  <div class="section-title">C. Resumen General y Estado de Cuenta</div>
  <div class="summary-card">
    <div class="balance-row">
      <span>Total Honorarios y Gastos Notaría (A):</span>
      <span style="font-family: monospace; font-weight: bold;">${formatMoneda(datos.honorarios.total_notaria)}</span>
    </div>
    <div class="balance-row">
      <span>Total Derechos e Impuestos a Terceros (B):</span>
      <span style="font-family: monospace; font-weight: bold;">${formatMoneda(datos.terceros.total_derechos)}</span>
    </div>
    <div class="balance-row" style="border-top: 1px dashed #CBD2DC; padding-top: 4px; margin-top: 4px; font-weight: bold;">
      <span>Gran Total del Trámite (A + B):</span>
      <span style="font-family: monospace; color: #1B3A5F; font-size: 13px;">${formatMoneda(datos.balance.gran_total_tramite)}</span>
    </div>
    <div class="balance-row" style="color: #2F6F4E; font-weight: bold;">
      <span>Menos Anticipos y Pagos Recibidos:</span>
      <span style="font-family: monospace;">-${formatMoneda(datos.balance.total_recibido)}</span>
    </div>
    <div class="balance-row balance-total">
      <span>SALDO PENDIENTE DE LIQUIDACIÓN:</span>
      <span style="font-family: monospace;">${formatMoneda(datos.balance.saldo_neto_pendiente)}</span>
    </div>
  </div>

  <div class="footer-note">
    Este presupuesto y estado de cuenta es emitido para fines de liquidación notarial. Los derechos gubernamentales e impuestos se enteran en estricto cumplimiento legal a las tesorerías correspondientes. Los honorarios profesionales causan comprobante fiscal digital (CFDI) conforme a las disposiciones fiscales vigentes.
  </div>
</body>
</html>`
}

/**
 * Abre la ventana del navegador para vista previa o impresión en PDF
 */
export function imprimirHojaLiquidacion(
  datos: HojaLiquidacionConsolidada,
  notaria?: DatosNotariaMembrete
): void {
  const html = generarHtmlHojaLiquidacion(datos, notaria)
  const ventana = window.open('', '_blank', 'width=900,height=800')
  if (!ventana) {
    alert('Por favor permita las ventanas emergentes para visualizar e imprimir la Hoja de Liquidación.')
    return
  }

  ventana.document.open()
  ventana.document.write(html)
  ventana.document.close()

  // Esperar carga y disparar impresión
  ventana.onload = () => {
    ventana.focus()
    setTimeout(() => {
      ventana.print()
    }, 250)
  }
}
