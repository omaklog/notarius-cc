import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HonorariosTab from '@/components/escrituras/tabs/HonorariosTab.vue'
import { createTestVuetify } from '../../test-utils'

const mockFrom = vi.fn()

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: mockFrom,
  }),
}))

describe('HonorariosTab', () => {
  const vuetify = createTestVuetify()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza la pestaña completa con KPIs, partidas, pagos y CFDI', async () => {
    const mockCuenta = {
      id: 'cuenta-abc',
      escritura_id: 'esc-101',
      subtotal_gravado: 25000,
      subtotal_exento: 0,
      descuento_total: 0,
      iva_total: 4000,
      total_cotizado: 29000,
      total_pagado: 15000,
      saldo_pendiente: 14000,
      estatus: 'anticipo_parcial',
      rfc_receptor: 'XAXX010101000',
      razon_social_receptor: 'CLIENTE PRUEBA S.A.',
      estatus_facturacion: 'pendiente',
    }

    const mockPartidas = [
      {
        id: 'p-1',
        cuenta_id: 'cuenta-abc',
        concepto: 'Honorarios notariales matriz',
        monto: 25000,
        aplica_iva: true,
        tasa_iva: 0.16,
        es_descuento: false,
        orden: 0,
      },
    ]

    const mockPagos = [
      {
        id: 'pago-1',
        cuenta_id: 'cuenta-abc',
        folio_recibo: 'REC-2026-0001',
        monto: 15000,
        fecha_pago: '2026-09-17',
        metodo_pago: 'transferencia_spei',
        referencia_bancaria: 'SPEI-88219',
        concepto: 'Anticipo inicial',
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'honorarios_cuentas') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: mockCuenta, error: null }),
            }),
          }),
        }
      }
      if (table === 'escrituras') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  instrumento: 48102,
                  objeto: 'Compraventa',
                  actos_juridicos: { nombre: 'Compraventa' },
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'honorarios_partidas') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: mockPartidas, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'honorarios_pagos') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: mockPagos, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'ordenes_pago') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }
      }
      return {
        select: () => Promise.resolve({ data: null, error: null }),
      }
    })

    const wrapper = mount(HonorariosTab, {
      props: {
        escrituraId: 'esc-101',
        estatusEscritura: 'borrador',
      },
      global: { plugins: [vuetify] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Resumen Financiero del Instrumento')
    expect(wrapper.text()).toContain('Cotización de Honorarios y Gastos Notariales Propios')
    expect(wrapper.text()).toContain('Honorarios notariales matriz')
    expect(wrapper.text()).toContain('Registro de Pagos y Anticipos Recibidos')
    expect(wrapper.text()).toContain('REC-2026-0001')
    expect(wrapper.text()).toContain('Facturación Electrónica CFDI 4.0')
    expect(wrapper.text()).toContain('CLIENTE PRUEBA S.A.')
  })

  it('abre el modal de notificaciones con los datos del pago al accionar onNotificarPago', async () => {
    const wrapper = mount(HonorariosTab, {
      props: {
        escrituraId: 'esc-101',
      },
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    const pagoPrueba = {
      id: 'pago-777',
      cuenta_id: 'cuenta-abc',
      folio_recibo: 'REC-2026-0777',
      monto: 8500,
      fecha_pago: '2026-09-20',
      metodo_pago: 'transferencia_spei' as const,
      concepto: 'Liquidación final de honorarios',
    }

    expect(wrapper.vm.modalNotificarVisible).toBe(false)
    await wrapper.vm.onNotificarPago(pagoPrueba)
    expect(wrapper.vm.modalNotificarVisible).toBe(true)
    expect(wrapper.vm.plantillaCodigoANotificar).toBe('PAGO_LIQUIDADO_WHATSAPP')
    expect(wrapper.vm.variablesNotificar.folio_tramite).toBe('REC-2026-0777')
    expect(wrapper.vm.variablesNotificar.monto).toContain('8,500')
  })
})

