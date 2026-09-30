import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { VApp } from 'vuetify/components'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import { createTestPinia, createTestRouter, createTestVuetify } from '../../test-utils'

const mockConfiguracion = ref<any>({
  id: '00000000-0000-0000-0000-000000000001',
  numero_notaria: 128,
  entidad_federativa: 'Estado de México',
  municipio: 'Metepec',
  logotipo_url: 'https://storage.supabase.co/notaria-identidad/logos/notaria128.png',
})

const mockCargarConfiguracion = vi.fn().mockImplementation(async () => mockConfiguracion.value)

vi.mock('~/composables/useConfiguracionNotarial', () => ({
  useConfiguracionNotarial: () => ({
    configuracion: computed(() => mockConfiguracion.value),
    nombreNotariaCompleto: computed(() => `Notaría Pública No. ${mockConfiguracion.value?.numero_notaria} del ${mockConfiguracion.value?.entidad_federativa}`),
    logotipoUrl: computed(() => mockConfiguracion.value?.logotipo_url || null),
    cargarConfiguracion: mockCargarConfiguracion,
  }),
}))

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({ rpc: vi.fn().mockResolvedValue({ data: [], error: null }) }),
  useSupabaseUser: () => ({ value: null }),
}))

async function mountNavbar() {
  const vuetify = createTestVuetify()
  const pinia = createTestPinia()
  const router = await createTestRouter('/')

  const appWrapper = mount(
    {
      components: { VApp, AppNavbar },
      template: '<v-app><AppNavbar /></v-app>',
    },
    {
      global: {
        plugins: [vuetify, pinia, router],
      },
    },
  )

  return appWrapper.findComponent(AppNavbar)
}

describe('AppNavbar with useConfiguracionNotarial (Identidad Notarial)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfiguracion.value = {
      id: '00000000-0000-0000-0000-000000000001',
      numero_notaria: 128,
      entidad_federativa: 'Estado de México',
      municipio: 'Metepec',
      logotipo_url: 'https://storage.supabase.co/notaria-identidad/logos/notaria128.png',
    }
  })

  it('muestra dinámicamente el nombre institucional y logotipo de la notaría configurada', async () => {
    const wrapper = await mountNavbar()

    expect(wrapper.text()).toContain('Notaría Pública No. 128 del Estado de México')

    const avatar = wrapper.findComponent({ name: 'VAvatar' })
    expect(avatar.exists()).toBe(true)
    expect(avatar.props('image')).toBe('https://storage.supabase.co/notaria-identidad/logos/notaria128.png')
    expect(mockCargarConfiguracion).toHaveBeenCalled()
  })

  it('muestra el icono mdi-domain cuando logotipo_url es nulo', async () => {
    mockConfiguracion.value = {
      id: '00000000-0000-0000-0000-000000000001',
      numero_notaria: 44,
      entidad_federativa: 'Jalisco',
      municipio: 'Guadalajara',
      logotipo_url: null,
    }

    const wrapper = await mountNavbar()

    expect(wrapper.text()).toContain('Notaría Pública No. 44 del Jalisco')
    expect(wrapper.find('.mdi-domain').exists()).toBe(true)
  })
})
