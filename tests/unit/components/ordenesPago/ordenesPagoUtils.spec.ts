import { describe, it, expect } from 'vitest'
import {
  calcularSemaforoLineaCaptura,
  formatearMonedaMXN,
  getSemaforoColor,
  getEstadoOrdenLabel,
  getEstadoOrdenColor,
  getMetodoPagoLabel,
  getQuienCubreLabel,
} from '~/utils/ordenesPagoUtils'

describe('ordenesPagoUtils', () => {
  const refDate = new Date(2026, 8, 16) // 16 de Septiembre 2026

  describe('calcularSemaforoLineaCaptura', () => {
    it('retorna azul cuando el estado es pagado sin importar la fecha', () => {
      const res = calcularSemaforoLineaCaptura('pagado', '2026-09-10', refDate)
      expect(res.semaforo).toBe('azul')
      expect(res.label).toBe('Pagado')
      expect(res.diasRestantes).toBeNull()
    })

    it('retorna gris cuando el estado es cancelado', () => {
      const res = calcularSemaforoLineaCaptura('cancelado', '2026-09-25', refDate)
      expect(res.semaforo).toBe('gris')
      expect(res.label).toBe('Cancelado')
    })

    it('retorna gris cuando no hay fecha de vencimiento', () => {
      const res = calcularSemaforoLineaCaptura('pendiente', null, refDate)
      expect(res.semaforo).toBe('gris')
      expect(res.label).toBe('Sin vigencia')
    })

    it('retorna rojo cuando la fecha venció en días pasados', () => {
      const res = calcularSemaforoLineaCaptura('pendiente', '2026-09-14', refDate)
      expect(res.semaforo).toBe('rojo')
      expect(res.diasRestantes).toBe(-2)
      expect(res.label).toContain('Vencida')
    })

    it('retorna rojo cuando la fecha de vencimiento es hoy mismo', () => {
      const res = calcularSemaforoLineaCaptura('pendiente', '2026-09-16', refDate)
      expect(res.semaforo).toBe('rojo')
      expect(res.diasRestantes).toBe(0)
      expect(res.label).toBe('Vence hoy')
    })

    it('retorna amarillo cuando vencen en 1 a 3 días', () => {
      const res1 = calcularSemaforoLineaCaptura('pendiente', '2026-09-17', refDate)
      expect(res1.semaforo).toBe('amarillo')
      expect(res1.diasRestantes).toBe(1)

      const res3 = calcularSemaforoLineaCaptura('pendiente', '2026-09-19', refDate)
      expect(res3.semaforo).toBe('amarillo')
      expect(res3.diasRestantes).toBe(3)
    })

    it('retorna verde cuando restan más de 3 días para el vencimiento', () => {
      const res = calcularSemaforoLineaCaptura('pendiente', '2026-09-21', refDate)
      expect(res.semaforo).toBe('verde')
      expect(res.diasRestantes).toBe(5)
      expect(res.label).toBe('Vence en 5 d')
    })
  })

  describe('formatearMonedaMXN', () => {
    it('formatea montos numéricos correctamente en pesos mexicanos', () => {
      const formatted = formatearMonedaMXN(18450)
      expect(formatted).toMatch(/18,450\.00/)
    })

    it('maneja 0, null y undefined sin romper', () => {
      expect(formatearMonedaMXN(0)).toMatch(/0\.00/)
      expect(formatearMonedaMXN(null)).toMatch(/0\.00/)
      expect(formatearMonedaMXN(undefined)).toMatch(/0\.00/)
    })
  })

  describe('etiquetas y colores', () => {
    it('asigna colores correctos a cada semáforo', () => {
      expect(getSemaforoColor('verde')).toBe('success')
      expect(getSemaforoColor('amarillo')).toBe('warning')
      expect(getSemaforoColor('rojo')).toBe('error')
      expect(getSemaforoColor('azul')).toBe('info')
      expect(getSemaforoColor('gris')).toBe('grey')
    })

    it('asigna etiquetas legibles a estados de orden', () => {
      expect(getEstadoOrdenLabel('pendiente')).toBe('Pendiente')
      expect(getEstadoOrdenLabel('pagado')).toBe('Pagado')
      expect(getEstadoOrdenColor('pendiente')).toBe('warning')
      expect(getEstadoOrdenColor('pagado')).toBe('success')
    })

    it('asigna etiquetas a métodos de pago y procedencia de fondos', () => {
      expect(getMetodoPagoLabel('transferencia_spei')).toBe('Transferencia SPEI')
      expect(getMetodoPagoLabel('cheque_caja')).toBe('Cheque de Caja')
      expect(getQuienCubreLabel('adquirente')).toBe('Adquirente / Comprador')
      expect(getQuienCubreLabel('notaria_fondo_revolvente')).toBe('Notaría (Fondo Revolvente)')
    })
  })
})
