import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import OrdenPagoLiquidarModal from '~/components/ordenesPago/OrdenPagoLiquidarModal.vue'
import { createTestVuetify } from '../../test-utils'
import type { OrdenPago } from '~/types/ordenesPago'

const mockSubirDocumento = vi.fn().mockResolvedValue({ id: 'doc-uploaded-123' })

vi.mock('~/composables/useExpedienteDocumentos', () => ({
  useExpedienteDocumentos: () => ({
    subirDocumento: mockSubirDocumento,
  }),
}))

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: vi.fn(),
    storage: { from: vi.fn() },
  }),
}))

describe('OrdenPagoLiquidarModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  const mockOrden: OrdenPago = {
    id: 'ord-1',
    folio: 'ORD-2026-0001',
    escritura_id: 'esc-123',
    dependencia_id: 'dep-1',
    concepto: 'Derechos de Inscripción RPP',
    monto: 18450,
    estado: 'pendiente',
    linea_captura: '08264918237461298471',
    fecha_emision_linea: '2026-09-16',
    fecha_vencimiento_linea: '2026-09-25',
    quien_cubre: 'adquirente',
    created_at: '2026-09-16T10:00:00Z',
    updated_at: '2026-09-16T10:00:00Z',
    dependencia: { id: 'dep-1', sigla: 'RPP', nombre: 'Registro Público' },
  }

  it('renderiza la información de la orden a liquidar', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenPagoLiquidarModal, {
      props: {
        modelValue: true,
        orden: mockOrden,
        escrituraId: 'esc-123',
      },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('Asentar Pago Bancario — ORD-2026-0001')
    expect(bodyText).toContain('Derechos de Inscripción RPP')
    expect(bodyText).toContain('18,450.00')
    expect(bodyText).toContain('08264918237461298471')
    wrapper.unmount()
  })

  it('muestra error si no se ingresa la clave de rastreo SPEI / folio bancario', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenPagoLiquidarModal, {
      props: {
        modelValue: true,
        orden: mockOrden,
        escrituraId: 'esc-123',
      },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = Array.from(document.body.querySelectorAll('button'))
    const btnConfirmar = buttons.find((b) => b.textContent?.includes('Confirmar Liquidación'))
    expect(btnConfirmar).toBeDefined()
    btnConfirmar!.click()
    await flushPromises()

    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('La clave de rastreo SPEI o folio de autorización es obligatoria')
    expect(wrapper.emitted('liquidado')).toBeUndefined()
    wrapper.unmount()
  })

  it('emite liquidado cuando los datos son válidos', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenPagoLiquidarModal, {
      props: {
        modelValue: true,
        orden: mockOrden,
        escrituraId: 'esc-123',
      },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    const inputs = Array.from(document.body.querySelectorAll('input'))
    const inputFolio = inputs.find((i) => i.placeholder?.includes('20260916000491823'))
    expect(inputFolio).toBeDefined()
    inputFolio!.value = 'SPEI-2026-99991'
    inputFolio!.dispatchEvent(new Event('input'))
    await flushPromises()

    const buttons = Array.from(document.body.querySelectorAll('button'))
    const btnConfirmar = buttons.find((b) => b.textContent?.includes('Confirmar Liquidación'))
    btnConfirmar!.click()
    await flushPromises()

    expect(wrapper.emitted('liquidado')).toBeDefined()
    const emittedData = wrapper.emitted('liquidado')![0][0] as any
    expect(emittedData.orden_pago_id).toBe('ord-1')
    expect(emittedData.folio_autorizacion_bancaria).toBe('SPEI-2026-99991')
    expect(emittedData.metodo_pago).toBe('transferencia_spei')
    wrapper.unmount()
  })
})
