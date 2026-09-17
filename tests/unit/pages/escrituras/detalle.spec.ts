import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestVuetify } from '../../test-utils'

interface EscrituraFixture {
  instrumento: number
  anio: number
  objeto: string
  estatus: string
  actos_juridicos: { nombre: string; tipo: string }
}

const { escrituraFixture } = vi.hoisted(() => {
  return {
    escrituraFixture: {
      value: null as EscrituraFixture | null,
    },
  }
})

function mockSupabaseClient() {
  return {
    from: (table: string) => {
      if (table === 'escrituras') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: escrituraFixture.value, error: null }),
            }),
          }),
        }
      }
      if (
        table === 'escritura_comparecientes' ||
        table === 'acto_juridico_roles' ||
        table === 'tipos_identificacion_oficial' ||
        table === 'regimenes_patrimoniales'
      ) {
        return {
          select: () => {
            const res = Promise.resolve({ data: [], error: null })
            return {
              eq: () => ({
                order: () => res,
                then: res.then.bind(res),
                catch: res.catch.bind(res),
              }),
              order: () => res,
              then: res.then.bind(res),
              catch: res.catch.bind(res),
            }
          },
        }
      }
      throw new Error(`Tabla no mockeada en este test: ${table}`)
    },
    rpc: () => Promise.resolve({ data: [], error: null }),
  }
}

vi.mock('#imports', () => ({
  useSupabaseClient: () => mockSupabaseClient(),
}))

const EscrituraDetalle = (await import('@/pages/escrituras/[id].vue')).default

async function mountDetalle() {
  const vuetify = createTestVuetify()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/escrituras/:id', component: EscrituraDetalle }],
  })
  await router.push('/escrituras/escritura-1')
  await router.isReady()

  const wrapper = mount(EscrituraDetalle, {
    global: { plugins: [vuetify, router] },
  })
  await flushPromises()
  return wrapper
}

// La escritura se deja en estatus 'protocolizada' en ambos casos para que
// ProtocolizarButton no se renderice y no requiera mockear su propia
// llamada RPC — este test solo cubre la visibilidad condicional de la
// pestaña de Georreferenciación (FR-017).
describe('Escrituras - detalle (pestaña Georreferenciación)', () => {
  beforeEach(() => {
    escrituraFixture.value = null
  })

  it('muestra la pestaña de Georreferenciación cuando el acto es traslativo', async () => {
    escrituraFixture.value = {
      instrumento: 1,
      anio: 2026,
      objeto: 'Compraventa de prueba',
      estatus: 'protocolizada',
      actos_juridicos: { nombre: 'Compraventa', tipo: 'traslativo' },
    }

    const wrapper = await mountDetalle()

    expect(wrapper.text()).toContain('Georreferenciación')
  })

  it('oculta la pestaña de Georreferenciación cuando el acto no es traslativo', async () => {
    escrituraFixture.value = {
      instrumento: 2,
      anio: 2026,
      objeto: 'Testamento de prueba',
      estatus: 'protocolizada',
      actos_juridicos: { nombre: 'Testamento', tipo: 'no_traslativo' },
    }

    const wrapper = await mountDetalle()

    expect(wrapper.text()).not.toContain('Georreferenciación')
  })
})
