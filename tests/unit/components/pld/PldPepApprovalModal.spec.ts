import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createTestVuetify } from '../../test-utils'
import PldPepApprovalModal from '@/components/pld/PldPepApprovalModal.vue'
import { usePldStore } from '@/stores/pld'
import { useAuthStore } from '@/stores/auth.store'

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn()
}

vi.mock('#imports', () => ({
  useSupabaseClient: () => mockSupabase
}))

describe('PldPepApprovalModal.vue', () => {
  let vuetify: ReturnType<typeof createTestVuetify>

  beforeEach(() => {
    setActivePinia(createPinia())
    vuetify = createTestVuetify()
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('renderiza datos del compareciente y formulario de debida diligencia PEP', async () => {
    mount(PldPepApprovalModal, {
      props: {
        modelValue: true,
        escrituraId: 'esc-123',
        comparecienteId: 'comp-pep',
        comparecienteNombre: 'Fernando Garza Villalobos',
        comparecienteRfc: 'GAVF750912MN1',
        esNotarioTitularOAdmin: true
      },
      global: {
        plugins: [vuetify]
      },
      attachTo: document.body
    })

    await flushPromises()

    const body = document.body.textContent || ''
    expect(body).toContain('Fernando Garza Villalobos')
    expect(body).toContain('GAVF750912MN1')
    expect(body).toContain('Debida Diligencia Reforzada')
    expect(body).toContain('Identificación del Cargo')
    expect(body).toContain('Declaración de Origen y Procedencia')
  })

  it('permite al Notario Titular autorizar la excepción formal', async () => {
    const store = usePldStore()
    store.diligenciasPepMap['comp-pep'] = {
      id: 'dil-1',
      escritura_id: 'esc-123',
      compareciente_id: 'comp-pep',
      condicion_pep: 'pep_directo',
      cargo_publico: 'Subsecretario',
      dependencia: 'Secretaría de Hacienda',
      origen_fondos_declarado: 'Ingresos por actividad profesional',
      aprobado: false
    } as any

    const spyAprobar = vi.spyOn(store, 'aprobarDiligenciaPep').mockResolvedValue({
      id: 'dil-1',
      aprobado: true
    } as any)
    vi.spyOn(store, 'evaluarEscritura').mockResolvedValue({} as any)

    mount(PldPepApprovalModal, {
      props: {
        modelValue: true,
        escrituraId: 'esc-123',
        comparecienteId: 'comp-pep',
        comparecienteNombre: 'Fernando Garza Villalobos',
        esNotarioTitularOAdmin: true
      },
      global: {
        plugins: [vuetify]
      },
      attachTo: document.body
    })

    await flushPromises()

    const btnAprobar = Array.from(document.body.querySelectorAll('button')).find(
      b => b.textContent?.includes('Autorizar Diligencia PEP')
    )
    expect(btnAprobar).toBeDefined()
    btnAprobar?.click()
    await flushPromises()

    expect(spyAprobar).toHaveBeenCalledWith('dil-1', 'comp-pep', expect.any(String))
  })

  it('muestra estado autorizado cuando la diligencia ya fue aprobada', async () => {
    const store = usePldStore()
    store.diligenciasPepMap['comp-pep'] = {
      id: 'dil-1',
      escritura_id: 'esc-123',
      compareciente_id: 'comp-pep',
      condicion_pep: 'pep_directo',
      cargo_publico: 'Subsecretario',
      dependencia: 'Secretaría de Hacienda',
      origen_fondos_declarado: 'Ingresos por actividad profesional',
      aprobado: true,
      aprobado_at: '2026-09-15T11:30:00Z',
      notas_aprobacion: 'Autorizado con fe pública notarial'
    } as any

    mount(PldPepApprovalModal, {
      props: {
        modelValue: true,
        escrituraId: 'esc-123',
        comparecienteId: 'comp-pep',
        comparecienteNombre: 'Fernando Garza Villalobos'
      },
      global: {
        plugins: [vuetify]
      },
      attachTo: document.body
    })

    await flushPromises()

    const body = document.body.textContent || ''
    expect(body).toContain('AUTORIZADO')
    expect(body).toContain('Autorizado con fe pública notarial')
  })
})
