import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createTestVuetify } from '../../test-utils'
import PldScreeningModal from '@/components/pld/PldScreeningModal.vue'
import { usePldStore } from '@/stores/pld'

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test.png' }, error: null })
    }))
  }
}

vi.mock('#imports', () => ({
  useSupabaseClient: () => mockSupabase
}))

describe('PldScreeningModal.vue', () => {
  let vuetify: ReturnType<typeof createTestVuetify>

  beforeEach(() => {
    setActivePinia(createPinia())
    vuetify = createTestVuetify()
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('renderiza datos del compareciente y las 4 listas oficiales obligatorias', async () => {
    const store = usePldStore()
    store.listasCatalogo = [
      { id: '1', codigo: 'lpb_uif', nombre: 'LPB', activo: true, orden: 1 },
      { id: '2', codigo: 'ofac_sdn', nombre: 'OFAC', activo: true, orden: 2 },
      { id: '3', codigo: 'onu_cs', nombre: 'ONU', activo: true, orden: 3 },
      { id: '4', codigo: 'sat_69b', nombre: 'SAT 69-B', activo: true, orden: 4 }
    ]

    mount(PldScreeningModal, {
      props: {
        modelValue: true,
        escrituraId: 'esc-123',
        comparecienteId: 'comp-456',
        comparecienteNombre: 'Juan Manuel Morales Domínguez',
        comparecienteRfc: 'MODJ800101XYZ',
        comparecienteRol: 'Enajenante'
      },
      global: {
        plugins: [vuetify]
      },
      attachTo: document.body
    })

    await flushPromises()

    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('Juan Manuel Morales Domínguez')
    expect(bodyText).toContain('MODJ800101XYZ')
    expect(bodyText).toContain('Enajenante')
    expect(bodyText).toContain('Lista de Personas Bloqueadas')
    expect(bodyText).toContain('OFAC')
    expect(bodyText).toContain('ONU')
    expect(bodyText).toContain('SAT — Listado Definitivo')
  })

  it('muestra banner de importación asistida si existe dictamen previo vigente', async () => {
    const store = usePldStore()
    store.screeningPrevioMap['comp-456'] = {
      escritura_id: 'esc-prev',
      instrumento_numero: 89,
      fecha: '2026-09-01',
      dias_antiguedad: 14,
      dias_restantes: 76,
      consultas: []
    }

    mount(PldScreeningModal, {
      props: {
        modelValue: true,
        escrituraId: 'esc-123',
        comparecienteId: 'comp-456',
        comparecienteNombre: 'Juan Manuel Morales Domínguez'
      },
      global: {
        plugins: [vuetify]
      },
      attachTo: document.body
    })

    await flushPromises()

    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('Cotejo previo vigente detectado')
    expect(bodyText).toContain('Instrumento 89')
    expect(bodyText).toContain('hace 14 días')
    expect(bodyText).toContain('Vigente por 76 días más')
  })

  it('valida la obligatoriedad de comprobantes antes de guardar', async () => {
    const store = usePldStore()
    store.listasCatalogo = [
      { id: '1', codigo: 'lpb_uif', nombre: 'LPB', activo: true, orden: 1 }
    ]

    const wrapper = mount(PldScreeningModal, {
      props: {
        modelValue: true,
        escrituraId: 'esc-123',
        comparecienteId: 'comp-456',
        comparecienteNombre: 'Juan Manuel Morales Domínguez'
      },
      global: {
        plugins: [vuetify]
      },
      attachTo: document.body
    })

    await flushPromises()

    // Invocar guardarScreening a través de la vm del componente o buscar el botón en document.body
    const btnGuardar = Array.from(document.body.querySelectorAll('button')).find(
      b => b.textContent?.includes('Certificar y Guardar')
    )
    expect(btnGuardar).toBeDefined()
    btnGuardar?.click()
    await flushPromises()

    expect(document.body.textContent).toContain('Es obligatorio adjuntar la captura de pantalla')
  })
})
