import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExpedienteTab from '@/components/escrituras/tabs/ExpedienteTab.vue'
import { createTestVuetify } from '../../test-utils'

const mockDocumentosVista = [
  {
    documento_id: 'doc-1',
    entidad_tipo: 'escritura',
    entidad_id: 'esc-100',
    categoria: 'acta_constitutiva',
    lado: null,
    archivo_nombre: 'acta_constitutiva_matriz.pdf',
    archivo_path: 'escrituras/esc-100/acta_constitutiva/1.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1048576,
    created_at: '2026-09-10T10:00:00Z',
    escritura_id: 'esc-100',
    origen_documento: 'escritura',
    compareciente_id: null,
    compareciente_nombre: null,
  },
  {
    documento_id: 'doc-2',
    entidad_tipo: 'compareciente',
    entidad_id: 'comp-200',
    categoria: 'identificacion_oficial',
    lado: 'anverso',
    archivo_nombre: 'ine_anverso.jpg',
    archivo_path: 'comparecientes/comp-200/identificacion_oficial/2.jpg',
    mime_type: 'image/jpeg',
    size_bytes: 204800,
    created_at: '2026-09-11T12:00:00Z',
    escritura_id: 'esc-100',
    origen_documento: 'compareciente',
    compareciente_id: 'comp-200',
    compareciente_nombre: 'Roberto Méndez Silva',
  },
]

const mockListarExpedienteEscritura = vi.fn()
const mockSubirDocumento = vi.fn()

vi.mock('~/composables/useExpedienteDocumentos', () => ({
  useExpedienteDocumentos: () => ({
    listarExpedienteEscritura: mockListarExpedienteEscritura,
    subirDocumento: mockSubirDocumento,
    subiendo: { value: false },
  }),
}))

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://test.com/signed' } }),
      })),
    },
  }),
}))

function mountTab(props = {}) {
  const vuetify = createTestVuetify()
  return mount(ExpedienteTab, {
    props: {
      escrituraId: 'esc-100',
      ...props,
    },
    global: { plugins: [vuetify] },
  })
}

describe('ExpedienteTab.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListarExpedienteEscritura.mockResolvedValue([...mockDocumentosVista])
  })

  it('consulta v_expediente_escritura al montar y muestra métricas correctas', async () => {
    const wrapper = mountTab()
    await flushPromises()

    expect(mockListarExpedienteEscritura).toHaveBeenCalledWith('esc-100')
    expect(wrapper.text()).toContain('Total Documentos')
    expect(wrapper.text()).toContain('Del Instrumento')
    expect(wrapper.text()).toContain('De Comparecientes')
  })

  it('muestra la distinción de origen entre el instrumento y los comparecientes', async () => {
    const wrapper = mountTab()
    await flushPromises()

    // Documento del instrumento
    expect(wrapper.text()).toContain('acta_constitutiva_matriz.pdf')
    expect(wrapper.text()).toContain('Instrumento Notarial')

    // Documento aportado por compareciente
    expect(wrapper.text()).toContain('ine_anverso.jpg')
    expect(wrapper.text()).toContain('Roberto Méndez Silva')
    expect(wrapper.text().toLowerCase()).toContain('cara: anverso')
  })

  it('muestra estado vacío si la vista no devuelve documentos', async () => {
    mockListarExpedienteEscritura.mockResolvedValueOnce([])
    const wrapper = mountTab()
    await flushPromises()

    expect(wrapper.text()).toContain('No hay documentos en el expediente')
  })

  it('abre el diálogo para adjuntar documento al hacer clic en el botón', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const adjuntarBtn = wrapper.findAll('button').find((b) => b.text().includes('Adjuntar Documento'))
    expect(adjuntarBtn).toBeDefined()
    await adjuntarBtn?.trigger('click')
    await flushPromises()

    // El diálogo se abre en el estado del componente
    expect(document.body.textContent || wrapper.text()).toContain('Adjuntar Documento al Expediente')
  })
})
