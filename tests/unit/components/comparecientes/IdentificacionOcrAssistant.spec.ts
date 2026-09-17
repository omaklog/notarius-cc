import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IdentificacionOcrAssistant from '@/components/comparecientes/IdentificacionOcrAssistant.vue'
import { useExpedienteDocumentos } from '@/composables/useExpedienteDocumentos'
import { createTestVuetify } from '../../test-utils'

const waitMacrotasks = () => new Promise((resolve) => setTimeout(resolve, 50))

// Mock global $fetch for OCR endpoint
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock Supabase client
const mockStorageUpload = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()

const mockSupabase = {
  storage: {
    from: vi.fn(() => ({
      upload: mockStorageUpload,
    })),
  },
  from: vi.fn((table: string) => ({
    insert: mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle,
      }),
    }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      order: mockOrder,
    }),
  })),
}

vi.mock('#imports', () => ({
  useSupabaseClient: () => mockSupabase,
}))

function mountAssistant(props = {}) {
  const vuetify = createTestVuetify()
  return mount(IdentificacionOcrAssistant, {
    props: {
      tipoIdentificacion: 'ine',
      requiereReverso: true,
      ...props,
    },
    global: { plugins: [vuetify] },
  })
}

describe('IdentificacionOcrAssistant.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza título del asistente y chip de dos caras por defecto', () => {
    const wrapper = mountAssistant()
    expect(wrapper.text()).toContain('Asistente de Captura con Identificación Oficial')
    expect(wrapper.text()).toContain('Requiere 2 Caras')
    expect(wrapper.text()).toContain('1. Anverso / Frente')
    expect(wrapper.text()).toContain('2. Reverso')
  })

  it('renderiza solo una cara cuando requiereReverso es false', () => {
    const wrapper = mountAssistant({ requiereReverso: false })
    expect(wrapper.text()).toContain('1 Cara')
    expect(wrapper.text()).toContain('1. Anverso / Frente')
    expect(wrapper.text()).not.toContain('2. Reverso')
  })

  it('emite omitir-manual al hacer clic en el botón de captura manual', async () => {
    const wrapper = mountAssistant()
    const omitirBtn = wrapper.findAll('button').find((b) => b.text().includes('Omitir escaneo'))
    expect(omitirBtn).toBeDefined()
    await omitirBtn?.trigger('click')

    expect(wrapper.emitted('omitir-manual')).toHaveLength(1)
  })

  it('mantiene deshabilitado el botón de escanear si faltan archivos', () => {
    const wrapper = mountAssistant({ requiereReverso: true })
    const escanearBtn = wrapper.findAll('button').find((b) => b.text().includes('Escanear y Pre-llenar'))
    expect(escanearBtn?.attributes('disabled')).toBeDefined()
  })

  it('ejecuta OCR y emite ocr-completado con los datos extraídos', async () => {
    const mockOcrData = {
      nombres: 'MARIA',
      primer_apellido: 'GONZALEZ',
      segundo_apellido: 'LOPEZ',
      curp: 'GOLM850101MDFNNR01',
      rfc: 'GOLM850101ABC',
      clave_elector: 'GOLPMR85010109H500',
      vigencia: '2030',
      fecha_nacimiento: '1985-01-01',
      genero: 'F',
      domicilio: {
        calle: 'AVENIDA JUAREZ',
        numero_exterior: '123',
        numero_interior: null,
        colonia: 'CENTRO',
        codigo_postal: '72000',
        municipio: 'PUEBLA',
        entidad_federativa: 'PUEBLA',
      },
    }

    mockFetch.mockResolvedValueOnce({
      exito: true,
      datos: mockOcrData,
    })

    const wrapper = mountAssistant({ requiereReverso: false })

    // Simular carga de archivo anverso
    const file = new File(['fake-image-bytes'], 'ine_frente.jpg', { type: 'image/jpeg' })
    const inputAnverso = wrapper.find('input[type="file"]')
    Object.defineProperty(inputAnverso.element, 'files', {
      value: [file],
      writable: false,
    })
    await inputAnverso.trigger('change')
    await waitMacrotasks()
    await flushPromises()

    // El botón debe habilitarse
    const escanearBtn = wrapper.findAll('button').find((b) => b.text().includes('Escanear y Pre-llenar'))
    await escanearBtn?.trigger('click')
    await waitMacrotasks()
    await flushPromises()

    expect(mockFetch).toHaveBeenCalledWith('/api/ocr/identificacion', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        tipo_identificacion: 'ine',
      }),
    }))

    const emitted = wrapper.emitted('ocr-completado')
    expect(emitted).toBeDefined()
    expect(emitted?.[0]?.[0]).toMatchObject({
      datos: mockOcrData,
    })
  })

  it('muestra mensaje de error cuando falla el servicio OCR', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Servicio de visión no disponible'))

    const wrapper = mountAssistant({ requiereReverso: false })

    const file = new File(['fake-bytes'], 'ine_frente.jpg', { type: 'image/jpeg' })
    const inputAnverso = wrapper.find('input[type="file"]')
    Object.defineProperty(inputAnverso.element, 'files', {
      value: [file],
      writable: false,
    })
    await inputAnverso.trigger('change')
    await waitMacrotasks()
    await flushPromises()

    const escanearBtn = wrapper.findAll('button').find((b) => b.text().includes('Escanear y Pre-llenar'))
    await escanearBtn?.trigger('click')
    await waitMacrotasks()
    await flushPromises()

    expect(wrapper.text()).toContain('Servicio de visión no disponible')
    expect(wrapper.emitted('ocr-completado')).toBeFalsy()
  })
})

describe('useExpedienteDocumentos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('subirDocumento sube archivo a storage e inserta en expediente_documentos', async () => {
    mockStorageUpload.mockResolvedValueOnce({
      data: { path: 'comparecientes/comp-123/identificacion_oficial/123_anverso.jpg' },
      error: null,
    })
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'doc-uuid-1',
        entidad_tipo: 'compareciente',
        entidad_id: 'comp-123',
        categoria: 'identificacion_oficial',
        lado: 'anverso',
        archivo_nombre: 'frente.jpg',
        archivo_path: 'comparecientes/comp-123/identificacion_oficial/123_anverso.jpg',
      },
      error: null,
    })

    const { subirDocumento } = useExpedienteDocumentos()
    const testFile = new File(['bytes'], 'frente.jpg', { type: 'image/jpeg' })

    const res = await subirDocumento({
      entidadTipo: 'compareciente',
      entidadId: 'comp-123',
      categoria: 'identificacion_oficial',
      lado: 'anverso',
      archivo: testFile,
      nombreArchivo: 'frente.jpg',
    })

    expect(mockStorageUpload).toHaveBeenCalled()
    expect(res.id).toBe('doc-uuid-1')
    expect(res.entidad_tipo).toBe('compareciente')
  })

  it('listarExpedienteEscritura consulta la vista v_expediente_escritura', async () => {
    const mockVistas = [
      {
        documento_id: 'doc-1',
        escritura_id: 'esc-1',
        origen_documento: 'compareciente',
        compareciente_nombre: 'Juan Pérez',
        archivo_nombre: 'ine.jpg',
      },
    ]

    mockOrder.mockResolvedValueOnce({
      data: mockVistas,
      error: null,
    })

    const { listarExpedienteEscritura } = useExpedienteDocumentos()
    const resultado = await listarExpedienteEscritura('esc-1')

    expect(mockSupabase.from).toHaveBeenCalledWith('v_expediente_escritura')
    expect(resultado).toHaveLength(1)
    expect(resultado[0].origen_documento).toBe('compareciente')
  })
})
