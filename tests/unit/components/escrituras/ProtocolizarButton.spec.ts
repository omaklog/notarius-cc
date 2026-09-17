import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestVuetify } from '../../test-utils'
import ProtocolizarButton from '@/components/escrituras/ProtocolizarButton.vue'

const { mockRpc, mockUpdate } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockUpdate: vi.fn(),
}))

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    rpc: mockRpc,
    from: () => ({
      update: () => ({
        eq: mockUpdate,
      }),
    }),
  }),
}))

describe('ProtocolizarButton.vue', () => {
  let vuetify: ReturnType<typeof createTestVuetify>

  beforeEach(() => {
    vuetify = createTestVuetify()
    vi.clearAllMocks()
  })

  it('muestra el botón de protocolización bloqueada y abre el diálogo con causales cuando existen motivos', async () => {
    mockRpc.mockResolvedValue({
      data: [
        'Hay comparecientes con screening PLD incompleto o con cotejos vencidos (> 90 días).',
        'Existen trámites previos obligatorios sin concluir (Art. 104 Ley Notarial).'
      ],
      error: null,
    })

    const wrapper = mount(ProtocolizarButton, {
      props: {
        escrituraId: 'esc-123',
      },
      global: {
        plugins: [vuetify],
      },
      attachTo: document.body,
    })

    await flushPromises()

    // El botón verde "Protocolizar" NO debe existir
    expect(wrapper.text()).not.toContain('Protocolizar')
    
    // El botón de bloqueo debe existir con el badge
    const bloqueoBtn = wrapper.findAllComponents({ name: 'VBtn' }).find((b) => b.text().includes('Protocolización Bloqueada'))
    expect(bloqueoBtn).toBeDefined()
    expect(bloqueoBtn!.exists()).toBe(true)

    // Al hacer clic, abre el diálogo con las causales
    await bloqueoBtn!.trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('Protocolización Bloqueada')
    expect(document.body.textContent).toContain('Existen trámites previos obligatorios sin concluir')
  })

  it('muestra el botón de protocolizar habilitado cuando no existen motivos de bloqueo y emite protocolizada', async () => {
    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    })
    mockUpdate.mockResolvedValue({ error: null })

    const wrapper = mount(ProtocolizarButton, {
      props: {
        escrituraId: 'esc-123',
      },
      global: {
        plugins: [vuetify],
      },
    })

    await flushPromises()

    expect(wrapper.text()).not.toContain('Protocolización Bloqueada')

    const btn = wrapper.findAllComponents({ name: 'VBtn' }).find((b) => b.text().includes('Protocolizar'))
    expect(btn).toBeDefined()
    expect(btn!.props('disabled')).toBeFalsy()

    await btn!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('protocolizada')).toBeTruthy()
  })
})
