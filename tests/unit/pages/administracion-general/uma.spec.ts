import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestVuetify } from '../../test-utils'

// definePageMeta es un macro de compilación de Nuxt, se define en globalThis para Vitest puro
;(globalThis as any).definePageMeta = vi.fn()

const mockFrom = vi.fn()

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: mockFrom,
  }),
  definePageMeta: vi.fn(),
}))

const mockFetch = vi.fn()
;(globalThis as any).$fetch = mockFetch

// Import page component after global definePageMeta is defined
const UmaPageModule = await import('@/pages/administracion-general/uma.vue')
const UmaPage = UmaPageModule.default

describe('administracion-general/uma.vue', () => {
  const vuetify = createTestVuetify()

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'uma-2025',
              valor: 113.14,
              fecha_inicio_vigencia: '2025-02-01',
              fecha_fin_vigencia: null,
              fuente: 'DOF / INEGI',
              notas: null,
            },
          ],
          error: null,
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'uma-2026', valor: 117.31 },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'uma-2025', valor: 113.14 },
              error: null,
            }),
          }),
        }),
      }),
    })
  })

  it('renderiza el título, las tarjetas de UMA diaria/mensual/anual y el umbral SAT de 16,050 UMAs', async () => {
    const wrapper = mount(UmaPage, {
      attachTo: document.body,
      global: {
        plugins: [vuetify],
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Valores y Vigencias de la UMA')
    expect(wrapper.text()).toContain('UMA DIARIA VIGENTE')
    expect(wrapper.text()).toContain('113.14')
    expect(wrapper.text()).toContain('UMA MENSUAL (30.4)')
    expect(wrapper.text()).toContain('UMA ANUAL (365)')
    expect(wrapper.text()).toContain('UMBRAL AVISO SAT (16,050 UMA)')
  })

  it('muestra la alerta preventiva (Opción B) cuando no se ha actualizado para el año en curso', async () => {
    const wrapper = mount(UmaPage, {
      attachTo: document.body,
      global: {
        plugins: [vuetify],
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()

    const anioActual = new Date().getFullYear()
    expect(wrapper.text()).toContain(`¡Atención! Valor de la UMA para el ejercicio ${anioActual} pendiente de confirmación`)
    expect(wrapper.text()).toContain('Confirmar que no cambió')
    expect(wrapper.text()).toContain('Consultar INEGI en línea')
  })

  it('muestra las opciones oficiales de fallback cuando falla la consulta al INEGI (Opción C)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Servicio no disponible'))

    const wrapper = mount(UmaPage, {
      attachTo: document.body,
      global: {
        plugins: [vuetify],
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()

    // Abrir consulta INEGI
    const btnConsultar = wrapper.findAll('button').find(b => b.text().includes('Consultar INEGI'))
    expect(btnConsultar).toBeDefined()
    await btnConsultar?.trigger('click')
    await flushPromises()

    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('No se pudo obtener el dato automáticamente')
    expect(bodyText).toContain('INEGI - Unidad de Medida y Actualización')
    expect(bodyText).toContain('Diario Oficial de la Federación (DOF)')
  })
})
