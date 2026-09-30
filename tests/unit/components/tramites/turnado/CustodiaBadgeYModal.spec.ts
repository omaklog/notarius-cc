import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import CustodiaTramiteBadge from '~/components/tramites/CustodiaTramiteBadge.vue'
import TurnadoTramiteModal from '~/components/tramites/TurnadoTramiteModal.vue'
import { createTestVuetify } from '../../../test-utils'

const mockPersonalDisponible = {
  gestores: [
    { id: 'gestor-uuid-1', nombre: 'Carlos Gestor Notarial' },
    { id: 'gestor-uuid-2', nombre: 'Lucía Gestora' }
  ],
  redactores: [
    { id: 'redactor-uuid-1', nombre: 'Lic. Roberto Redactor' }
  ]
}

const mockTurnarAlGestor = vi.fn().mockResolvedValue('evt-turnado-100')
const mockDevolverPorPrevencion = vi.fn().mockResolvedValue('evt-devolver-100')
const mockSolventarYReturnar = vi.fn().mockResolvedValue('evt-solventar-100')
const mockEntregarConcluido = vi.fn().mockResolvedValue('evt-concluir-100')
const mockObtenerPersonal = vi.fn().mockResolvedValue(mockPersonalDisponible)

vi.mock('~/composables/useTurnadoTramites', () => ({
  useTurnadoTramites: () => ({
    turnando: ref(false),
    cargando: ref(false),
    eventos: ref([]),
    obtenerPersonalDisponible: mockObtenerPersonal,
    turnarAlGestor: mockTurnarAlGestor,
    devolverPorPrevencion: mockDevolverPorPrevencion,
    solventarYReturnar: mockSolventarYReturnar,
    entregarConcluido: mockEntregarConcluido,
    cargarHistorial: vi.fn().mockResolvedValue([])
  })
}))

describe('CustodiaTramiteBadge.vue', () => {
  it('renderiza correctamente la custodia en manos del gestor', () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(CustodiaTramiteBadge, {
      props: {
        rolCustodio: 'gestor',
        custodioNombre: 'Carlos Gestor',
        horasEnCustodia: 5,
        compacto: false
      },
      global: { plugins: [vuetify] }
    })

    expect(wrapper.text()).toContain('En manos del Gestor: Carlos Gestor')
    expect(wrapper.text()).toContain('(5h)')
  })

  it('renderiza la custodia en manos del redactor por defecto', () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(CustodiaTramiteBadge, {
      props: {
        rolCustodio: 'redactor',
        custodioNombre: 'Lic. Roberto',
        horasEnCustodia: 52,
        compacto: true
      },
      global: { plugins: [vuetify] }
    })

    expect(wrapper.text()).toContain('Redactor: Lic. Roberto')
    expect(wrapper.text()).toContain('(2d 4h)')
  })

  it('muestra etiqueta de detenido por solventación con prioridad', () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(CustodiaTramiteBadge, {
      props: {
        rolCustodio: 'redactor',
        custodioNombre: 'Lic. Roberto',
        detenidoPorSolventacion: true,
        compacto: false
      },
      global: { plugins: [vuetify] }
    })

    expect(wrapper.text()).toContain('Detenido por Solventación: Lic. Roberto')
  })
})

describe('TurnadoTramiteModal.vue - Turnado Inicial (US1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('abre el modal y muestra el título de turnado al gestor', async () => {
    const vuetify = createTestVuetify()
    mount(TurnadoTramiteModal, {
      props: {
        modelValue: true,
        tramiteId: 'tram-123',
        escrituraId: 'esc-456',
        tramiteNombre: 'Certificado de Libertad de Gravamen',
        accionInicial: 'turnar'
      },
      global: { plugins: [vuetify] },
      attachTo: document.body
    })
    await flushPromises()

    expect(document.body.textContent).toContain('Turnar Trámite al Gestor Notarial')
    expect(document.body.textContent).toContain('Certificado de Libertad de Gravamen')
    expect(document.body.textContent).toContain('Confirmar Turnado al Gestor')
  })

  it('ejecuta turnarAlGestor y emite turnado-exitoso al confirmar', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(TurnadoTramiteModal, {
      props: {
        modelValue: true,
        tramiteId: 'tram-123',
        escrituraId: 'esc-456',
        tramiteNombre: 'Aviso Preventivo',
        accionInicial: 'turnar',
        gestorIdPredeterminado: 'gestor-uuid-1'
      },
      global: { plugins: [vuetify] },
      attachTo: document.body
    })
    await flushPromises()

    const vm = wrapper.vm as any
    vm.destinatarioId = 'gestor-uuid-1'
    vm.instrucciones = 'Ingresar urgente ante RPP'
    await vm.onConfirmar()
    await flushPromises()

    expect(mockTurnarAlGestor).toHaveBeenCalledWith({
      escrituraId: 'esc-456',
      tramiteId: 'tram-123',
      gestorId: 'gestor-uuid-1',
      instrucciones: 'Ingresar urgente ante RPP'
    })

    expect(wrapper.emitted('turnado-exitoso')).toBeTruthy()
    expect(wrapper.emitted('turnado-exitoso')?.[0]).toEqual(['evt-turnado-100'])
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('cierra el modal al pulsar Cancelar', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(TurnadoTramiteModal, {
      props: {
        modelValue: true,
        tramiteId: 'tram-123',
        escrituraId: 'esc-456',
        accionInicial: 'turnar'
      },
      global: { plugins: [vuetify] },
      attachTo: document.body
    })
    await flushPromises()

    const cancelarBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar'
    )
    expect(cancelarBtn).toBeDefined()
    cancelarBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
