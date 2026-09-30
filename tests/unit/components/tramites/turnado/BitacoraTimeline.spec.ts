import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import BitacoraTurnadoTimeline from '~/components/tramites/BitacoraTurnadoTimeline.vue'
import BitacoraTurnadoDrawer from '~/components/tramites/BitacoraTurnadoDrawer.vue'
import { createTestVuetify } from '../../../test-utils'
import type { TurnadoEventoItem } from '~/types/turnado'

const mockEventos: TurnadoEventoItem[] = [
  {
    id: 'evt-1',
    tramite_id: 'tram-1',
    escritura_id: 'esc-1',
    tipo_evento: 'turnado_a_gestor',
    usuario_origen_id: 'user-redactor-1',
    usuario_origen_nombre: 'Lic. Roberto Redactor',
    rol_origen: 'redactor',
    usuario_destino_id: 'user-gestor-1',
    usuario_destino_nombre: 'Carlos Gestor Notarial',
    rol_destino: 'gestor',
    motivo: 'Turnado inicial con expediente integrado',
    instrucciones: 'Ingresar con copia certificada',
    folio_prevencion: null,
    fecha_limite_solventacion: null,
    documento_soporte_id: null,
    tiempo_custodia_horas: 12,
    created_at: '2026-08-10T10:00:00Z'
  },
  {
    id: 'evt-2',
    tramite_id: 'tram-1',
    escritura_id: 'esc-1',
    tipo_evento: 'devuelto_a_redactor_prevencion',
    usuario_origen_id: 'user-gestor-1',
    usuario_origen_nombre: 'Carlos Gestor Notarial',
    rol_origen: 'gestor',
    usuario_destino_id: 'user-redactor-1',
    usuario_destino_nombre: 'Lic. Roberto Redactor',
    rol_destino: 'redactor',
    motivo: 'Falta oficio aclaratorio catastral',
    instrucciones: null,
    folio_prevencion: 'PREV-2026-001',
    fecha_limite_solventacion: '2026-08-25',
    documento_soporte_id: null,
    tiempo_custodia_horas: 36,
    created_at: '2026-08-11T16:00:00Z'
  }
]

const mockCargarHistorial = vi.fn().mockResolvedValue(mockEventos)
const mockEventosRef = ref<TurnadoEventoItem[]>(mockEventos)

vi.mock('~/composables/useTurnadoTramites', () => ({
  useTurnadoTramites: () => ({
    turnando: ref(false),
    cargando: ref(false),
    eventos: mockEventosRef,
    obtenerPersonalDisponible: vi.fn(),
    turnarAlGestor: vi.fn(),
    devolverPorPrevencion: vi.fn(),
    solventarYReturnar: vi.fn(),
    entregarConcluido: vi.fn(),
    cargarHistorial: mockCargarHistorial
  })
}))

describe('BitacoraTurnadoTimeline.vue', () => {
  it('muestra mensaje cuando no hay movimientos registrados', () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(BitacoraTurnadoTimeline, {
      props: {
        eventos: [],
        cargando: false
      },
      global: { plugins: [vuetify] }
    })

    expect(wrapper.text()).toContain('Sin movimientos de turnado')
    expect(wrapper.text()).toContain('Aún no se han registrado transferencias de custodia')
  })

  it('renderiza la lista de eventos con emisor, receptor y horas en custodia', () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(BitacoraTurnadoTimeline, {
      props: {
        eventos: mockEventos,
        cargando: false
      },
      global: { plugins: [vuetify] }
    })

    expect(wrapper.text()).toContain('Turnado al Gestor')
    expect(wrapper.text()).toContain('Lic. Roberto Redactor')
    expect(wrapper.text()).toContain('Carlos Gestor Notarial')
    expect(wrapper.text()).toContain('Turnado inicial con expediente integrado')
    expect(wrapper.text()).toContain('Ingresar con copia certificada')
    expect(wrapper.text()).toContain('12.0 hrs en custodia previa')

    expect(wrapper.text()).toContain('Devuelto por Prevención')
    expect(wrapper.text()).toContain('Falta oficio aclaratorio catastral')
    expect(wrapper.text()).toContain('1d 12h en custodia previa')
    expect(wrapper.text()).toContain('PREV-2026-001')
  })
})

describe('BitacoraTurnadoDrawer.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('abre el drawer y llama a cargarHistorial con los IDs provistos', async () => {
    const vuetify = createTestVuetify()
    mount(BitacoraTurnadoDrawer, {
      props: {
        modelValue: true,
        tramiteId: 'tram-1',
        escrituraId: 'esc-1',
        tramiteNombre: 'Inscripción Definitiva RPP',
        custodioActualNombre: 'Carlos Gestor Notarial'
      },
      global: { plugins: [vuetify] },
      attachTo: document.body
    })
    await flushPromises()

    expect(document.body.textContent).toContain('Bitácora y Cadena de Custodia')
    expect(document.body.textContent).toContain('Inscripción Definitiva RPP')
    expect(document.body.textContent).toContain('Carlos Gestor Notarial')
    expect(mockCargarHistorial).toHaveBeenCalledWith('tram-1', 'esc-1')
  })

  it('emite update:modelValue false al pulsar Cerrar', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(BitacoraTurnadoDrawer, {
      props: {
        modelValue: true,
        tramiteId: 'tram-1',
        escrituraId: 'esc-1'
      },
      global: { plugins: [vuetify] },
      attachTo: document.body
    })
    await flushPromises()

    const cerrarBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cerrar'
    )
    expect(cerrarBtn).toBeDefined()
    cerrarBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
