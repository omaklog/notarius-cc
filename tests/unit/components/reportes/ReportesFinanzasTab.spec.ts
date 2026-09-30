import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportesFinanzasTab from '@/components/reportes/ReportesFinanzasTab.vue'
import { createTestVuetify } from '../../test-utils'
import type { ResumenFinancieroCobranza } from '~/types/reportes'

describe('ReportesFinanzasTab', () => {
  const vuetify = createTestVuetify()

  const mockFinanzas: ResumenFinancieroCobranza = {
    total_cobrado_mes: 150000,
    total_saldo_pendiente: 35000,
    cuentas_deudoras: [
      {
        cuenta_id: 'c-1',
        escritura_id: 'esc-10',
        instrumento: 1045,
        cliente_nombre: 'Constructora del Caribe S.A.',
        concepto: 'Honorarios por protocolización de régimen en condominio',
        total: 50000,
        pagado: 15000,
        saldo_pendiente: 35000,
      },
    ],
  }

  it('muestra los montos de cobranza y saldo pendiente formateados en moneda', () => {
    const wrapper = mount(ReportesFinanzasTab, {
      global: { plugins: [vuetify] },
      props: {
        finanzas: mockFinanzas,
        cargando: false,
      },
    })

    const text = wrapper.text()
    expect(text).toContain('$150,000')
    expect(text).toContain('$35,000')
    expect(text).toContain('Total Cobrado en Honorarios')
    expect(text).toContain('Saldo Pendiente de Cobranza')

    // Fila deudor
    expect(text).toContain('№ 1045')
    expect(text).toContain('Constructora del Caribe S.A.')
    expect(text).toContain('Honorarios por protocolización de régimen en condominio')
    expect(text).toContain('$50,000')
  })

  it('muestra estado al día si no hay clientes deudores', () => {
    const wrapper = mount(ReportesFinanzasTab, {
      global: { plugins: [vuetify] },
      props: {
        finanzas: {
          total_cobrado_mes: 80000,
          total_saldo_pendiente: 0,
          cuentas_deudoras: [],
        },
        cargando: false,
      },
    })

    expect(wrapper.text()).toContain('Al día en cobranza')
  })

  it('emite refrescar al presionar el botón de actualizar finanzas', async () => {
    const wrapper = mount(ReportesFinanzasTab, {
      global: { plugins: [vuetify] },
      props: {
        finanzas: mockFinanzas,
        cargando: false,
      },
    })

    const btn = wrapper.findAll('button').find((b) => b.text().includes('Actualizar Finanzas'))
    expect(btn).toBeDefined()
    await btn?.trigger('click')

    expect(wrapper.emitted('refrescar')).toBeTruthy()
  })
})
