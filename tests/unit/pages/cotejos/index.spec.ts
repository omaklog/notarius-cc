import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, computed } from 'vue'
import { createTestVuetify } from '../../test-utils'
import IndexPage from '~/pages/cotejos/index.vue'

;(globalThis as any).definePageMeta = vi.fn()

const mockLibroActivo = ref<any>({
  id: 'libro-1',
  numero_libro: 1,
  anio: 2026,
  limite_actas: 200,
  total_actas: 12,
  estatus: 'abierto',
  fecha_apertura: '2026-01-10T10:00:00Z'
})

const mockActas = ref<any[]>([
  {
    id: 'acta-1',
    libro_id: 'libro-1',
    numero_acta: 12,
    anio: 2026,
    fecha_cotejo: new Date().toISOString(),
    solicitante_nombre: 'Ing. Carlos Mendoza',
    solicitante_identificacion: 'INE 1234567890',
    tipo_documento: 'Título Profesional',
    documento_descripcion: 'Título de Médico Cirujano UNAM',
    numero_hojas: 1,
    numero_tantos: 2,
    estatus: 'autorizado'
  },
  {
    id: 'acta-2',
    libro_id: 'libro-1',
    numero_acta: 11,
    anio: 2026,
    fecha_cotejo: new Date().toISOString(),
    solicitante_nombre: 'Lic. Laura Benítez',
    solicitante_identificacion: 'Pasaporte P998877',
    tipo_documento: 'Poder Notarial',
    documento_descripcion: 'Poder General para Pleitos y Cobranzas',
    numero_hojas: 4,
    numero_tantos: 1,
    estatus: 'cancelado',
    motivo_cancelacion: 'Error en fojas'
  }
])

const mockCargarLibros = vi.fn().mockResolvedValue([mockLibroActivo.value])
const mockCargarActas = vi.fn().mockImplementation(async () => mockActas.value)
const mockCancelarActa = vi.fn().mockResolvedValue(true)

vi.mock('~/composables/useCotejos', () => ({
  useCotejos: () => ({
    libros: computed(() => [mockLibroActivo.value]),
    libroActivo: computed(() => mockLibroActivo.value),
    actas: computed(() => mockActas.value),
    cargando: ref(false),
    guardando: ref(false),
    metricas: computed(() => ({
      actasHoy: 2,
      actasAutorizadasLibro: 1,
      totalTantosExpedidos: 2,
      actasCanceladas: 1
    })),
    proximaActaDisponible: computed(() => 13),
    porcentajeUsoLibro: computed(() => 6),
    cargarLibros: mockCargarLibros,
    cargarActas: mockCargarActas,
    cancelarActa: mockCancelarActa,
    generarTextoRazonCotejo: vi.fn().mockReturnValue('TEXTO RAZON MOCK'),
    generarTextoClausuraLibro: vi.fn().mockReturnValue('TEXTO CLAUSURA MOCK')
  })
}))

describe('Pages /cotejos/index.vue', () => {
  let vuetify: ReturnType<typeof createTestVuetify>

  beforeEach(() => {
    vi.clearAllMocks()
    vuetify = createTestVuetify()
  })

  it('renderiza el título institucional y breadcrumbs', async () => {
    const wrapper = mount(IndexPage, {
      global: {
        plugins: [vuetify],
        stubs: {
          CotejoRegistroModal: true,
          CotejoRazonImprimible: true,
          CotejoDetalleModal: true,
          LibroAperturaModal: true,
          LibroCierreModal: true
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Libro de Cotejos y Certificaciones')
    expect(wrapper.text()).toContain('Control cronológico y compulsa de documentos')
  })

  it('muestra la tarjeta del libro activo con su progreso y próxima acta', async () => {
    const wrapper = mount(IndexPage, {
      global: {
        plugins: [vuetify],
        stubs: {
          CotejoRegistroModal: true,
          CotejoRazonImprimible: true,
          CotejoDetalleModal: true,
          LibroAperturaModal: true,
          LibroCierreModal: true
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Libro de Cotejos No. 1')
    expect(wrapper.text()).toContain('12 de 200 actas')
    expect(wrapper.text()).toContain('Próxima Acta: #13')
  })

  it('despliega los 4 KPIs de métricas operativas', async () => {
    const wrapper = mount(IndexPage, {
      global: {
        plugins: [vuetify],
        stubs: {
          CotejoRegistroModal: true,
          CotejoRazonImprimible: true,
          CotejoDetalleModal: true,
          LibroAperturaModal: true,
          LibroCierreModal: true
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Actas Hoy')
    expect(wrapper.text()).toContain('Actas Autorizadas')
    expect(wrapper.text()).toContain('Tantos Expedidos')
    expect(wrapper.text()).toContain('Actas Inutilizadas')
  })

  it('despliega la tabla con las actas de cotejo y chips de estatus', async () => {
    const wrapper = mount(IndexPage, {
      global: {
        plugins: [vuetify],
        stubs: {
          CotejoRegistroModal: true,
          CotejoRazonImprimible: true,
          CotejoDetalleModal: true,
          LibroAperturaModal: true,
          LibroCierreModal: true
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Ing. Carlos Mendoza')
    expect(wrapper.text()).toContain('Título de Médico Cirujano UNAM')
    expect(wrapper.text()).toContain('autorizado')
    expect(wrapper.text()).toContain('Lic. Laura Benítez')
    expect(wrapper.text()).toContain('cancelado')
  })

  it('abre el modal de registro al pulsar + Nuevo Cotejo', async () => {
    const wrapper = mount(IndexPage, {
      global: {
        plugins: [vuetify],
        stubs: {
          CotejoRegistroModal: true,
          CotejoRazonImprimible: true,
          CotejoDetalleModal: true,
          LibroAperturaModal: true,
          LibroCierreModal: true
        }
      }
    })

    await flushPromises()

    const btnNuevo = wrapper.findAll('button').find(b => b.text().includes('Nuevo Cotejo'))
    expect(btnNuevo).toBeDefined()
    await btnNuevo?.trigger('click')

    expect(wrapper.vm.modalRegistro).toBe(true)
  })

  it('abre el modal de impresión al hacer clic en imprimir', async () => {
    const wrapper = mount(IndexPage, {
      global: {
        plugins: [vuetify],
        stubs: {
          CotejoRegistroModal: true,
          CotejoRazonImprimible: true,
          CotejoDetalleModal: true,
          LibroAperturaModal: true,
          LibroCierreModal: true
        }
      }
    })

    await flushPromises()

    wrapper.vm.imprimirRazon(mockActas.value[0])
    expect(wrapper.vm.modalImpresion).toBe(true)
    expect(wrapper.vm.actaSeleccionada?.id).toBe('acta-1')
  })

  it('ejecuta la cancelación justificada de un acta', async () => {
    const wrapper = mount(IndexPage, {
      global: {
        plugins: [vuetify],
        stubs: {
          CotejoRegistroModal: true,
          CotejoRazonImprimible: true,
          CotejoDetalleModal: true,
          LibroAperturaModal: true,
          LibroCierreModal: true
        }
      }
    })

    await flushPromises()

    wrapper.vm.iniciarCancelacion(mockActas.value[0])
    expect(wrapper.vm.modalCancelacion).toBe(true)

    wrapper.vm.motivoCancelacion = 'Error involuntario'
    await wrapper.vm.confirmarCancelacion()

    expect(mockCancelarActa).toHaveBeenCalledWith('acta-1', 'Error involuntario')
    expect(wrapper.vm.modalCancelacion).toBe(false)
  })
})
