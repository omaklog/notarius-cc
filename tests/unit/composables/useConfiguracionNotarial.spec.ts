import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useConfiguracionNotarial } from '~/composables/useConfiguracionNotarial'

const mockConfigRow = {
  id: '00000000-0000-0000-0000-000000000001',
  numero_notaria: 44,
  entidad_federativa: 'Estado de México',
  municipio: 'Toluca',
  distrito_judicial: 'Distrito de Toluca',
  notario_titular_nombre: 'Fernando Valdés',
  notario_titular_titulo: 'Lic.',
  patente_fiat_numero: 'PAT-44-EDOMEX',
  domicilio_calle: 'Av. Hidalgo',
  domicilio_num_ext: '102',
  domicilio_colonia: 'Centro',
  domicilio_codigo_postal: '50000',
  telefono_principal: '7222145500',
  logotipo_url: 'https://example.com/logo.png',
  sello_notarial_url: 'https://example.com/sello.png',
  leyenda_cierre_volumen: 'En {municipio}, {entidad}, se cierra el Volumen {numero_volumen} por {notario_titular}.'
}

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn()

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'configuracion_notarial') {
        return {
          select: mockSelect,
          update: mockUpdate,
        }
      }
      return {}
    },
    storage: {
      from: (bucket: string) => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })
    }
  })
}))

describe('useConfiguracionNotarial', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockSelect.mockReturnValue({
      limit: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockConfigRow }, error: null })
      })
    })

    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockImplementation((val?: any) => {
            return Promise.resolve({
              data: { ...mockConfigRow, numero_notaria: 99 },
              error: null
            })
          })
        })
      })
    })

    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.supabase.co/notaria-identidad/logos/new_logo.png' }
    })
  })

  it('carga la configuración institucional y calcula propiedades computadas', async () => {
    const {
      cargarConfiguracion,
      configuracion,
      nombreNotariaCompleto,
      titularCompleto,
      domicilioCompleto,
      logotipoUrl
    } = useConfiguracionNotarial()

    const res = await cargarConfiguracion(true)

    expect(res).toBeDefined()
    expect(configuracion.value?.numero_notaria).toBe(44)
    expect(nombreNotariaCompleto.value).toBe('Notaría Pública No. 44 del Estado de México')
    expect(titularCompleto.value).toBe('Lic. Fernando Valdés')
    expect(domicilioCompleto.value).toContain('Av. Hidalgo No. 102')
    expect(domicilioCompleto.value).toContain('Toluca')
    expect(logotipoUrl.value).toBe('https://example.com/logo.png')
  })

  it('guarda cambios válidos en la configuración institucional', async () => {
    const { guardarConfiguracion, cargarConfiguracion } = useConfiguracionNotarial()
    await cargarConfiguracion(true)

    const exito = await guardarConfiguracion({
      numero_notaria: 99,
      municipio: 'Metepec'
    })

    expect(exito).toBe(true)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('lanza error si se intenta guardar con campos obligatorios vacíos', async () => {
    const { guardarConfiguracion } = useConfiguracionNotarial()

    await expect(guardarConfiguracion({ notario_titular_nombre: '   ' })).rejects.toThrow(
      'El nombre del notario titular es obligatorio'
    )
    await expect(guardarConfiguracion({ numero_notaria: -5 })).rejects.toThrow(
      'El número de notaría debe ser un entero positivo'
    )
  })

  it('valida formato y tamaño de archivo al subir activos gráficos', async () => {
    const { subirActivoGrafico } = useConfiguracionNotarial()

    const pdfFile = new File(['dummy content'], 'documento.pdf', { type: 'application/pdf' })
    await expect(subirActivoGrafico(pdfFile, 'logotipo')).rejects.toThrow(
      'Formato de imagen no permitido'
    )

    const hugeBuffer = new Uint8Array(4 * 1024 * 1024)
    const bigFile = new File([hugeBuffer], 'huge_image.png', { type: 'image/png' })
    await expect(subirActivoGrafico(bigFile, 'logotipo')).rejects.toThrow(
      'El tamaño del archivo no debe exceder 3MB'
    )
  })

  it('sube correctamente un activo gráfico válido y actualiza la URL', async () => {
    const { subirActivoGrafico, cargarConfiguracion } = useConfiguracionNotarial()
    await cargarConfiguracion(true)

    const validFile = new File(['image-bytes'], 'logo_notaria.png', { type: 'image/png' })
    const url = await subirActivoGrafico(validFile, 'logotipo')

    expect(url).toBe('https://storage.supabase.co/notaria-identidad/logos/new_logo.png')
    expect(mockUpload).toHaveBeenCalled()
  })

  it('elimina un activo gráfico estableciendo la URL en null', async () => {
    const { eliminarActivoGrafico, cargarConfiguracion } = useConfiguracionNotarial()
    await cargarConfiguracion(true)

    const exito = await eliminarActivoGrafico('logotipo')
    expect(exito).toBe(true)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('interpola variables en plantillas de leyendas notariales', async () => {
    const { interpoladorLeyenda, cargarConfiguracion } = useConfiguracionNotarial()
    await cargarConfiguracion(true)

    const plantilla = 'Notaría: {notaria}. Municipio: {municipio}. Tomo: {numero_volumen}. Válidas: {validas}.'
    const resultado = interpoladorLeyenda(plantilla, {
      numero_volumen: 15,
      validas: 24
    })

    expect(resultado).toBe('Notaría: Notaría Pública No. 44. Municipio: Toluca. Tomo: 15. Válidas: 24.')
  })
})
