import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import TramitesDashboard from '~/pages/tramites/index.vue'
import { createTestVuetify } from '../../test-utils'
import type { TramiteResumen, DependenciaOficial } from '~/types/tramites'

const mockTramites = ref<TramiteResumen[]>([])
const mockDependencias = ref<DependenciaOficial[]>([
  {
    id: 'dep-1',
    sigla: 'RPP',
    nombre: 'Registro Público',
    dias_habiles_compromiso: 15,
    activo: true,
    created_at: '2026-09-16',
    updated_at: '2026-09-16'
  }
])
const mockCargarCatalogos = vi.fn().mockResolvedValue(undefined)
const mockCargarTodosTramites = vi.fn().mockImplementation(() => Promise.resolve(mockTramites.value))

vi.mock('~/composables/useTramites', () => ({
  useTramites: () => ({
    tramites: mockTramites,
    dependencias: mockDependencias,
    tiposTramite: ref([]),
    cargando: ref(false),
    cargarCatalogos: mockCargarCatalogos,
    cargarTodosTramites: mockCargarTodosTramites
  })
}))

describe('TramitesDashboard (/tramites/index.vue)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    mockTramites.value = [
      {
        id: 'tra-1',
        escritura_id: 'esc-1',
        tipo_tramite_id: 'tip-1',
        dependencia_id: 'dep-1',
        tipo_tramite_nombre: 'Certificado de Gravámenes',
        dependencia_sigla: 'RPP',
        escritura_instrumento: '48102',
        escritura_expediente: 'EXP-2026-01',
        acto_nombre: 'Compraventa',
        fase: 'previo',
        estado: 'ingresado_dependencia',
        folio_dependencia: 'VOL-98124',
        fecha_solicitud: '2026-09-16',
        fecha_ingreso: '2026-09-16',
        fecha_limite_estimada: '2026-10-05',
        created_at: '2026-09-16T10:00:00Z',
        updated_at: '2026-09-16T10:00:00Z'
      }
    ]
  })

  it('renderiza el encabezado institucional y las tarjetas KPI', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(TramitesDashboard, {
      global: {
        plugins: [vuetify],
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>'
          }
        }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Trámites Notariales y Términos Oficiales')
    expect(wrapper.text()).toContain('Total de Trámites')
    expect(wrapper.text()).toContain('En Plazo Normal')
    expect(wrapper.text()).toContain('Próximos a Vencer')
    expect(wrapper.text()).toContain('Vencidos / Prevenidos')
  })

  it('despliega los trámites en la tabla general con enlace al instrumento', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(TramitesDashboard, {
      global: {
        plugins: [vuetify],
        stubs: {
          NuxtLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Instrumento 48102')
    expect(wrapper.text()).toContain('VOL-98124')
    expect(wrapper.text()).toContain('Certificado de Gravámenes')
    expect(wrapper.text()).toContain('RPP')
  })

  it('permite filtrar al hacer clic en una tarjeta de semáforo', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(TramitesDashboard, {
      global: {
        plugins: [vuetify],
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>'
          }
        }
      }
    })
    await flushPromises()

    // Buscar tarjeta de "Vencidos / Prevenidos"
    const kpis = wrapper.findAll('.kpi-card')
    expect(kpis.length).toBe(4)

    // Click en la tarjeta de Vencidos (índice 3)
    await kpis[3].trigger('click')
    await flushPromises()

    expect(mockCargarTodosTramites).toHaveBeenCalled()
  })
})
