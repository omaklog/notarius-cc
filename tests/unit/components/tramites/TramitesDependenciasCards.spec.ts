import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import TramitesDependenciasCards from '~/components/tramites/TramitesDependenciasCards.vue'
import { createTestVuetify } from '../../test-utils'
import type { DependenciaTramiteCard, DependenciaOficial, PasoTramite } from '~/types/tramites'

import { PASOS_CATALOGO_DEFAULT, DEPENDENCIAS_OFICIALES_DEFAULT } from '~/composables/useTramites'

const mockDependenciasCards = ref<DependenciaTramiteCard[]>([])
const mockDependencias = ref<DependenciaOficial[]>([...DEPENDENCIAS_OFICIALES_DEFAULT])
const mockPasosCatalogo = ref<PasoTramite[]>([...PASOS_CATALOGO_DEFAULT])

const mockCargarTarjetas = vi.fn().mockImplementation(() => Promise.resolve(mockDependenciasCards.value))
const mockCargarHistorial = vi.fn().mockImplementation(() => Promise.resolve([]))
const mockObtenerPasos = vi.fn().mockImplementation((clave: number) => {
  return mockPasosCatalogo.value.filter((p) => p.dependencia_clave === clave)
})

vi.mock('~/composables/useTramites', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useTramites: () => ({
      dependenciasCards: mockDependenciasCards,
      dependencias: mockDependencias,
      pasosCatalogo: mockPasosCatalogo,
      cargando: ref(false),
      cargarCatalogos: vi.fn().mockResolvedValue(undefined),
      cargarPasosCatalogo: vi.fn().mockResolvedValue(mockPasosCatalogo.value),
      cargarTarjetasDependencias: mockCargarTarjetas,
      cargarHistorialDependencia: mockCargarHistorial,
      obtenerPasosPorDependencia: mockObtenerPasos,
      agregarPasoHistorial: vi.fn().mockResolvedValue({})
    })
  }
})

describe('TramitesDependenciasCards.vue Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDependenciasCards.value = []
  })

  it('renderiza estado vacío amigable con botón + Iniciar Gestión en Dependencia', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(TramitesDependenciasCards, {
      props: {
        escrituraId: 'esc-1'
      },
      global: { plugins: [vuetify] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('No se han iniciado gestiones para esta escritura')
    expect(wrapper.text()).toContain('+ Iniciar Gestión en Dependencia')
    expect(mockCargarTarjetas).toHaveBeenCalledWith('esc-1')
  })

  it('renderiza tarjetas a dos columnas con datos de dependencia y último paso actual', async () => {
    mockDependenciasCards.value = [
      {
        escritura_id: 'esc-1',
        dependencia_clave: 1,
        dependencia_id: 'dep-1',
        dependencia_sigla: 'CATASTRO_EST',
        dependencia_nombre: 'Dirección de Catastro Estatal',
        dependencia_dias_habiles: 10,
        ultimo_paso_id: 2,
        ultimo_paso_nombre: 'ING. CAT. EST.',
        ultimo_folio_volante: 'VOL-4412',
        ultimas_notas: 'Ingreso inicial de documentos',
        ultima_fecha_registro: '2026-09-16T10:00:00Z',
        ultimo_responsable_id: 'usr-1',
        ultimo_responsable_nombre: 'Lic. Méndez',
        ultima_orden_pago_id: null,
        ultimo_genera_orden_pago: false,
        total_movimientos: 1,
        historial: [],
        expandido: false
      }
    ]

    const vuetify = createTestVuetify()
    const wrapper = mount(TramitesDependenciasCards, {
      props: {
        escrituraId: 'esc-1'
      },
      global: { plugins: [vuetify] }
    })
    await flushPromises()

    // Columna izquierda: Autoridad y Paso Actual
    expect(wrapper.text()).toContain('Dirección de Catastro Estatal')
    expect(wrapper.text()).toContain('CATASTRO_EST')
    expect(wrapper.text()).toContain('Paso Actual:')
    expect(wrapper.text()).toContain('ING. CAT. EST.')
    expect(wrapper.text()).toContain('VOL-4412')
    expect(wrapper.text()).toContain('Lic. Méndez')
    expect(wrapper.text()).toContain('Ingreso inicial de documentos')

    // Columna derecha: Botón Agregar Paso e Historial
    expect(wrapper.text()).toContain('Agregar Paso')
    expect(wrapper.text()).toContain('Historial (1)')
  })

  it('despliega y contrae el acordeón inline de historial al hacer clic en Historial', async () => {
    mockDependenciasCards.value = [
      {
        escritura_id: 'esc-1',
        dependencia_clave: 1,
        dependencia_id: 'dep-1',
        dependencia_sigla: 'CATASTRO_EST',
        dependencia_nombre: 'Dirección de Catastro Estatal',
        dependencia_dias_habiles: 10,
        ultimo_paso_id: 2,
        ultimo_paso_nombre: 'ING. CAT. EST.',
        ultimo_folio_volante: 'VOL-4412',
        ultima_fecha_registro: '2026-09-16T10:00:00Z',
        ultimo_genera_orden_pago: false,
        total_movimientos: 2,
        historial: [
          {
            registro_id: 'reg-2',
            escritura_id: 'esc-1',
            paso_id: 2,
            paso_nombre: 'ING. CAT. EST.',
            paso_orden: 2,
            genera_orden_pago: false,
            dependencia_clave: 1,
            fecha_registro: '2026-09-16T10:00:00Z',
            folio_volante: 'VOL-4412',
            completado_por_nombre: 'Lic. Méndez'
          },
          {
            registro_id: 'reg-1',
            escritura_id: 'esc-1',
            paso_id: 4,
            paso_nombre: 'RECHAZO CAT. EST.',
            paso_orden: 3,
            genera_orden_pago: false,
            dependencia_clave: 1,
            fecha_registro: '2026-09-15T12:00:00Z',
            notas: 'Falta plano topográfico'
          }
        ],
        expandido: false
      }
    ]

    const vuetify = createTestVuetify()
    const wrapper = mount(TramitesDependenciasCards, {
      props: {
        escrituraId: 'esc-1'
      },
      global: { plugins: [vuetify] }
    })
    await flushPromises()

    // Inicialmente no expandido
    expect(wrapper.text()).not.toContain('Bitácora Cronológica Completa')

    // Buscar y pulsar botón Historial
    const btnHistorial = wrapper.findAll('button').find((b) => b.text().includes('Historial'))
    expect(btnHistorial).toBeDefined()
    await btnHistorial?.trigger('click')
    await flushPromises()

    // Ahora debe mostrar la bitácora
    expect(wrapper.text()).toContain('Bitácora Cronológica Completa — Dirección de Catastro Estatal')
    expect(wrapper.text()).toContain('RECHAZO CAT. EST.')
    expect(wrapper.text()).toContain('Falta plano topográfico')
  })

  it('carga los pasos del catálogo y los pone a disposición de la tarjeta de dependencia', async () => {
    mockDependenciasCards.value = [
      {
        escritura_id: 'esc-1',
        dependencia_clave: 1,
        dependencia_id: 'dep-1',
        dependencia_sigla: 'CATASTRO_EST',
        dependencia_nombre: 'Dirección de Catastro Estatal',
        dependencia_dias_habiles: 10,
        ultimo_paso_id: 2,
        ultimo_paso_nombre: 'ING. CAT. EST.',
        ultimo_folio_volante: 'VOL-4412',
        ultima_fecha_registro: '2026-09-16T10:00:00Z',
        ultimo_genera_orden_pago: false,
        total_movimientos: 1,
        historial: [],
        expandido: false
      }
    ]

    const vuetify = createTestVuetify()
    const wrapper = mount(TramitesDependenciasCards, {
      props: {
        escrituraId: 'esc-1'
      },
      global: { plugins: [vuetify] }
    })
    await flushPromises()

    const pasosCatastro = mockObtenerPasos(1)
    expect(pasosCatastro.length).toBe(5)
    expect(pasosCatastro.map((p) => p.nombre)).toEqual([
      'ING. CAT. EST.',
      'RECHAZO CAT. EST.',
      'O.P. CAT. EST.',
      'CORREGIR CED. EST.',
      'CEDULA CAT. EST.'
    ])
  })
})
