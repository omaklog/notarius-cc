import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createTestVuetify } from '../../test-utils'
import PldUmbralesCard from '@/components/pld/PldUmbralesCard.vue'
import { usePldStore } from '@/stores/pld'

const mockSupabase = {
  from: vi.fn(() => ({
    upsert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: {}, error: null })
      })
    })
  })),
  rpc: vi.fn().mockResolvedValue({ data: {}, error: null })
}

vi.mock('#imports', () => ({
  useSupabaseClient: () => mockSupabase
}))

describe('PldUmbralesCard.vue', () => {
  let vuetify: ReturnType<typeof createTestVuetify>

  beforeEach(() => {
    setActivePinia(createPinia())
    vuetify = createTestVuetify()
    vi.clearAllMocks()
  })

  it('calcula y formatea el valor en UMA y dictamen de avisos SAT', async () => {
    const wrapper = mount(PldUmbralesCard, {
      props: {
        escrituraId: 'esc-123',
        montoOperacion: 4500000,
        montoEfectivo: 500000,
        valorUma: 113.14,
        umbralIdentificacionUma: 8025,
        umbralAvisoUma: 16050,
        limiteEfectivoUma: 8025
      },
      global: {
        plugins: [vuetify]
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('$4,500,000.00')
    expect(wrapper.text()).toContain('39,773.73 UMA')
    expect(wrapper.text()).toContain('Sujeto a Aviso Ordinario SAT')
    expect(wrapper.text()).toContain('Cumple Límite de Efectivo')
  })

  it('detecta y muestra alerta roja bloqueante cuando el efectivo supera el límite del Art. 32', async () => {
    const wrapper = mount(PldUmbralesCard, {
      props: {
        escrituraId: 'esc-123',
        montoOperacion: 4500000,
        montoEfectivo: 1000000, // 1M > 8025 * 113.14 = $907,948.50
        valorUma: 113.14,
        limiteEfectivoUma: 8025
      },
      global: {
        plugins: [vuetify]
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Excede Tope de Efectivo (Bloqueante)')
  })

  it('permite abrir edición de monto en efectivo y guardar cambio', async () => {
    const store = usePldStore()
    const spyGuardar = vi.spyOn(store, 'guardarMontoEfectivo').mockResolvedValue({} as any)

    const wrapper = mount(PldUmbralesCard, {
      props: {
        escrituraId: 'esc-123',
        montoOperacion: 4500000,
        montoEfectivo: 300000,
        valorUma: 113.14,
        limiteEfectivoUma: 8025
      },
      global: {
        plugins: [vuetify]
      }
    })

    await flushPromises()

    // Abrir modo edición
    const btnEditar = wrapper.findAll('button').find(b => b.text().includes('Editar'))
    expect(btnEditar).toBeDefined()
    await btnEditar!.trigger('click')
    await flushPromises()

    // Cambiar input a 400000
    const input = wrapper.find('input[type="number"]')
    expect(input.exists()).toBe(true)
    await input.setValue(400000)

    // Guardar
    const btnGuardar = wrapper.findAll('button').find(b => b.text().includes('Guardar'))
    expect(btnGuardar).toBeDefined()
    await btnGuardar!.trigger('click')
    await flushPromises()

    expect(spyGuardar).toHaveBeenCalledWith('esc-123', 400000)
    expect(wrapper.emitted('update:montoEfectivo')).toBeTruthy()
    expect(wrapper.emitted('update:montoEfectivo')![0][0]).toBe(400000)
  })
})
