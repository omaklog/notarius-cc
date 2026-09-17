import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import GeorreferenciacionTab from '~/components/escrituras/tabs/GeorreferenciacionTab.vue'
import { createTestVuetify } from '../../../test-utils'

const mockPrediosData = [
  {
    id: 'pred-1',
    escritura_id: 'esc-123',
    etiqueta: 'Predio Principal',
    descripcion: 'Casa habitación de dos niveles',
    superficie_terreno_m2: 350.5,
    superficie_declarada_m2: 350.0,
    geometria: {
      type: 'Polygon',
      coordinates: [
        [
          [-99.1332, 19.4326],
          [-99.133, 19.4326],
          [-99.133, 19.4328],
          [-99.1332, 19.4328],
          [-99.1332, 19.4326]
        ]
      ]
    },
    centroide: {
      type: 'Point',
      coordinates: [-99.1331, 19.4327]
    },
    colindancias: [
      { orientacion: 'Norte', distancia_m: 20, colinda_con: 'Calle Juárez' },
      { orientacion: 'Sur', distancia_m: 20, colinda_con: 'Lote 2' }
    ],
    foto_fachada_url: 'https://storage.example.com/fachada1.jpg',
    foto_fachada_storage_path: 'escrituras/esc-123/fachada1.jpg',
    created_at: '2026-09-17T10:00:00Z',
    updated_at: '2026-09-17T10:00:00Z'
  },
  {
    id: 'pred-2',
    escritura_id: 'esc-123',
    etiqueta: 'Lote B (Subdivisión)',
    descripcion: 'Fracción segregada para acceso',
    superficie_terreno_m2: 120.0,
    superficie_declarada_m2: 120.0,
    geometria: {
      type: 'Polygon',
      coordinates: [
        [
          [-99.1335, 19.4326],
          [-99.1333, 19.4326],
          [-99.1333, 19.4328],
          [-99.1335, 19.4328],
          [-99.1335, 19.4326]
        ]
      ]
    },
    centroide: null,
    colindancias: [],
    foto_fachada_url: null,
    foto_fachada_storage_path: null,
    created_at: '2026-09-17T10:05:00Z',
    updated_at: '2026-09-17T10:05:00Z'
  }
]

const mockFrom = vi.fn()
const mockStorageFrom = vi.fn()

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: mockFrom,
    storage: {
      from: mockStorageFrom
    }
  })
}))

describe('GeorreferenciacionTab.vue', () => {
  let vuetify: ReturnType<typeof createTestVuetify>

  beforeEach(() => {
    vuetify = createTestVuetify()
    vi.clearAllMocks()

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockPrediosData, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              instrumento: 1234,
              anio: 2026,
              volumen: 1,
              fecha_celebracion: '2026-09-17',
              objeto: 'Compraventa',
              actos_juridicos: { nombre: 'Compraventa de Inmueble' }
            },
            error: null
          }),
          single: vi.fn().mockResolvedValue({
            data: {
              instrumento: 1234,
              anio: 2026,
              volumen: 1,
              fecha_celebracion: '2026-09-17',
              objeto: 'Compraventa',
              actos_juridicos: { nombre: 'Compraventa de Inmueble' }
            },
            error: null
          })
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockPrediosData[0], id: 'pred-new' },
            error: null
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPrediosData[0],
              error: null
            })
          })
        })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    })
  })

  it('muestra banner de éxito de protocolización cuando existen predios con geometría válida', async () => {
    const wrapper = mount(GeorreferenciacionTab, {
      props: {
        escrituraId: 'esc-123'
      },
      global: {
        plugins: [vuetify],
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          PredioMapaLeaflet: {
            template: '<div class="stub-mapa" />',
            props: ['modelValue', 'predios', 'predioActivoId', 'editable']
          }
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Requisito de Protocolización Cumplido')
    expect(wrapper.text()).toContain('2 predios registrados')
    expect(wrapper.text()).toContain('Predio Principal')
    expect(wrapper.text()).toContain('Lote B (Subdivisión)')
  })

  it('muestra advertencia cuando no hay predios delimitados', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    })

    const wrapper = mount(GeorreferenciacionTab, {
      props: {
        escrituraId: 'esc-123'
      },
      global: {
        plugins: [vuetify],
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          PredioMapaLeaflet: {
            template: '<div class="stub-mapa" />',
            props: ['modelValue', 'predios', 'predioActivoId', 'editable']
          }
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Acto Traslativo de Dominio')
    expect(wrapper.text()).toContain('Pendiente de Delimitar')
  })

  it('permite cambiar entre lotes seleccionados mediante los chips', async () => {
    const wrapper = mount(GeorreferenciacionTab, {
      props: {
        escrituraId: 'esc-123'
      },
      global: {
        plugins: [vuetify],
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          PredioMapaLeaflet: {
            template: '<div class="stub-mapa" />',
            props: ['modelValue', 'predios', 'predioActivoId', 'editable']
          }
        }
      }
    })

    await flushPromises()

    const chips = wrapper.findAll('.v-chip')
    const chipLoteB = chips.find((c) => c.text().includes('Lote B'))
    expect(chipLoteB).toBeDefined()

    await chipLoteB!.trigger('click')
    await flushPromises()

    expect(wrapper.html()).toContain('Lote B (Subdivisión)')
  })

  it('guarda el predio activo y emite status-change y cambio-cumplimiento', async () => {
    const wrapper = mount(GeorreferenciacionTab, {
      props: {
        escrituraId: 'esc-123'
      },
      global: {
        plugins: [vuetify],
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          PredioMapaLeaflet: {
            template: '<div class="stub-mapa" />',
            props: ['modelValue', 'predios', 'predioActivoId', 'editable']
          }
        }
      }
    })

    await flushPromises()

    const btnGuardar = wrapper.findAll('button').find((b) => b.text().includes('Guardar Predio'))
    expect(btnGuardar).toBeDefined()

    await btnGuardar!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('status-change')).toBeTruthy()
    expect(wrapper.emitted('cambio-cumplimiento')).toBeTruthy()
  })

  it('permite alternar pantalla completa emitiendo abrir-fullscreen', async () => {
    const wrapper = mount(GeorreferenciacionTab, {
      props: {
        escrituraId: 'esc-123',
        isFullscreen: false
      },
      global: {
        plugins: [vuetify],
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          PredioMapaLeaflet: {
            template: '<div class="stub-mapa" />',
            props: ['modelValue', 'predios', 'predioActivoId', 'editable']
          }
        }
      }
    })

    await flushPromises()

    const btnFullscreen = wrapper.findAll('button').find((b) => b.text().includes('Pantalla Completa'))
    expect(btnFullscreen).toBeDefined()

    await btnFullscreen!.trigger('click')
    expect(wrapper.emitted('abrir-fullscreen')).toBeTruthy()
    expect(wrapper.emitted('toggle-fullscreen')).toBeTruthy()
  })

  it('abre el diálogo de previsualización de Cédula PDF al pulsar Cédula PDF', async () => {
    const wrapper = mount(GeorreferenciacionTab, {
      props: {
        escrituraId: 'esc-123'
      },
      global: {
        plugins: [vuetify],
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          PredioMapaLeaflet: {
            template: '<div class="stub-mapa" />',
            props: ['modelValue', 'predios', 'predioActivoId', 'editable']
          }
        }
      }
    })

    await flushPromises()

    const btnPdf = wrapper.findAll('button').find((b) => b.text().includes('Cédula PDF'))
    expect(btnPdf).toBeDefined()

    await btnPdf!.trigger('click')
    await flushPromises()

    // Verifica que el diálogo se abrió y tiene el título correspondiente
    expect(document.body.textContent).toContain('Cédula Técnica Notarial de Georreferenciación')
  })

  it('permite ajustar el zoom del croquis con los botones + y - en el modal PDF', async () => {
    const wrapper = mount(GeorreferenciacionTab, {
      props: {
        escrituraId: 'esc-123'
      },
      global: {
        plugins: [vuetify],
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          PredioMapaLeaflet: {
            template: '<div class="stub-mapa" />',
            props: ['modelValue', 'predios', 'predioActivoId', 'editable']
          }
        }
      }
    })

    await flushPromises()

    // Abrir modal PDF
    const btnPdf = wrapper.findAll('button').find((b) => b.text().includes('Cédula PDF'))
    await btnPdf!.trigger('click')
    await flushPromises()

    // Botones de zoom en el toolbar
    const btnMinus = document.querySelector('button[title*="Alejar mapa"]') as HTMLButtonElement
    const btnPlus = document.querySelector('button[title*="Acercar mapa"]') as HTMLButtonElement

    expect(btnMinus).not.toBeNull()
    expect(btnPlus).not.toBeNull()
    expect(btnMinus.disabled).toBe(false)
    expect(btnPlus.disabled).toBe(false)
  })
})
