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

const mockDevolverPorPrevencion = vi.fn().mockResolvedValue('evt-devolver-200')
const mockSolventarYReturnar = vi.fn().mockResolvedValue('evt-solventar-200')
const mockObtenerPersonal = vi.fn().mockResolvedValue(mockPersonalDisponible)

vi.mock('~/composables/useTurnadoTramites', () => ({
  useTurnadoTramites: () => ({
    turnando: ref(false),
    cargando: ref(false),
    eventos: ref([]),
    obtenerPersonalDisponible: mockObtenerPersonal,
    turnarAlGestor: vi.fn(),
    devolverPorPrevencion: mockDevolverPorPrevencion,
    solventarYReturnar: mockSolventarYReturnar,
    entregarConcluido: vi.fn(),
    cargarHistorial: vi.fn().mockResolvedValue([])
  })
}))

describe('TurnadoTramiteModal.vue - Devolución por Prevención y Solventación (US2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('abre el modal en modo devolución con título y campos de prevención', async () => {
    const vuetify = createTestVuetify()
    mount(TurnadoTramiteModal, {
      props: {
        modelValue: true,
        tramiteId: 'tram-prev-1',
        escrituraId: 'esc-456',
        tramiteNombre: 'Inscripción RPP',
        accionInicial: 'devolver',
        redactorIdPredeterminado: 'redactor-uuid-1'
      },
      global: { plugins: [vuetify] },
      attachTo: document.body
    })
    await flushPromises()

    expect(document.body.textContent).toContain('Devolver Trámite por Solventación / Prevención')
    expect(document.body.textContent).toContain('Devolver para Solventación')
    expect(document.body.textContent).toContain('Motivo Detallado de la Prevención')
  })

  it('ejecuta devolverPorPrevencion correctamente al confirmar la prevención', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(TurnadoTramiteModal, {
      props: {
        modelValue: true,
        tramiteId: 'tram-prev-1',
        escrituraId: 'esc-456',
        tramiteNombre: 'Inscripción RPP',
        accionInicial: 'devolver',
        redactorIdPredeterminado: 'redactor-uuid-1'
      },
      global: { plugins: [vuetify] },
      attachTo: document.body
    })
    await flushPromises()

    const vm = wrapper.vm as any
    vm.destinatarioId = 'redactor-uuid-1'
    vm.motivo = 'Falta certificación de medidas y colindancias por perito'
    vm.folioPrevencion = 'PREV-RPP-2026-09'
    vm.fechaLimite = '2026-10-15'
    await vm.onConfirmar()
    await flushPromises()

    expect(mockDevolverPorPrevencion).toHaveBeenCalledWith({
      escrituraId: 'esc-456',
      tramiteId: 'tram-prev-1',
      redactorId: 'redactor-uuid-1',
      motivo: 'Falta certificación de medidas y colindancias por perito',
      folioPrevencion: 'PREV-RPP-2026-09',
      fechaLimite: '2026-10-15'
    })

    expect(wrapper.emitted('turnado-exitoso')).toBeTruthy()
    expect(wrapper.emitted('turnado-exitoso')?.[0]).toEqual(['evt-devolver-200'])
  })

  it('abre el modal en modo solventar y re-turnar al gestor', async () => {
    const vuetify = createTestVuetify()
    mount(TurnadoTramiteModal, {
      props: {
        modelValue: true,
        tramiteId: 'tram-prev-1',
        escrituraId: 'esc-456',
        tramiteNombre: 'Inscripción RPP',
        accionInicial: 'solventar',
        gestorIdPredeterminado: 'gestor-uuid-1'
      },
      global: { plugins: [vuetify] },
      attachTo: document.body
    })
    await flushPromises()

    expect(document.body.textContent).toContain('Solventar Observación y Re-turnar al Gestor')
    expect(document.body.textContent).toContain('Marcar Solventado y Re-turnar')
  })

  it('ejecuta solventarYReturnar al confirmar la subsanación de la prevención', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(TurnadoTramiteModal, {
      props: {
        modelValue: true,
        tramiteId: 'tram-prev-1',
        escrituraId: 'esc-456',
        tramiteNombre: 'Inscripción RPP',
        accionInicial: 'solventar',
        gestorIdPredeterminado: 'gestor-uuid-1'
      },
      global: { plugins: [vuetify] },
      attachTo: document.body
    })
    await flushPromises()

    const vm = wrapper.vm as any
    vm.destinatarioId = 'gestor-uuid-1'
    vm.motivo = 'Se anexa plano pericial corregido y sellado'
    vm.instrucciones = 'Reingresar en ventanilla de aclaraciones'
    await vm.onConfirmar()
    await flushPromises()

    expect(mockSolventarYReturnar).toHaveBeenCalledWith({
      escrituraId: 'esc-456',
      tramiteId: 'tram-prev-1',
      gestorId: 'gestor-uuid-1',
      motivo: 'Se anexa plano pericial corregido y sellado',
      instrucciones: 'Reingresar en ventanilla de aclaraciones'
    })

    expect(wrapper.emitted('turnado-exitoso')).toBeTruthy()
    expect(wrapper.emitted('turnado-exitoso')?.[0]).toEqual(['evt-solventar-200'])
  })
})
