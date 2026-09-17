import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestVuetify } from '../test-utils'

;(globalThis as any).definePageMeta = vi.fn()

const mockLogin = vi.fn()
const mockNavigateTo = vi.fn()

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}))

vi.mock('#imports', () => ({
  navigateTo: (to: string) => mockNavigateTo(to),
}))

const LoginPage = (await import('@/pages/login.vue')).default

function mountLoginPage() {
  const vuetify = createTestVuetify()
  return mount(LoginPage, {
    global: {
      plugins: [vuetify],
    },
  })
}

describe('pages/login.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogin.mockResolvedValue(undefined)
    mockNavigateTo.mockResolvedValue(undefined)
  })

  it('renders email, password inputs and login button', () => {
    const wrapper = mountLoginPage()
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('calls login and redirects to / on valid credentials', async () => {
    const wrapper = mountLoginPage()
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    await textFields[0]!.setValue('admin@notaria.local')
    await textFields[1]!.setValue('Password123!')

    await (wrapper.vm as any).onSubmit()
    await flushPromises()

    expect(mockLogin).toHaveBeenCalledWith('admin@notaria.local', 'Password123!')
    expect(mockNavigateTo).toHaveBeenCalledWith('/')
    expect(wrapper.text()).not.toContain('Correo o contraseña incorrectos.')
  })

  it('displays invalid credentials message when login fails with auth error', async () => {
    mockLogin.mockRejectedValueOnce({
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
      status: 400,
    })

    const wrapper = mountLoginPage()
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    await textFields[0]!.setValue('wrong@notaria.local')
    await textFields[1]!.setValue('wrongpass')

    await (wrapper.vm as any).onSubmit()
    await flushPromises()

    expect(mockLogin).toHaveBeenCalledWith('wrong@notaria.local', 'wrongpass')
    expect(wrapper.text()).toContain('Correo o contraseña incorrectos.')
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('displays specific message when account is inactive or missing profile', async () => {
    mockLogin.mockRejectedValueOnce(
      new Error('Tu cuenta no tiene un perfil asignado o se encuentra inactiva. Contacta al administrador.'),
    )

    const wrapper = mountLoginPage()
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    await textFields[0]!.setValue('inactive@notaria.local')
    await textFields[1]!.setValue('ValidPass123!')

    await (wrapper.vm as any).onSubmit()
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Tu cuenta no tiene un perfil asignado o se encuentra inactiva. Contacta al administrador.',
    )
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })
})
