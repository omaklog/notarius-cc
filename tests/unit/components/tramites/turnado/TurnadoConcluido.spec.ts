import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import TurnadoTramiteModal from '~/components/tramites/TurnadoTramiteModal.vue'
import { createTestVuetify } from '../../../test-utils'

const mockPersonalDisponible = {
  gestores: [
    { id: 'gestor-uuid-1', nombre: 'Carlos Gestor Notarial' }
  ],
  redactores: [
    { id: 'redactor-uuid-1', nombre: 'Lic. Roberto Redactor' }
  ]
}

const mockEntregarConcluido = vi.fn().mockResolvedValue('evt-concluir-300')
const mockObtenerPersonal = vi.fn().mockResolvedValue(mockPersonalDisponible)

vi.mock('~/composables/useTurnadoTramites', () => ({
  useTurnadoTramites: () => ({
    turnando: ref(false),
    cargando: ref(false),
    eventos: ref([]),
    obtenerPersonalDisponible: mockObtenerPersonal,
    turnarAlGestor: vi.fn(),
    devolverPorPrevencion: vi.fn(),
    solventarYReturnar: vi.fn(),
    entregarConcluido: mockEntregarConcluido,
    cargarHistorial: vi.fn().mockResolvedValue([])
  })
}))

describe('TurnadoTramiteModal.vue - Entrega de Trámite Concluido al Redactor (US3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('abre el modal en modo concluir con título y botón de éxito', async () => {
    const vuetify = createTestVuetify()
    mount(TurnadoTramiteModal, {
      props: {
        modelValue: true,
        tramiteId: 'tram-concluido-1',
        escrituraId: 'esc-456',
        tramiteNombre: 'Constancia de No Adeudo de Predial',
        accionInicial: 'concluir',
        redactorIdPredeterminado: 'redactor-uuid-1'
      },
      global: { plugins: [vuetify] },
      attachTo: document.body
    })
    await flushPromises()

    expect(document.body.textContent).toContain('Entregar Trámite Concluido al Redactor')
    expect(document.body.textContent).toContain('Confirmar Entrega Concluida')
    expect(document.body.textContent).toContain('Observaciones de Salida / Entrega')
  })

  it('ejecuta entregarConcluido y emite turnado-exitoso al entregar al redactor', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(TurnadoTramiteModal, {
      props: {
        modelValue: true,
        tramiteId: 'tram-concluido-1',
        escrituraId: 'esc-456',
        tramiteNombre: 'Constancia de No Adeudo de Predial',
        accionInicial: 'concluir',
        redactorIdPredeterminado: 'redactor-uuid-1'
      },
      global: { plugins: [vuetify] },
      attachTo: document.body
    })
    await flushPromises()

    const vm = wrapper.vm as any
    vm.destinatarioId = 'redactor-uuid-1'
    vm.motivo = 'Se entrega constancia física sellada con vigencia al 31 de diciembre'
    await vm.onConfirmar()
    await flushPromises()

    expect(mockEntregarConcluido).toHaveBeenCalledWith({
      escrituraId: 'esc-456',
      tramiteId: 'tram-concluido-1',
      redactorId: 'redactor-uuid-1',
      motivo: 'Se entrega constancia física sellada con vigencia al 31 de diciembre'
    })

    expect(wrapper.emitted('turnado-exitoso')).toBeTruthy()
    expect(wrapper.emitted('turnado-exitoso')?.[0]).toEqual(['evt-concluir-300'])
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
