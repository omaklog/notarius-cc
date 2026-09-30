import { describe, expect, it } from 'vitest'
import { generarHtmlHojaLiquidacion } from '~/utils/pdfHojaLiquidacion'
import type { HojaLiquidacionConsolidada } from '~/types/honorarios'

describe('pdfHojaLiquidacion', () => {
  const mockDatos: HojaLiquidacionConsolidada = {
    escritura_id: 'esc-123',
    instrumento_numero: 48102,
    objeto: 'Compraventa y Crédito Hipotecario',
    acto_juridico: 'Compraventa',
    fecha_emision: '17 de septiembre de 2026',
    honorarios: {
      subtotal_gravado: 40000,
      subtotal_exento: 5000,
      descuento_total: 0,
      iva_total: 6400,
      total_notaria: 51400,
      partidas: [
        {
          concepto: 'Honorarios por redacción y fe pública',
          monto: 40000,
          aplica_iva: true,
          tasa_iva: 0.16,
          es_descuento: false,
          orden: 0,
        },
        {
          concepto: 'Gastos de archivo y certificaciones',
          monto: 5000,
          aplica_iva: false,
          tasa_iva: 0,
          es_descuento: false,
          orden: 1,
        },
      ],
    },
    terceros: {
      total_derechos: 25000,
      total_pagado_derechos: 25000,
      saldo_derechos: 0,
      ordenes: [
        {
          folio: 'ORD-2026-0001',
          dependencia: 'RPP',
          concepto: 'Derechos de Inscripción RPP',
          monto: 25000,
          estado: 'pagado',
        },
      ],
    },
    balance: {
      gran_total_tramite: 76400,
      total_recibido: 50000,
      saldo_neto_pendiente: 26400,
      estatus_general: 'pendiente',
    },
  }

  it('genera el HTML completo con datos de membrete e instrumento', () => {
    const html = generarHtmlHojaLiquidacion(mockDatos, {
      notarioTitular: 'Lic. Roberto Méndez',
      numeroNotaria: 42,
      entidadFederativa: 'CDMX',
    })

    expect(html).toContain('Notaría Pública No. 42 · CDMX')
    expect(html).toContain('Lic. Roberto Méndez')
    expect(html).toContain('Instrumento: 48102')
    expect(html).toContain('Compraventa y Crédito Hipotecario')
  })

  it('incluye el desglose de honorarios propios e IVA 16%', () => {
    const html = generarHtmlHojaLiquidacion(mockDatos)

    expect(html).toContain('Honorarios por redacción y fe pública')
    expect(html).toContain('Gastos de archivo y certificaciones')
    expect(html).toContain('$ 40,000.00 MXN')
    expect(html).toContain('$ 6,400.00 MXN')
    expect(html).toContain('$ 51,400.00 MXN')
  })

  it('incluye los derechos de terceros y el balance financiero general', () => {
    const html = generarHtmlHojaLiquidacion(mockDatos)

    expect(html).toContain('ORD-2026-0001')
    expect(html).toContain('Derechos de Inscripción RPP')
    expect(html).toContain('$ 25,000.00 MXN')
    expect(html).toContain('Gran Total del Trámite (A + B):')
    expect(html).toContain('$ 76,400.00 MXN')
    expect(html).toContain('-$ 50,000.00 MXN')
    expect(html).toContain('$ 26,400.00 MXN')
  })
})
