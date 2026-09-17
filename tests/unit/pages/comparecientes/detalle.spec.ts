import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestVuetify } from '../../test-utils'

const mockFisicaDetail = {
  id: 'comp-1',
  nombre: 'Fernando Garza Villarreal',
  tipo_persona: 'fisica',
  rfc: 'GAVF780412MN8',
  email: 'fernando.garza@example.com',
  telefono: '5512345678',
  activo: true,
  created_at: '2026-07-29T10:00:00Z',
  compareciente_personas_fisicas: {
    nombres: 'Fernando',
    primer_apellido: 'Garza',
    segundo_apellido: 'Villarreal',
    curp: 'GAVF780412HDFRRN01',
    fecha_nacimiento: '1978-04-12',
    genero: 'M',
    pais_nacimiento: 'México',
    nacionalidad: 'Mexicana',
    estado_civil: 'soltero',
    regimen_patrimonial_id: null,
    ocupacion: 'Arquitecto',
    calle: 'Av. Horacio',
    numero_exterior: '1420',
    numero_interior: null,
    colonia: 'Polanco',
    codigo_postal: '11560',
    municipio: 'Miguel Hidalgo',
    entidad_federativa: 'Ciudad de México',
    pais: 'México',
  },
  compareciente_personas_morales: null,
}

const mockEscriturasCompareciente = [
  {
    id: 'ec-1',
    porcentaje_participacion: 50,
    roles_compareciente: { nombre: 'Adquirente / Comprador' },
    escrituras: {
      id: 'esc-1',
      instrumento: 48102,
      anio: 2026,
      estatus: 'protocolizada',
      objeto: 'Compraventa de Inmueble en Polanco',
      fecha_celebracion: '2026-05-14',
      actos_juridicos: { nombre: 'COMPRAVENTA' },
    },
  },
]

const { mockSelectComp, mockSelectEsc, mockSelectReps } = vi.hoisted(() => ({
  mockSelectComp: vi.fn(),
  mockSelectEsc: vi.fn(),
  mockSelectReps: vi.fn(),
}))

vi.mock('#imports', () => ({
  useRoute: () => ({
    params: { id: 'comp-1' },
  }),
  useSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'comparecientes') {
        return {
          select: () => ({
            eq: () => ({
              single: mockSelectComp,
            }),
          }),
        }
      }
      if (table === 'escritura_comparecientes') {
        return {
          select: () => ({
            eq: mockSelectEsc,
          }),
        }
      }
      if (table === 'compareciente_representantes') {
        return {
          select: () => ({
            eq: mockSelectReps,
          }),
        }
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      }
    },
  }),
}))

const ComparecienteDetallePage = (await import('@/pages/comparecientes/[id].vue')).default

function mountPage() {
  const vuetify = createTestVuetify()
  return mount(ComparecienteDetallePage, {
    global: {
      plugins: [vuetify],
      stubs: {
        'router-link': true,
      },
    },
  })
}

describe('Ficha Notarial 360° del Compareciente ([id].vue)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectComp.mockResolvedValue({ data: mockFisicaDetail, error: null })
    mockSelectEsc.mockResolvedValue({ data: mockEscriturasCompareciente, error: null })
    mockSelectReps.mockResolvedValue({ data: [], error: null })
  })

  it('monta la ficha y presenta los datos generales del compareciente', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Fernando Garza Villarreal')
    expect(wrapper.text()).toContain('GAVF780412MN8')
    expect(wrapper.text()).toContain('GAVF780412HDFRRN01')
    expect(wrapper.text()).toContain('Arquitecto')
    expect(wrapper.text()).toContain('Persona Física')
  })

  it('renderiza el historial de escrituras participadas con rol y alícuota', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('#48102')
    expect(wrapper.text()).toContain('COMPRAVENTA')
    expect(wrapper.text()).toContain('Adquirente / Comprador')
    expect(wrapper.text()).toContain('50.00%')
    expect(wrapper.text()).toContain('protocolizada')
  })

  it('calcula las métricas de resumen correctamente', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('ESCRITURAS OTORGADAS')
    expect(wrapper.text()).toContain('ACTO MÁS FRECUENTE')
    expect(wrapper.text()).toContain('COMPRAVENTA')
    expect(wrapper.text()).toContain('ÚLTIMA COMPARECENCIA')
    expect(wrapper.text()).toContain('2026-05-14')
  })
})
