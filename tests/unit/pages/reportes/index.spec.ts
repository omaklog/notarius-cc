import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createTestVuetify } from '../../test-utils'

;(globalThis as any).definePageMeta = vi.fn()

const mockHasPermiso = vi.fn()
vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    hasPermiso: mockHasPermiso,
  }),
}))

const mockCargarDashboard = vi.fn().mockResolvedValue(undefined)
const mockCargarReporteGeneral = vi.fn().mockResolvedValue(undefined)
const mockCargarVolumenes = vi.fn().mockResolvedValue(undefined)
const mockCargarFinanzas = vi.fn().mockResolvedValue(undefined)
const mockSeleccionarVolumen = vi.fn().mockResolvedValue(undefined)
const mockActualizarFoliado = vi.fn().mockResolvedValue(true)
const mockExportarReporteGeneralCSV = vi.fn()
const mockExportarIndiceCSV = vi.fn()

const mockKpisMes = ref({
  total_abiertas_mes: 10,
  total_firmadas_mes: 8,
  total_en_tramite: 5,
  total_canceladas: 1,
})

const mockPeriodo = ref({ mes: 9, anio: 2026 })
const mockVolumenes = ref([
  {
    volumen: 25,
    anio: 2026,
    total_escrituras: 2,
    instrumento_desde: 1001,
    instrumento_hasta: 1002,
    escrituras_foliadas: 2,
    escrituras_pendientes: 0,
    foliado_completo: true,
  },
])

vi.mock('~/composables/useReportesNotariales', () => ({
  useReportesNotariales: () => ({
    periodo: mockPeriodo,
    cargando: ref(false),
    kpisMes: mockKpisMes,
    cargaRedactores: ref([]),
    topActos: ref([]),
    escriturasGeneral: ref([]),
    escriturasFiltradasGeneral: ref([]),
    filtroEstatusGeneral: ref('todas'),
    busquedaGeneral: ref(''),
    cargandoGeneral: ref(false),
    volumenes: mockVolumenes,
    volumenActivo: ref(null),
    escriturasDelVolumen: ref([]),
    cargandoVolumenes: ref(false),
    cargandoDetalleVolumen: ref(false),
    guardandoFoliado: ref(false),
    finanzas: ref({
      total_cobrado_mes: 50000,
      total_saldo_pendiente: 0,
      cuentas_deudoras: [],
    }),
    cargandoFinanzas: ref(false),
    cambiarPeriodo: vi.fn(),
    cargarDashboard: mockCargarDashboard,
    cargarReporteGeneral: mockCargarReporteGeneral,
    exportarReporteGeneralCSV: mockExportarReporteGeneralCSV,
    cargarVolumenes: mockCargarVolumenes,
    seleccionarVolumen: mockSeleccionarVolumen,
    actualizarFoliadoEscritura: mockActualizarFoliado,
    exportarIndiceVolumenCSV: mockExportarIndiceCSV,
    cargarFinanzas: mockCargarFinanzas,
  }),
}))

const PageModule = await import('@/pages/reportes/index.vue')
const ReportesIndex = PageModule.default

describe('pages/reportes/index.vue', () => {
  const vuetify = createTestVuetify()

  beforeEach(() => {
    vi.clearAllMocks()
    mockHasPermiso.mockReturnValue(false)
  })

  it('renderiza el título y las pestañas operativas básicas (sin finanzas si no tiene permiso)', async () => {
    mockHasPermiso.mockReturnValue(false)

    const wrapper = mount(ReportesIndex, {
      global: {
        plugins: [vuetify],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Centro de Reportes Notariales')
    expect(wrapper.text()).toContain('Dashboard Ejecutivo')
    expect(wrapper.text()).toContain('Reporte General de Escrituras')
    expect(wrapper.text()).toContain('Índices por Volumen')
    // Pestaña financiera oculta sin permiso
    expect(wrapper.text()).not.toContain('Finanzas y Honorarios')

    expect(mockCargarDashboard).toHaveBeenCalled()
    expect(mockCargarReporteGeneral).toHaveBeenCalled()
    expect(mockCargarVolumenes).toHaveBeenCalled()
    expect(mockCargarFinanzas).not.toHaveBeenCalled()
  })

  it('renderiza la pestaña de Finanzas y carga datos si el usuario tiene permiso reportes:ver_financieros', async () => {
    mockHasPermiso.mockImplementation((modulo, accion) => {
      return modulo === 'reportes' && accion === 'ver_financieros'
    })

    const wrapper = mount(ReportesIndex, {
      global: {
        plugins: [vuetify],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Finanzas y Honorarios')
    expect(mockCargarFinanzas).toHaveBeenCalled()
  })
})
