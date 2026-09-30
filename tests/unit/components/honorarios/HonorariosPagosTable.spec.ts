import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HonorariosPagosTable from '@/components/honorarios/HonorariosPagosTable.vue'
import { createTestVuetify } from '../../test-utils'
import type { HonorariosPago } from '~/types/honorarios'

describe('HonorariosPagosTable', () => {
  const vuetify = createTestVuetify()

  it('muestra mensaje cuando no hay pagos', () => {
    const wrapper = mount(HonorariosPagosTable, {
      props: { pagos: [] },
      global: { plugins: [vuetify] },
    })

    expect(wrapper.text()).toContain('No hay pagos ni anticipos registrados para esta cuenta')
  })

  it('renderiza la lista de pagos con folio, método y total', () => {
    const pagos: HonorariosPago[] = [
      {
        id: 'p-1',
        cuenta_id: 'c-1',
        folio_recibo: 'REC-2026-0042',
        monto: 15000,
        fecha_pago: '2026-09-17',
        metodo_pago: 'transferencia_spei',
        referencia_bancaria: 'BBVA-8491203',
        concepto: 'Anticipo inicial 50%',
      },
      {
        id: 'p-2',
        cuenta_id: 'c-1',
        folio_recibo: 'REC-2026-0089',
        monto: 10000,
        fecha_pago: '2026-09-18',
        metodo_pago: 'tarjeta_credito_debito',
        referencia_bancaria: 'TPV-99312',
        concepto: 'Pago con tarjeta',
      },
    ]

    const wrapper = mount(HonorariosPagosTable, {
      props: { pagos, puedeRegistrar: true },
      global: { plugins: [vuetify] },
    })

    expect(wrapper.text()).toContain('REC-2026-0042')
    expect(wrapper.text()).toContain('REC-2026-0089')
    expect(wrapper.text()).toContain('BBVA-8491203')
    expect(wrapper.text()).toContain('$ 15,000.00 MXN')
    expect(wrapper.text()).toContain('$ 10,000.00 MXN')
    // Total: 25,000
    expect(wrapper.text()).toContain('$ 25,000.00 MXN')
  })

  it('emite registrarPago al pulsar el botón', async () => {
    const wrapper = mount(HonorariosPagosTable, {
      props: { pagos: [], puedeRegistrar: true },
      global: { plugins: [vuetify] },
    })

    const btn = wrapper.find('button')
    await btn.trigger('click')

    expect(wrapper.emitted('registrarPago')).toBeTruthy()
  })

  it('emite notificarPago al pulsar el botón de notificar en la fila de pago', async () => {
    const pagos: HonorariosPago[] = [
      {
        id: 'p-1',
        cuenta_id: 'c-1',
        folio_recibo: 'REC-2026-0042',
        monto: 15000,
        fecha_pago: '2026-09-17',
        metodo_pago: 'transferencia_spei',
        referencia_bancaria: 'BBVA-8491203',
        concepto: 'Anticipo inicial 50%',
      },
    ]

    const wrapper = mount(HonorariosPagosTable, {
      props: { pagos, puedeRegistrar: true },
      global: { plugins: [vuetify] },
    })

    const btns = wrapper.findAll('button')
    // El botón de notificar es el último botón de la fila
    const btnNotificar = btns.find(b => b.attributes('title')?.includes('Notificar Pago'))
    expect(btnNotificar?.exists()).toBe(true)
    await btnNotificar?.trigger('click')

    expect(wrapper.emitted('notificarPago')).toBeTruthy()
    expect(wrapper.emitted('notificarPago')?.[0]).toEqual([pagos[0]])
  })
})

