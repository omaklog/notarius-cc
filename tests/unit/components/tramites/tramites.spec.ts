import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  calcularFechaLimiteDiasHabiles,
  calcularDiasHabilesRestantes,
  calcularSemaforoTramite
} from '~/utils/diasHabiles'
import { useTramites } from '~/composables/useTramites'

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: mockFrom,
    rpc: mockRpc
  })
}))

describe('Utilidad de Días Hábiles y Semáforo de Trámites', () => {
  it('calcularFechaLimiteDiasHabiles suma días hábiles excluyendo sábados y domingos', () => {
    // Viernes 2026-09-18 + 1 día hábil -> Lunes 2026-09-21
    const res1 = calcularFechaLimiteDiasHabiles('2026-09-18', 1)
    expect(res1).toBe('2026-09-21')

    // Viernes 2026-09-18 + 5 días hábiles -> Viernes 2026-09-25
    const res5 = calcularFechaLimiteDiasHabiles('2026-09-18', 5)
    expect(res5).toBe('2026-09-25')
  })

  it('calcularDiasHabilesRestantes calcula días hábiles entre dos fechas', () => {
    // De Lunes 2026-09-21 a Jueves 2026-09-24 -> 3 días
    const diff = calcularDiasHabilesRestantes('2026-09-24', '2026-09-21')
    expect(diff).toBe(3)

    // De Viernes a Lunes siguiente -> 1 día hábil
    const diffWeekend = calcularDiasHabilesRestantes('2026-09-21', '2026-09-18')
    expect(diffWeekend).toBe(1)

    // Si la fecha ya venció (negativo)
    const diffVencido = calcularDiasHabilesRestantes('2026-09-18', '2026-09-21')
    expect(diffVencido).toBe(-1)
  })

  it('calcularSemaforoTramite asigna semáforo según estado y días restantes', () => {
    // 1. Concluido favorable -> azul
    expect(calcularSemaforoTramite('2026-09-30', 'concluido_favorable').semaforo).toBe('azul')

    // 2. Cancelado -> gris
    expect(calcularSemaforoTramite('2026-09-30', 'rechazado_cancelado').semaforo).toBe('gris')

    // 3. Prevenido / Observado -> rojo
    expect(calcularSemaforoTramite('2026-09-30', 'prevenido_observado').semaforo).toBe('rojo')

    // 4. Con más de 3 días restantes -> verde
    const hoy = '2026-09-14'
    const semVerde = calcularSemaforoTramite('2026-09-25', 'ingresado_dependencia', hoy)
    expect(semVerde.semaforo).toBe('verde')

    // 5. Con 1 a 3 días restantes -> amarillo
    const semAmarillo = calcularSemaforoTramite('2026-09-16', 'ingresado_dependencia', hoy)
    expect(semAmarillo.semaforo).toBe('amarillo')

    // 6. Vencido -> rojo
    const semRojo = calcularSemaforoTramite('2026-09-10', 'ingresado_dependencia', hoy)
    expect(semRojo.semaforo).toBe('rojo')
  })
})

describe('Composable useTramites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cargarCatalogos consulta dependencias y tipos de trámites activos', async () => {
    const mockDeps = [{ id: 'dep-1', sigla: 'RPP', nombre: 'Registro Público' }]
    const mockTipos = [{ id: 'tip-1', codigo: 'CLG', nombre: 'Certificado de Gravámenes' }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'cat_dependencias_oficiales') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockDeps, error: null })
            })
          })
        }
      }
      if (table === 'cat_tipos_tramite_notarial') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockTipos, error: null })
            })
          })
        }
      }
      return {}
    })

    const { cargarCatalogos, dependencias, tiposTramite } = useTramites()
    await cargarCatalogos()

    expect(dependencias.value).toEqual(mockDeps)
    expect(tiposTramite.value).toEqual(mockTipos)
  })

  it('cargarTramitesEscritura obtiene y enriquece trámites con semáforo', async () => {
    const mockTramites = [
      {
        id: 'tra-1',
        escritura_id: 'esc-1',
        fase: 'previo',
        estado: 'ingresado_dependencia',
        fecha_limite_estimada: '2026-10-15',
        cat_tipos_tramite_notarial: { nombre: 'Certificado de Gravámenes', codigo: 'RPP_CLG' },
        cat_dependencias_oficiales: { sigla: 'RPP', nombre: 'Registro Público' }
      }
    ]

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockTramites, error: null })
        })
      })
    })

    const { cargarTramitesEscritura, tramites } = useTramites()
    const res = await cargarTramitesEscritura('esc-1')

    expect(res.length).toBe(1)
    expect(res[0].tipo_tramite_nombre).toBe('Certificado de Gravámenes')
    expect(res[0].dependencia_sigla).toBe('RPP')
    expect(res[0].semaforo).toBeDefined()
    expect(tramites.value.length).toBe(1)
  })

  it('crearTramite calcula fecha_limite_estimada si hay fecha_ingreso', async () => {
    const payload = {
      escritura_id: 'esc-1',
      tipo_tramite_id: 'tip-1',
      dependencia_id: 'dep-1',
      fase: 'previo' as const,
      fecha_ingreso: '2026-09-18'
    }

    let insertPayloadCaptured: any = null

    mockFrom.mockReturnValue({
      insert: (p: any) => {
        insertPayloadCaptured = p
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'tra-new', ...p }, error: null })
          })
        }
      }
    })

    const { crearTramite } = useTramites()
    const res = await crearTramite(payload)

    expect(res.id).toBe('tra-new')
    expect(insertPayloadCaptured.fecha_limite_estimada).toBeDefined()
  })

  it('cambiarEstadoTramite a concluido_favorable asienta fecha_conclusion', async () => {
    let updatePayloadCaptured: any = null

    mockFrom.mockReturnValue({
      update: (p: any) => {
        updatePayloadCaptured = p
        return {
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'tra-1', ...p }, error: null })
            })
          })
        }
      }
    })

    const { cambiarEstadoTramite } = useTramites()
    await cambiarEstadoTramite('tra-1', 'concluido_favorable')

    expect(updatePayloadCaptured.estado).toBe('concluido_favorable')
    expect(updatePayloadCaptured.fecha_conclusion).toBeDefined()
  })

  it('registrarPrevencion inserta en tramite_prevenciones y actualiza estado a prevenido_observado', async () => {
    const prevencionPayload = {
      folio_prevencion: 'PREV-01',
      motivo_observacion: 'Falta certificado',
      fecha_limite_subsanacion: '2026-10-01'
    }

    let insertedPrevencion: any = null
    let updatedTramiteStatus: any = null

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tramite_prevenciones') {
        return {
          insert: (p: any) => {
            insertedPrevencion = p
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'prev-1', ...p }, error: null })
              })
            }
          }
        }
      }
      if (table === 'tramites_escritura') {
        return {
          update: (p: any) => {
            updatedTramiteStatus = p
            return {
              eq: () => Promise.resolve({ error: null })
            }
          }
        }
      }
      return {}
    })

    const { registrarPrevencion } = useTramites()
    const res = await registrarPrevencion('tra-1', prevencionPayload)

    expect(res.id).toBe('prev-1')
    expect(insertedPrevencion.tramite_id).toBe('tra-1')
    expect(updatedTramiteStatus.estado).toBe('prevenido_observado')
  })

  it('subsanarPrevencion marca subsanado y actualiza estado del trámite', async () => {
    const subsanacionPayload = {
      folio_reingreso: 'REING-99',
      notas_subsanacion: 'Se anexó alineamiento vigente'
    }

    let updatedPrevencion: any = null
    let updatedTramite: any = null

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tramite_prevenciones') {
        return {
          update: (p: any) => {
            updatedPrevencion = p
            return {
              eq: () => ({
                select: () => ({
                  single: () => Promise.resolve({ data: { id: 'prev-1', ...p }, error: null })
                })
              })
            }
          }
        }
      }
      if (table === 'tramites_escritura') {
        return {
          update: (p: any) => {
            updatedTramite = p
            return {
              eq: () => Promise.resolve({ error: null })
            }
          }
        }
      }
      return {}
    })

    const { subsanarPrevencion } = useTramites()
    const res = await subsanarPrevencion('prev-1', 'tra-1', subsanacionPayload)

    expect(res.subsanado).toBe(true)
    expect(updatedPrevencion.subsanado).toBe(true)
    expect(updatedTramite.estado).toBe('subsanado')
    expect(updatedTramite.folio_dependencia).toBe('REING-99')
  })

  it('generarPlantillaTramites invoca RPC fn_generar_tramites_plantilla_acto', async () => {
    mockRpc.mockResolvedValueOnce({ data: 6, error: null })

    const { generarPlantillaTramites } = useTramites()
    const total = await generarPlantillaTramites('esc-1')

    expect(mockRpc).toHaveBeenCalledWith('fn_generar_tramites_plantilla_acto', {
      p_escritura_id: 'esc-1'
    })
    expect(total).toBe(6)
  })

  it('cargarPasosCatalogo carga pasos desde cat_pasos_tramite y los enriquece', async () => {
    const mockDbPasos = [
      { id: 2, nombre: 'ING. CAT. EST.', orden: 2, dependencia_clave: 1, genera_orden_pago: false, activo: true },
      { id: 8, nombre: 'ORD. DE PAG. R.P.P.', orden: 12, dependencia_clave: 3, genera_orden_pago: true, activo: true }
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'cat_pasos_tramite') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: mockDbPasos, error: null })
          })
        }
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null })
          })
        })
      }
    })

    const { cargarPasosCatalogo, pasosCatalogo } = useTramites()
    const pasos = await cargarPasosCatalogo()

    expect(pasos.length).toBe(2)
    expect(pasosCatalogo.value.length).toBe(2)
    expect(pasos[0].nombre).toBe('ING. CAT. EST.')
    expect(pasos[0].dependencia_sigla).toBe('CATASTRO_EST')
    expect(pasos[1].nombre).toBe('ORD. DE PAG. R.P.P.')
    expect(pasos[1].dependencia_sigla).toBe('RPP')
  })

  it('cargarPasosCatalogo activa el fallback canónico de los 17 pasos si la base de datos está vacía', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'cat_pasos_tramite') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: [], error: null })
          })
        }
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null })
          })
        })
      }
    })

    const { cargarPasosCatalogo, pasosCatalogo } = useTramites()
    const pasos = await cargarPasosCatalogo()

    expect(pasos.length).toBe(17)
    expect(pasosCatalogo.value.length).toBe(17)
  })

  it('obtenerPasosPorDependencia distribuye los 17 pasos oficiales correctamente entre las autoridades autorizadas', () => {
    const { obtenerPasosPorDependencia, pasosCatalogo } = useTramites()
    pasosCatalogo.value = [] // Forzar uso del catálogo por omisión

    const pasosNotaria = obtenerPasosPorDependencia(0)
    const pasosCatEstatal = obtenerPasosPorDependencia(1)
    const pasosCatMun = obtenerPasosPorDependencia(2)
    const pasosRPP = obtenerPasosPorDependencia(3)
    const pasosControl = obtenerPasosPorDependencia(4)
    const pasosInfonavit = obtenerPasosPorDependencia(5)

    // Notaría: CAPTURA, PAGO T.D., P.T. FIRMADO Y SELLADO
    expect(pasosNotaria.length).toBe(3)
    expect(pasosNotaria.map((p) => p.nombre)).toEqual(['CAPTURA', 'PAGO T.D.', 'P.T. FIRMADO Y SELLADO'])

    // Catastro Estatal: ING. CAT. EST., RECHAZO CAT. EST., O.P. CAT. EST., CORREGIR CED. EST., CEDULA CAT. EST.
    expect(pasosCatEstatal.length).toBe(5)
    expect(pasosCatEstatal.map((p) => p.nombre)).toEqual([
      'ING. CAT. EST.',
      'RECHAZO CAT. EST.',
      'O.P. CAT. EST.',
      'CORREGIR CED. EST.',
      'CEDULA CAT. EST.'
    ])

    // Catastro Municipal: ING. TRAM. MUN., RECHAZO MUNICIPAL, O.P. MUNICIPAL
    expect(pasosCatMun.length).toBe(3)
    expect(pasosCatMun.map((p) => p.nombre)).toEqual(['ING. TRAM. MUN.', 'RECHAZO MUNICIPAL', 'O.P. MUNICIPAL'])

    // RPP: ORD. DE PAG. R.P.P., INGRESO A R.P.P., RECHAZO R.P.P., REINGRESO A R.P.P
    expect(pasosRPP.length).toBe(4)
    expect(pasosRPP.map((p) => p.nombre)).toEqual([
      'ORD. DE PAG. R.P.P.',
      'INGRESO A R.P.P.',
      'RECHAZO R.P.P.',
      'REINGRESO A R.P.P'
    ])

    // Control Interno: SALIDA DE R.P.P, 1ER TEST AL CLIENTE
    expect(pasosControl.length).toBe(2)
    expect(pasosControl.map((p) => p.nombre)).toEqual(['SALIDA DE R.P.P', '1ER TEST AL CLIENTE'])

    // INFONAVIT sin pasos predeterminados
    expect(pasosInfonavit.length).toBe(0)

    // Total de los 17 pasos
    const totalPasos =
      pasosNotaria.length +
      pasosCatEstatal.length +
      pasosCatMun.length +
      pasosRPP.length +
      pasosControl.length +
      pasosInfonavit.length
    expect(totalPasos).toBe(17)
  })

  it('cargarTarjetasDependencias mapea datos de la vista agregada por autoridad', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v_tramite_dependencias_resumen') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [
                  {
                    escritura_id: 'esc-1',
                    dependencia_clave: 1,
                    dependencia_id: 'dep-cat-est',
                    dependencia_sigla: 'CATASTRO_EST',
                    dependencia_nombre: 'Dirección de Catastro Estatal',
                    dependencia_dias_habiles: 10,
                    ultimo_paso_id: 5,
                    ultimo_paso_nombre: 'CEDULA CAT. EST.',
                    ultimo_folio_volante: 'CAD-98124',
                    ultimas_notas: 'Cédula emitida con sello',
                    ultima_fecha_registro: '2026-09-16T12:00:00Z',
                    ultimo_responsable_id: 'usr-1',
                    ultimo_responsable_nombre: 'Lic. Méndez',
                    ultima_orden_pago_id: null,
                    ultimo_genera_orden_pago: false,
                    total_movimientos: 5
                  }
                ],
                error: null
              })
          })
        }
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null })
          })
        })
      }
    })

    const { cargarTarjetasDependencias } = useTramites()
    const cards = await cargarTarjetasDependencias('esc-1')

    expect(cards.length).toBe(1)
    expect(cards[0].dependencia_clave).toBe(1)
    expect(cards[0].ultimo_paso_nombre).toBe('CEDULA CAT. EST.')
    expect(cards[0].total_movimientos).toBe(5)
    expect(cards[0].ultimo_folio_volante).toBe('CAD-98124')
  })

  it('agregarPasoHistorial inserta evento y actualiza estado de tarjetas', async () => {
    let insertedRow: any = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'tramite_pasos_escritura') {
        return {
          insert: (payload: any) => {
            insertedRow = { id: 'reg-nuevo-1', ...payload }
            return {
              select: () => ({
                single: () => Promise.resolve({ data: insertedRow, error: null })
              })
            }
          },
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null })
            })
          })
        }
      }
      if (table === 'v_tramite_dependencias_resumen') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null })
          })
        }
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null })
        })
      }
    })

    const { agregarPasoHistorial } = useTramites()
    const res = await agregarPasoHistorial({
      escritura_id: 'esc-1',
      paso_id: 2,
      dependencia_clave: 1,
      folio_volante: 'VOL-4412',
      notas: 'Ingreso inicial para cédula'
    })

    expect(res.id).toBe('reg-nuevo-1')
    expect(insertedRow.escritura_id).toBe('esc-1')
    expect(insertedRow.paso_id).toBe(2)
    expect(insertedRow.dependencia_clave).toBe(1)
    expect(insertedRow.folio_volante).toBe('VOL-4412')
    expect(insertedRow.notas).toBe('Ingreso inicial para cédula')
  })

  it('agregarPasoHistorial sanitiza dependencia_id a null si recibe un id no-UUID como "dep-1"', async () => {
    let insertedRow: any = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'tramite_pasos_escritura') {
        return {
          insert: (payload: any) => {
            insertedRow = { id: 'reg-nuevo-2', ...payload }
            return {
              select: () => ({
                single: () => Promise.resolve({ data: insertedRow, error: null })
              })
            }
          },
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null })
            })
          })
        }
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null })
        })
      }
    })

    const { agregarPasoHistorial } = useTramites()
    await agregarPasoHistorial({
      escritura_id: 'bcabd52d-9771-4696-a5f9-95a6cb61df63',
      paso_id: 2,
      dependencia_clave: 1,
      dependencia_id: 'dep-1' as any
    })

    expect(insertedRow.dependencia_id).toBeNull()
    expect(insertedRow.dependencia_clave).toBe(1)
  })

  it('agregarPasoHistorial sincroniza automáticamente con tramites_escritura cuando recibe IDs UUID válidos', async () => {
    let insertedTramite: any = null
    const mockDepUuid = 'a1111111-1111-1111-1111-111111111111'
    const mockEscUuid = 'bcabd52d-9771-4696-a5f9-95a6cb61df63'
    const mockTipoUuid = 'c2222222-2222-2222-2222-222222222222'

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tramite_pasos_escritura') {
        return {
          insert: (payload: any) => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'reg-nuevo-sync', ...payload, dependencia_id: mockDepUuid }, error: null })
            })
          }),
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null })
            })
          })
        }
      }
      if (table === 'tramites_escritura') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => Promise.resolve({ data: [], error: null })
              }),
              order: () => Promise.resolve({ data: [], error: null })
            })
          }),
          insert: (payload: any) => {
            insertedTramite = payload
            return Promise.resolve({ data: { id: 'tra-sync-1', ...payload }, error: null })
          }
        }
      }
      if (table === 'cat_tipos_tramite_notarial') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => Promise.resolve({
                  data: [{ id: mockTipoUuid, fase_default: 'previo', dias_habiles_compromiso: 10 }],
                  error: null
                })
              })
            })
          })
        }
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null })
        })
      }
    })

    const { agregarPasoHistorial } = useTramites()
    await agregarPasoHistorial({
      escritura_id: mockEscUuid,
      paso_id: 2,
      dependencia_clave: 1,
      dependencia_id: mockDepUuid,
      folio_volante: 'VOL-SYNC-100',
      notas: 'Apertura de expediente'
    })

    expect(insertedTramite).toBeDefined()
    expect(insertedTramite.escritura_id).toBe(mockEscUuid)
    expect(insertedTramite.dependencia_id).toBe(mockDepUuid)
    expect(insertedTramite.tipo_tramite_id).toBe(mockTipoUuid)
    expect(insertedTramite.folio_dependencia).toBe('VOL-SYNC-100')
    expect(insertedTramite.estado).toBe('ingresado_dependencia')
  })
})
