import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useCotejos } from '~/composables/useCotejos'

const mockLibroRow = {
  id: 'libro-uuid-1',
  numero_libro: 1,
  anio: 2026,
  fecha_apertura: '2026-01-01T00:00:00Z',
  fecha_cierre: null,
  limite_actas: 200,
  total_actas: 5,
  estatus: 'abierto',
  notas: 'Libro inicial'
}

const mockActaRow = {
  id: 'acta-uuid-1',
  libro_id: 'libro-uuid-1',
  numero_acta: 5,
  anio: 2026,
  fecha_cotejo: new Date().toISOString(),
  solicitante_nombre: 'Ing. Carlos Mendoza',
  solicitante_identificacion: 'INE 1234567890123',
  tipo_documento: 'Título Profesional',
  documento_descripcion: 'Título Profesional de Médico Cirujano UNAM',
  numero_hojas: 1,
  numero_tantos: 2,
  observaciones: 'Original tenido a la vista',
  estatus: 'autorizado',
  notario_actuante: 'Lic. Fernando Valdés'
}

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockRpc = vi.fn()
const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn()

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: (table: string) => ({
      select: (...args: any[]) => {
        mockSelect(table, ...args)
        return {
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockLibroRow, error: null }),
          single: vi.fn().mockResolvedValue({ data: mockLibroRow, error: null }),
          then: (resolve: any) => resolve({ data: [mockActaRow], error: null })
        }
      },
      insert: (...args: any[]) => {
        mockInsert(table, ...args)
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockLibroRow, id: 'libro-nuevo-uuid', numero_libro: 2 },
              error: null
            })
          })
        }
      },
      update: (...args: any[]) => {
        mockUpdate(table, ...args)
        return {
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockLibroRow, estatus: 'cerrado' },
                error: null
              })
            }),
            then: (resolve: any) => resolve({ error: null })
          })
        }
      }
    }),
    rpc: (...args: any[]) => mockRpc(...args),
    storage: {
      from: (bucket: string) => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl
      })
    }
  })
}))

describe('useCotejos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computa proximaActaDisponible y porcentajeUsoLibro correctamente', () => {
    const { proximaActaDisponible, porcentajeUsoLibro } = useCotejos()
    expect(proximaActaDisponible.value).toBeGreaterThanOrEqual(1)
    expect(typeof porcentajeUsoLibro.value).toBe('number')
  })

  it('registra una nueva acta llamando a la función RPC atómica fn_registrar_acta_cotejo', async () => {
    mockRpc.mockResolvedValue({
      data: {
        ...mockActaRow,
        id: 'acta-uuid-nueva',
        numero_acta: 6
      },
      error: null
    })

    const { registrarActa } = useCotejos()

    const nueva = await registrarActa({
      libro_id: 'libro-uuid-1',
      solicitante_nombre: 'Dra. Elena Ramos',
      solicitante_identificacion: 'Pasaporte P12345678',
      tipo_documento: 'Cédula Profesional',
      documento_descripcion: 'Cédula de Especialidad Médica expedida por SEP',
      numero_hojas: 2,
      numero_tantos: 3,
      observaciones: 'Sellos nítidos'
    })

    expect(mockRpc).toHaveBeenCalledWith('fn_registrar_acta_cotejo', expect.objectContaining({
      p_libro_id: 'libro-uuid-1',
      p_solicitante_nombre: 'Dra. Elena Ramos',
      p_tipo_documento: 'Cédula Profesional',
      p_numero_hojas: 2,
      p_numero_tantos: 3
    }))
    expect(nueva.numero_acta).toBe(6)
  })

  it('valida campos requeridos al registrar un acta', async () => {
    const { registrarActa } = useCotejos()

    await expect(registrarActa({
      libro_id: '',
      solicitante_nombre: '',
      tipo_documento: '',
      documento_descripcion: '',
      numero_hojas: 1,
      numero_tantos: 1
    })).rejects.toThrow()
  })

  it('cancela un acta registrando el motivo en bitácora', async () => {
    const { cancelarActa } = useCotejos()

    const ok = await cancelarActa('acta-uuid-1', 'Error involuntario en fojas exhibidas')
    expect(ok).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      'actas_cotejo',
      expect.objectContaining({
        estatus: 'cancelado',
        motivo_cancelacion: 'Error involuntario en fojas exhibidas'
      })
    )
  })

  it('apertura un nuevo libro de cotejos con validación', async () => {
    const { abrirNuevoLibro } = useCotejos()

    const nuevo = await abrirNuevoLibro(2, 2026, 200, 'Segundo tomo del ejercicio')
    expect(nuevo.numero_libro).toBe(2)
    expect(mockInsert).toHaveBeenCalledWith(
      'libros_cotejo',
      expect.objectContaining({
        numero_libro: 2,
        anio: 2026,
        estatus: 'abierto'
      })
    )
  })

  it('cierra formalmente un libro de cotejos', async () => {
    const { cerrarLibro } = useCotejos()

    const cerrado = await cerrarLibro('libro-uuid-1', 'Acta formal de clausura de tomo')
    expect(cerrado).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      'libros_cotejo',
      expect.objectContaining({
        estatus: 'cerrado',
        acta_clausura_texto: 'Acta formal de clausura de tomo'
      })
    )
  })

  it('genera la fórmula oficial de Razón Notarial de Cotejo', () => {
    const { generarTextoRazonCotejo } = useCotejos()

    const texto = generarTextoRazonCotejo(mockActaRow as any)
    expect(texto).toContain('HACE CONSTAR')
    expect(texto).toContain('ING. CARLOS MENDOZA')
    expect(texto).toContain('1 FOJA ÚTIL')
    expect(texto).toContain('2 TANTOS')
    expect(texto).toContain('DOY FE')
  })

  it('genera el Acta Solemne de Clausura de Libro de Cotejos', () => {
    const { generarTextoClausuraLibro } = useCotejos()

    const texto = generarTextoClausuraLibro(mockLibroRow as any)
    expect(texto).toContain('ACTA DE CLAUSURA Y CIERRE DEL LIBRO DE COTEJOS NÚMERO 1')
    expect(texto).toContain('EJERCICIO FISCAL Y NOTARIAL 2026')
    expect(texto).toContain('DOY FE')
  })

  it('sube documentos a Supabase Storage en el bucket cotejos-documentos', async () => {
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/cotejos/doc.pdf' } })

    const { subirDocumentoCotejo } = useCotejos()

    const file = new File(['dummy content'], 'documento.pdf', { type: 'application/pdf' })
    const url = await subirDocumentoCotejo('acta-uuid-1', 'libro-uuid-1', file, 'original')

    expect(url).toContain('https://example.com/cotejos/doc.pdf')
    expect(mockUpload).toHaveBeenCalled()
  })
})
