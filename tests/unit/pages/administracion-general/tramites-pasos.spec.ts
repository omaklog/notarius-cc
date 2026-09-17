import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createTestVuetify } from '../../test-utils'
import type { PasoTramite, DependenciaOficial } from '~/types/tramites'

const mockPasosCatalogo = ref<PasoTramite[]>([
  { id: 1, nombre: 'CAPTURA', orden: 1, dependencia_clave: 0, genera_orden_pago: false, activo: true, created_at: '', updated_at: '' },
  { id: 2, nombre: 'ING. CAT. EST.', orden: 2, dependencia_clave: 1, genera_orden_pago: false, activo: true, created_at: '', updated_at: '' },
  { id: 3, nombre: 'O.P. CAT. EST.', orden: 4, dependencia_clave: 1, genera_orden_pago: true, activo: true, created_at: '', updated_at: '' },
  { id: 8, nombre: 'ORD. DE PAG. R.P.P.', orden: 12, dependencia_clave: 3, genera_orden_pago: true, activo: true, created_at: '', updated_at: '' },
])

const mockDependencias = ref<DependenciaOficial[]>([
  { id: 'dep-0', sigla: 'NOTARIA', nombre: 'Notaría / Gestión Interna', clave_numerica: 0, dias_habiles_compromiso: 5, portal_web: null, activo: true, created_at: '', updated_at: '' },
  { id: 'dep-1', sigla: 'CATASTRO_EST', nombre: 'Dirección de Catastro Estatal', clave_numerica: 1, dias_habiles_compromiso: 10, portal_web: null, activo: true, created_at: '', updated_at: '' },
  { id: 'dep-5', sigla: 'INFONAVIT', nombre: 'INFONAVIT - Créditos y Titulación', clave_numerica: 5, dias_habiles_compromiso: 10, portal_web: null, activo: true, created_at: '', updated_at: '' },
])

const mockCargarPasosCatalogo = vi.fn().mockImplementation(() => Promise.resolve())
const mockCargarCatalogos = vi.fn().mockImplementation(() => Promise.resolve())
const mockGuardarPasoCatalogo = vi.fn().mockResolvedValue({ id: 99 })
const mockEliminarPasoCatalogo = vi.fn().mockResolvedValue(undefined)
const mockGuardarDependencia = vi.fn().mockResolvedValue({ id: 'dep-new' })

vi.mock('~/composables/useTramites', () => ({
  useTramites: () => ({
    pasosCatalogo: mockPasosCatalogo,
    dependencias: mockDependencias,
    cargando: ref(false),
    cargarPasosCatalogo: mockCargarPasosCatalogo,
    cargarCatalogos: mockCargarCatalogos,
    guardarPasoCatalogo: mockGuardarPasoCatalogo,
    eliminarPasoCatalogo: mockEliminarPasoCatalogo,
    guardarDependencia: mockGuardarDependencia,
  }),
}))

;(globalThis as any).definePageMeta = vi.fn()

const TramitesPasosPage = (await import('~/pages/administracion-general/tramites-pasos/index.vue')).default

describe('Administración General - Catálogo de Tramites y Pasos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  function mountPage() {
    const vuetify = createTestVuetify()
    return mount(TramitesPasosPage, {
      attachTo: document.body,
      global: {
        plugins: [vuetify],
        stubs: {
          'router-link': {
            template: '<a><slot /></a>',
          },
        },
      },
    })
  }

  it('renderiza la vista con pestañas de Pasos y Dependencias y carga los catálogos al montar', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(mockCargarPasosCatalogo).toHaveBeenCalled()
    expect(mockCargarCatalogos).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Catálogo de Dependencias y Pasos de Gestoría')
    expect(wrapper.text()).toContain('Pasos de Gestoría (4)')
    expect(wrapper.text()).toContain('Dependencias Oficiales (3)')
  })

  it('muestra la lista de pasos con su orden, nombre y chip de O.P.', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('CAPTURA')
    expect(wrapper.text()).toContain('ING. CAT. EST.')
    expect(wrapper.text()).toContain('O.P. CAT. EST.')
    expect(wrapper.text()).toContain('ORD. DE PAG. R.P.P.')
    expect(wrapper.text()).toContain('Genera O.P.')
  })

  it('permite filtrar pasos por término de búsqueda', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const searchField = wrapper.findComponent({ name: 'VTextField' })
    await searchField.vm.$emit('update:modelValue', 'R.P.P')
    await flushPromises()

    expect(wrapper.text()).toContain('ORD. DE PAG. R.P.P.')
    expect(wrapper.text()).not.toContain('ING. CAT. EST.')
  })

  it('abre el modal para crear nuevo paso y permite interactuar con el formulario', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const btnNuevoPaso = wrapper.findAll('button').find((b) => b.text().includes('Nuevo Paso'))
    expect(btnNuevoPaso).toBeDefined()
    await btnNuevoPaso!.trigger('click')
    await flushPromises()

    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('Nuevo Paso de Gestoría')
    expect(bodyText).toContain('Genera Orden de Pago de Derechos')
  })
})
