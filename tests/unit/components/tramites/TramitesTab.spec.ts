import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import TramitesTab from '~/components/escrituras/tabs/TramitesTab.vue'
import { createTestVuetify } from '../../test-utils'
import type { TramiteResumen, PasoEscrituraItem } from '~/types/tramites'

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: vi.fn(),
    storage: { from: vi.fn() }
  })
}))

const mockTramites = ref<TramiteResumen[]>([])
const mockPasosEscritura = ref<PasoEscrituraItem[]>([])
const mockCargarTramitesEscritura = vi.fn().mockImplementation(() => Promise.resolve(mockTramites.value))
const mockCargarPasosEscritura = vi.fn().mockImplementation(() => Promise.resolve(mockPasosEscritura.value))
const mockTogglePasoEscritura = vi.fn().mockResolvedValue(undefined)
const mockCambiarEstadoTramite = vi.fn().mockResolvedValue({})
const mockEliminarTramite = vi.fn().mockResolvedValue({})
const mockGenerarPlantillaTramites = vi.fn().mockResolvedValue(5)

const mockDependenciasCards = ref<any[]>([])
const mockCargarTarjetasDependencias = vi.fn().mockImplementation(() => Promise.resolve(mockDependenciasCards.value))

vi.mock('~/composables/useTramites', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useTramites: () => ({
      tramites: mockTramites,
      pasosEscritura: mockPasosEscritura,
      dependenciasCards: mockDependenciasCards,
      pasosCatalogo: ref([...actual.PASOS_CATALOGO_DEFAULT]),
      dependencias: ref([...actual.DEPENDENCIAS_OFICIALES_DEFAULT]),
      tiposTramite: ref([]),
      cargando: ref(false),
      cargarCatalogos: vi.fn().mockResolvedValue(undefined),
      cargarPasosCatalogo: vi.fn().mockResolvedValue(actual.PASOS_CATALOGO_DEFAULT),
      cargarTramitesEscritura: mockCargarTramitesEscritura,
      cargarPasosEscritura: mockCargarPasosEscritura,
      cargarTarjetasDependencias: mockCargarTarjetasDependencias,
      cargarHistorialDependencia: vi.fn().mockResolvedValue([]),
      obtenerPasosPorDependencia: (clave: number) =>
        actual.PASOS_CATALOGO_DEFAULT.filter((p: any) => p.dependencia_clave === clave),
      agregarPasoHistorial: vi.fn().mockResolvedValue({}),
      togglePasoEscritura: mockTogglePasoEscritura,
      cambiarEstadoTramite: mockCambiarEstadoTramite,
      eliminarTramite: mockEliminarTramite,
      generarPlantillaTramites: mockGenerarPlantillaTramites
    })
  }
})

vi.mock('~/composables/useOrdenesPago', () => ({
  useOrdenesPago: () => ({
    dependencias: ref([]),
    cargando: ref(false),
    guardando: ref(false),
    cargarDependencias: vi.fn().mockResolvedValue([]),
    guardarOrden: vi.fn().mockResolvedValue({ id: 'op-1' })
  })
}))

describe('TramitesTab.vue Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    mockTramites.value = []
  })

  it('renderiza la pestaña y muestra mensaje de sin trámites', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(TramitesTab, {
      props: {
        escrituraId: 'esc-1',
        actoJuridicoId: 'acto-1'
      },
      global: { plugins: [vuetify] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Ciclo Procesal del Instrumento Notarial')
    expect(wrapper.text()).toContain('Total Trámites')
    expect(mockCargarTramitesEscritura).toHaveBeenCalledWith('esc-1')
  })

  it('renderiza la lista de trámites con sus folios y dependencias', async () => {
    mockTramites.value = [
      {
        id: 'tra-1',
        escritura_id: 'esc-1',
        tipo_tramite_id: 'tip-1',
        dependencia_id: 'dep-1',
        tipo_tramite_nombre: 'Certificado de Libertad de Gravámenes con 1er Aviso',
        dependencia_sigla: 'RPP',
        fase: 'previo',
        estado: 'ingresado_dependencia',
        folio_dependencia: 'VOL-2026-98124',
        fecha_solicitud: '2026-09-16',
        fecha_ingreso: '2026-09-16',
        fecha_limite_estimada: '2026-10-05',
        created_at: '2026-09-16T10:00:00Z',
        updated_at: '2026-09-16T10:00:00Z'
      }
    ]

    const vuetify = createTestVuetify()
    const wrapper = mount(TramitesTab, {
      props: {
        escrituraId: 'esc-1',
        actoJuridicoId: 'acto-1'
      },
      global: { plugins: [vuetify] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Certificado de Libertad de Gravámenes con 1er Aviso')
    expect(wrapper.text()).toContain('VOL-2026-98124')
    expect(wrapper.text()).toContain('RPP')
  })

  it('permite generar plantilla de trámites sugeridos si la lista está vacía', async () => {
    mockTramites.value = []

    const vuetify = createTestVuetify()
    const wrapper = mount(TramitesTab, {
      props: {
        escrituraId: 'esc-1',
        actoJuridicoId: 'acto-1'
      },
      global: { plugins: [vuetify] }
    })
    await flushPromises()

    const sugerirBtn = wrapper.findAll('button').find((b) => b.text().includes('Sugerir Trámites por Acto'))
    expect(sugerirBtn).toBeDefined()
    if (sugerirBtn) {
      await sugerirBtn.trigger('click')
      await flushPromises()
      expect(mockGenerarPlantillaTramites).toHaveBeenCalledWith('esc-1')
    }
  })
})
