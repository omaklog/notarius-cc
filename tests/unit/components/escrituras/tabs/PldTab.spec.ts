import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createTestVuetify } from '../../../test-utils'
import PldTab from '@/components/escrituras/tabs/PldTab.vue'
import { usePldStore } from '@/stores/pld'

const mockEscritura = {
  id: 'esc-123',
  instrumento: 48102,
  fecha_celebracion: '2026-09-15',
  acto_juridico_id: 'acto-1',
  actos_juridicos: {
    nombre: 'Compraventa de Inmueble',
    tipo: 'traslativo',
    es_actividad_vulnerable: true,
    fraccion_art17: 'V (Inmuebles)'
  }
}

const mockComparecientesData = [
  {
    id: 'ec-1',
    compareciente_id: 'comp-1',
    rol_id: 'rol-1',
    porcentaje_participacion: 100,
    comparecientes: {
      id: 'comp-1',
      nombre: 'Juan Manuel Morales Domínguez',
      tipo_persona: 'fisica',
      rfc: 'MODJ800101XYZ'
    },
    roles_compareciente: {
      id: 'rol-1',
      nombre: 'Enajenante'
    }
  }
]

const mockEvaluacion = {
  escritura_id: 'esc-123',
  estatus_global: 'aprobado',
  motivos_bloqueo: [],
  monto_operacion: 4500000,
  monto_efectivo: 500000,
  uma_valor_aplicado: 113.14,
  uma_fecha_aplicada: '2026-09-15',
  requiere_aviso: true,
  excede_limite_efectivo: false,
  evaluado_at: '2026-09-15T11:35:18Z'
}

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'escrituras') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockEscritura, error: null })
          }))
        }))
      }
    }
    if (table === 'escritura_comparecientes') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockComparecientesData, error: null })
        }))
      }
    }
    if (table === 'compareciente_beneficiarios_controladores') {
      return {
        select: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
      }
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      }))
    }
  }),
  rpc: vi.fn().mockResolvedValue({ data: mockEvaluacion, error: null })
}

vi.mock('#imports', () => ({
  useSupabaseClient: () => mockSupabase
}))

describe('PldTab.vue', () => {
  let vuetify: ReturnType<typeof createTestVuetify>

  beforeEach(() => {
    setActivePinia(createPinia())
    vuetify = createTestVuetify()
    vi.clearAllMocks()
  })

  it('ensambla el semáforo global, tarjetas de umbrales y tabla de comparecientes', async () => {
    const store = usePldStore()
    store.evaluacionActual = mockEvaluacion as any

    const wrapper = mount(PldTab, {
      props: {
        escrituraId: 'esc-123',
        actoJuridicoId: 'acto-1',
        instrumentoNumero: 48102
      },
      global: {
        plugins: [vuetify]
      }
    })

    await flushPromises()

    // 1. Semáforo Global
    expect(wrapper.text()).toContain('ESTADO GLOBAL: VERIFICADO — CUMPLIMIENTO SATISFECHO')
    // 2. Tarjetas de Umbrales
    expect(wrapper.text()).toContain('Cálculo Económico LFPIORPI')
    expect(wrapper.text()).toContain('Dictamen de Avisos SAT / UIF')
    expect(wrapper.text()).toContain('Control de Efectivo (Restricción)')
    // 3. Tabla de Comparecientes
    expect(wrapper.text()).toContain('Otorgantes y Screening de Listas de Restricción')
    expect(wrapper.text()).toContain('Juan Manuel Morales Domínguez')
  })
})
