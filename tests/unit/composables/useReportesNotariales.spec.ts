import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useReportesNotariales } from '~/composables/useReportesNotariales'

const mockEscrituras = [
  {
    id: 'esc-1',
    instrumento: 101,
    anio: 2026,
    volumen: 5,
    estatus: 'protocolizada',
    created_at: '2026-09-01T10:00:00Z',
    fecha_celebracion: '2026-09-15',
    responsable_id: 'user-redactor-1',
    acto_juridico_id: 'acto-compraventa',
    pagina_inicial: 1,
    pagina_final: 10,
    profiles: { id: 'user-redactor-1', nombre: 'Lic. Fernando García' },
    actos_juridicos: { id: 'acto-compraventa', nombre: 'COMPRAVENTA' },
    tramites: [
      { id: 't-1', estatus: 'concluido' },
      { id: 't-2', estatus: 'en_proceso' },
    ],
    escritura_comparecientes: [
      { rol: 'enajenante', comparecientes: { nombre: 'Juan Pérez' } },
      { rol: 'adquiriente', comparecientes: { nombre: 'María López' } },
    ],
  },
  {
    id: 'esc-2',
    instrumento: 102,
    anio: 2026,
    volumen: 5,
    estatus: 'borrador',
    created_at: '2026-09-05T12:00:00Z',
    fecha_celebracion: null,
    responsable_id: 'user-redactor-1',
    acto_juridico_id: 'acto-compraventa',
    pagina_inicial: null,
    pagina_final: null,
    profiles: { id: 'user-redactor-1', nombre: 'Lic. Fernando García' },
    actos_juridicos: { id: 'acto-compraventa', nombre: 'COMPRAVENTA' },
    tramites: [
      { id: 't-3', estatus: 'en_proceso' },
    ],
    escritura_comparecientes: [],
  },
  {
    id: 'esc-3',
    instrumento: 103,
    anio: 2026,
    volumen: 6,
    estatus: 'anulada',
    created_at: '2026-09-10T15:00:00Z',
    fecha_celebracion: null,
    responsable_id: 'user-redactor-2',
    acto_juridico_id: 'acto-donacion',
    pagina_inicial: 21,
    pagina_final: 25,
    profiles: { id: 'user-redactor-2', nombre: 'Lic. Sofía Morales' },
    actos_juridicos: { id: 'acto-donacion', nombre: 'DONACION' },
    tramites: [],
    escritura_comparecientes: [],
  },
]

const mockFrom = vi.fn()

function createBuilder(data: any) {
  const p: any = Promise.resolve({ data, error: null })
  p.select = vi.fn().mockReturnValue(p)
  p.order = vi.fn().mockReturnValue(p)
  p.eq = vi.fn().mockReturnValue(p)
  p.update = vi.fn().mockReturnValue(p)
  return p
}

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: mockFrom,
  }),
}))

describe('useReportesNotariales', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockFrom.mockImplementation((table: string) => {
      return createBuilder(mockEscrituras)
    })
  })

  it('inicializa con el periodo del mes actual', () => {
    const { periodo, kpisMes } = useReportesNotariales()
    const hoy = new Date()
    expect(periodo.value.mes).toBe(hoy.getMonth() + 1)
    expect(periodo.value.anio).toBe(hoy.getFullYear())
    expect(kpisMes.value.total_abiertas_mes).toBe(0)
  })

  it('calcula KPIs del mes, distribución de redactores y Top 5 de actos al cargar dashboard', async () => {
    const { periodo, cargarDashboard, kpisMes, cargaRedactores, topActos } = useReportesNotariales()

    periodo.value = { mes: 9, anio: 2026 }
    await cargarDashboard()

    // En septiembre 2026 hay 3 abiertas, 1 firmada en el mes, 1 en trámite (borrador), 1 cancelada
    expect(kpisMes.value.total_abiertas_mes).toBe(3)
    expect(kpisMes.value.total_firmadas_mes).toBe(1)
    expect(kpisMes.value.total_en_tramite).toBe(1)
    expect(kpisMes.value.total_canceladas).toBe(1)

    // Redactor 1 tiene 2 escrituras, Redactor 2 tiene 1
    expect(cargaRedactores.value.length).toBe(2)
    expect(cargaRedactores.value[0].nombre).toBe('Lic. Fernando García')
    expect(cargaRedactores.value[0].cantidad_escrituras).toBe(2)
    expect(cargaRedactores.value[1].nombre).toBe('Lic. Sofía Morales')
    expect(cargaRedactores.value[1].cantidad_escrituras).toBe(1)

    // Top actos: COMPRAVENTA (2), DONACION (1)
    expect(topActos.value.length).toBe(2)
    expect(topActos.value[0].nombre).toBe('COMPRAVENTA')
    expect(topActos.value[0].cantidad).toBe(2)
    expect(topActos.value[1].nombre).toBe('DONACION')
    expect(topActos.value[1].cantidad).toBe(1)
  })

  it('procesa reporte general de escrituras con métricas de trámites de gestoría', async () => {
    const { cargarReporteGeneral, escriturasGeneral, escriturasFiltradasGeneral, filtroEstatusGeneral } = useReportesNotariales()

    await cargarReporteGeneral()

    expect(escriturasGeneral.value.length).toBe(3)
    // esc-1 tiene 1 liberado (concluido) y 1 asignado (en_proceso)
    const esc1 = escriturasGeneral.value.find((e) => e.instrumento === 101)
    expect(esc1).toBeDefined()
    expect(esc1?.tramites_liberados).toBe(1)
    expect(esc1?.tramites_asignados).toBe(1)

    // Filtrar por estatus 'protocolizada'
    filtroEstatusGeneral.value = 'protocolizada'
    expect(escriturasFiltradasGeneral.value.length).toBe(1)
    expect(escriturasFiltradasGeneral.value[0].instrumento).toBe(101)
  })

  it('calcula estado de completitud de foliado por volumen en cargarVolumenes', async () => {
    const { cargarVolumenes, volumenes } = useReportesNotariales()

    await cargarVolumenes()

    // Volumen 5 tiene 2 escrituras: esc-1 con folios (1-10) y esc-2 sin folios (null). Foliado incompleto.
    // Volumen 6 tiene 1 escritura: esc-3 con folios (21-25). Foliado completo.
    const vol5 = volumenes.value.find((v) => v.volumen === 5)
    const vol6 = volumenes.value.find((v) => v.volumen === 6)

    expect(vol5).toBeDefined()
    expect(vol5?.total_escrituras).toBe(2)
    expect(vol5?.escrituras_foliadas).toBe(1)
    expect(vol5?.escrituras_pendientes).toBe(1)
    expect(vol5?.foliado_completo).toBe(false)

    expect(vol6).toBeDefined()
    expect(vol6?.total_escrituras).toBe(1)
    expect(vol6?.escrituras_foliadas).toBe(1)
    expect(vol6?.escrituras_pendientes).toBe(0)
    expect(vol6?.foliado_completo).toBe(true)
  })

  it('valida que la página final no sea menor a la página inicial al actualizar foliado', async () => {
    const { actualizarFoliadoEscritura } = useReportesNotariales()

    await expect(actualizarFoliadoEscritura('esc-1', 20, 15)).rejects.toThrow(
      'La página final no puede ser menor a la página inicial'
    )
  })
})
