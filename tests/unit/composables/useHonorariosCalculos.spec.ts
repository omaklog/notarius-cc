import { describe, it, expect } from 'vitest'
import { useHonorariosCalculos } from '~/composables/useHonorariosCalculos'
import type { HonorariosPartida, HonorariosPago } from '~/types/honorarios'

describe('useHonorariosCalculos', () => {
  const {
    redondear,
    formatearMoneda,
    calcularTotalesPartidas,
    calcularSaldoYEstado,
    consolidarHojaLiquidacion,
    evaluarAlertaEfectivo,
  } = useHonorariosCalculos()

  describe('redondear y formatearMoneda', () => {
    it('redondea correctamente números decimales a 2 dígitos', () => {
      expect(redondear(10.555)).toBe(10.56)
      expect(redondear(10.554)).toBe(10.55)
      expect(redondear(0)).toBe(0)
    })

    it('formatea montos en moneda nacional mexicana', () => {
      expect(formatearMoneda(0)).toBe('$ 0.00 MXN')
      expect(formatearMoneda(12500.5)).toBe('$ 12,500.50 MXN')
      expect(formatearMoneda(null)).toBe('$ 0.00 MXN')
    })
  })

  describe('calcularTotalesPartidas', () => {
    it('calcula correctamente para una partida gravada única con IVA 16%', () => {
      const partidas: HonorariosPartida[] = [
        {
          concepto: 'Honorarios notariales',
          monto: 20000,
          aplica_iva: true,
          tasa_iva: 0.16,
          es_descuento: false,
          orden: 0,
        },
      ]
      const res = calcularTotalesPartidas(partidas)
      expect(res.subtotal_gravado).toBe(20000)
      expect(res.subtotal_exento).toBe(0)
      expect(res.iva_total).toBe(3200)
      expect(res.descuento_total).toBe(0)
      expect(res.total_cotizado).toBe(23200)
    })

    it('calcula correctamente con partidas mixtas (gravadas y exentas)', () => {
      const partidas: HonorariosPartida[] = [
        {
          concepto: 'Honorarios escritura',
          monto: 30000,
          aplica_iva: true,
          tasa_iva: 0.16,
          es_descuento: false,
          orden: 0,
        },
        {
          concepto: 'Certificaciones exentas',
          monto: 4500,
          aplica_iva: false,
          tasa_iva: 0,
          es_descuento: false,
          orden: 1,
        },
      ]
      const res = calcularTotalesPartidas(partidas)
      expect(res.subtotal_gravado).toBe(30000)
      expect(res.subtotal_exento).toBe(4500)
      expect(res.iva_total).toBe(4800)
      expect(res.total_cotizado).toBe(39300)
    })

    it('aplica deducciones y descuentos comerciales recalculando la base gravable', () => {
      const partidas: HonorariosPartida[] = [
        {
          concepto: 'Honorarios matriz',
          monto: 25000,
          aplica_iva: true,
          tasa_iva: 0.16,
          es_descuento: false,
          orden: 0,
        },
        {
          concepto: 'Descuento institucional',
          monto: 5000,
          aplica_iva: false,
          tasa_iva: 0,
          es_descuento: true,
          orden: 1,
        },
      ]
      const res = calcularTotalesPartidas(partidas)
      expect(res.subtotal_gravado).toBe(25000)
      expect(res.descuento_total).toBe(5000)
      // Base gravable neta: 25,000 - 5,000 = 20,000 * 0.16 = 3,200
      expect(res.iva_total).toBe(3200)
      // Total: 25,000 + 3,200 - 5,000 = 23,200
      expect(res.total_cotizado).toBe(23200)
    })

    it('retorna ceros ante lista vacía de partidas', () => {
      const res = calcularTotalesPartidas([])
      expect(res.total_cotizado).toBe(0)
      expect(res.iva_total).toBe(0)
      expect(res.subtotal_gravado).toBe(0)
    })
  })

  describe('calcularSaldoYEstado', () => {
    it('retorna estado borrador si el total cotizado es cero', () => {
      const res = calcularSaldoYEstado(0, [])
      expect(res.estatus).toBe('borrador')
      expect(res.saldo_pendiente).toBe(0)
      expect(res.total_pagado).toBe(0)
    })

    it('retorna estado cotizado si no se han registrado cobros', () => {
      const res = calcularSaldoYEstado(15000, [])
      expect(res.estatus).toBe('cotizado')
      expect(res.saldo_pendiente).toBe(15000)
      expect(res.total_pagado).toBe(0)
    })

    it('retorna anticipo_parcial cuando los pagos son menores al total cotizado', () => {
      const pagos: HonorariosPago[] = [
        {
          id: '1',
          cuenta_id: 'c1',
          folio_recibo: 'REC-2026-0001',
          monto: 6000,
          fecha_pago: '2026-09-17',
          metodo_pago: 'transferencia_spei',
          concepto: 'Anticipo inicial',
        },
      ]
      const res = calcularSaldoYEstado(15000, pagos)
      expect(res.estatus).toBe('anticipo_parcial')
      expect(res.total_pagado).toBe(6000)
      expect(res.saldo_pendiente).toBe(9000)
    })

    it('retorna liquidado cuando los pagos cubren el 100% del total', () => {
      const pagos: HonorariosPago[] = [
        {
          id: '1',
          cuenta_id: 'c1',
          folio_recibo: 'REC-2026-0001',
          monto: 10000,
          fecha_pago: '2026-09-17',
          metodo_pago: 'transferencia_spei',
          concepto: 'Anticipo',
        },
        {
          id: '2',
          cuenta_id: 'c1',
          folio_recibo: 'REC-2026-0002',
          monto: 5000,
          fecha_pago: '2026-09-18',
          metodo_pago: 'tarjeta_credito_debito',
          concepto: 'Finiquito',
        },
      ]
      const res = calcularSaldoYEstado(15000, pagos)
      expect(res.estatus).toBe('liquidado')
      expect(res.total_pagado).toBe(15000)
      expect(res.saldo_pendiente).toBe(0)
    })
  })

  describe('consolidarHojaLiquidacion', () => {
    it('consolida honorarios propios y derechos de terceros en una sola estructura', () => {
      const partidas: HonorariosPartida[] = [
        {
          concepto: 'Honorarios',
          monto: 20000,
          aplica_iva: true,
          tasa_iva: 0.16,
          es_descuento: false,
          orden: 0,
        },
      ]
      const pagos: HonorariosPago[] = [
        {
          id: '1',
          cuenta_id: 'c1',
          folio_recibo: 'REC-2026-0001',
          monto: 15000,
          fecha_pago: '2026-09-17',
          metodo_pago: 'transferencia_spei',
          concepto: 'Anticipo',
        },
      ]
      const ordenesPago = [
        {
          folio: 'ORD-2026-0001',
          dependencia: 'RPP',
          concepto: 'Inscripción RPP',
          monto: 8500,
          estado: 'pagado',
        },
        {
          folio: 'ORD-2026-0002',
          dependencia: 'Catastro',
          concepto: 'Certificado catastral',
          monto: 1500,
          estado: 'pendiente',
        },
      ]

      const hoja = consolidarHojaLiquidacion({
        escrituraId: 'esc-123',
        instrumento: 48102,
        objeto: 'Compraventa',
        actoNombre: 'Compraventa',
        partidas,
        pagos,
        ordenesPago,
      })

      // Honorarios: 20,000 + 3,200 IVA = 23,200
      expect(hoja.honorarios.total_notaria).toBe(23200)
      // Derechos: 8,500 + 1,500 = 10,000
      expect(hoja.terceros.total_derechos).toBe(10000)
      // Gran total: 23,200 + 10,000 = 33,200
      expect(hoja.balance.gran_total_tramite).toBe(33200)
      // Pagos recibidos: 15,000
      expect(hoja.balance.total_recibido).toBe(15000)
      // Saldo neto: 33,200 - 15,000 = 18,200
      expect(hoja.balance.saldo_neto_pendiente).toBe(18200)
      expect(hoja.balance.estatus_general).toBe('pendiente')
    })
  })

  describe('evaluarAlertaEfectivo', () => {
    it('detecta pagos en efectivo y activa alertas según umbrales', () => {
      const resSinEfectivo = evaluarAlertaEfectivo([
        {
          id: '1',
          cuenta_id: 'c1',
          folio_recibo: 'REC-1',
          monto: 50000,
          fecha_pago: '2026-09-17',
          metodo_pago: 'transferencia_spei',
          concepto: 'SPEI',
        },
      ])
      expect(resSinEfectivo.tieneEfectivo).toBe(false)
      expect(resSinEfectivo.superaAlerta).toBe(false)

      const resEfectivoNormal = evaluarAlertaEfectivo([
        {
          id: '2',
          cuenta_id: 'c1',
          folio_recibo: 'REC-2',
          monto: 20000,
          fecha_pago: '2026-09-17',
          metodo_pago: 'efectivo',
          concepto: 'Efectivo ventanilla',
        },
      ])
      expect(resEfectivoNormal.tieneEfectivo).toBe(true)
      expect(resEfectivoNormal.superaAlerta).toBe(false)

      const resEfectivoPreventivo = evaluarAlertaEfectivo([
        {
          id: '3',
          cuenta_id: 'c1',
          folio_recibo: 'REC-3',
          monto: 120000,
          fecha_pago: '2026-09-17',
          metodo_pago: 'efectivo',
          concepto: 'Efectivo alto',
        },
      ])
      expect(resEfectivoPreventivo.tieneEfectivo).toBe(true)
      expect(resEfectivoPreventivo.superaAlerta).toBe(true)
    })
  })
})
