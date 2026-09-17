import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestVuetify } from '../../test-utils'

const mockIdentificaciones = [
  {
    id: 'tipo-1',
    codigo: 'ine',
    nombre: 'Credencial para Votar (INE/IFE)',
    permite_ocr: true,
    requiere_reverso: true,
    activo: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tipo-2',
    codigo: 'pasaporte',
    nombre: 'Pasaporte Mexicano',
    permite_ocr: true,
    requiere_reverso: false,
    activo: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tipo-3',
    codigo: 'cedula',
    nombre: 'Cédula Profesional',
    permite_ocr: false,
    requiere_reverso: false,
    activo: false,
    created_at: '2026-01-01T00:00:00Z',
  },
]

const { mockInsert, mockUpdate, mockSelect } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockSelect: vi.fn(),
}))

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'tipos_identificacion_oficial') {
        return {
          select: () => ({
            order: mockSelect,
          }),
          insert: mockInsert,
          update: (payload: unknown) => ({
            eq: (col: string, val: unknown) => mockUpdate(payload, col, val),
          }),
        }
      }
      throw new Error(`Tabla no mockeada: ${table}`)
    },
  }),
}))

;(globalThis as any).definePageMeta = vi.fn()

const TiposIdentificacionPage = (
  await import('@/pages/administracion-general/tipos-identificacion/index.vue')
).default

function mountPage() {
  const vuetify = createTestVuetify()
  return mount(TiposIdentificacionPage, {
    global: { plugins: [vuetify] },
  })
}

describe('TiposIdentificacionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockResolvedValue({ data: [...mockIdentificaciones], error: null })
    mockInsert.mockResolvedValue({ data: null, error: null })
    mockUpdate.mockResolvedValue({ data: null, error: null })
  })

  it('carga y muestra la lista de identificaciones oficiales', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Catálogo de Tipos de Identificación Oficial')
    expect(wrapper.text()).toContain('ine')
    expect(wrapper.text()).toContain('Credencial para Votar (INE/IFE)')
    expect(wrapper.text()).toContain('pasaporte')
    expect(wrapper.text()).toContain('Pasaporte Mexicano')
  })

  it('permite filtrar por búsqueda de texto', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const searchInput = wrapper.find('input[placeholder*="Buscar por código"]')
    expect(searchInput.exists()).toBe(true)

    await searchInput.setValue('pasaporte')
    await flushPromises()

    expect(wrapper.text()).toContain('Pasaporte Mexicano')
    expect(wrapper.text()).not.toContain('Credencial para Votar')
  })

  it('actualiza permite_ocr y desactiva requiere_reverso si se apaga ocr', async () => {
    const wrapper = mountPage()
    await flushPromises()

    // Llamada directa al método toggleOcrDirecto expuesto en el componente
    const vm = wrapper.vm as any
    const item = { ...mockIdentificaciones[0] }

    await vm.toggleOcrDirecto(item, false)
    await flushPromises()

    expect(mockUpdate).toHaveBeenCalledWith(
      { permite_ocr: false, requiere_reverso: false },
      'id',
      'tipo-1'
    )
    expect(item.permite_ocr).toBe(false)
    expect(item.requiere_reverso).toBe(false)
  })

  it('valida campos obligatorios al intentar guardar sin nombre ni código', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.abrirNuevo()
    await flushPromises()

    await vm.guardar()
    expect(vm.formError).toContain('obligatorio')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('guarda un nuevo tipo de identificación exitosamente', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.abrirNuevo()
    vm.formCodigo = 'cartilla'
    vm.formNombre = 'Cartilla Militar Nacional'
    vm.formPermiteOcr = true
    vm.formRequiereReverso = false
    vm.formActivo = true

    await vm.guardar()
    await flushPromises()

    expect(mockInsert).toHaveBeenCalledWith({
      codigo: 'cartilla',
      nombre: 'Cartilla Militar Nacional',
      permite_ocr: true,
      requiere_reverso: false,
      activo: true,
    })
    expect(vm.showDialog).toBe(false)
  })
})
