import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RoleForm from '@/components/admin/RoleForm.vue'
import { createTestVuetify } from '../../test-utils'

function mountForm(props: { nombre?: string; descripcion?: string | null } = {}) {
  const vuetify = createTestVuetify()
  return mount(RoleForm, {
    props,
    global: { plugins: [vuetify] },
  })
}

// wrapper.find('form').trigger('submit.prevent') is unreliable in
// happy-dom for VeeValidate's handleSubmit — invoking the exposed
// onSubmit() directly exercises the same validation/emit logic
// (verified to behave identically to a real click on the submit button).
describe('RoleForm', () => {
  it('pre-fills the fields when editing an existing role', () => {
    const wrapper = mountForm({ nombre: 'Gestor', descripcion: 'Rol de gestión' })

    const nameField = wrapper.findComponent({ name: 'VTextField' })
    expect(nameField.props('modelValue')).toBe('Gestor')
  })

  it('does not emit submit when the name is empty', async () => {
    const wrapper = mountForm()

    await (wrapper.vm as unknown as { onSubmit: () => Promise<void> }).onSubmit()
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('emits submit with the entered values when valid', async () => {
    const wrapper = mountForm()

    const nameField = wrapper.findComponent({ name: 'VTextField' })
    await nameField.setValue('Auditor')

    await (wrapper.vm as unknown as { onSubmit: () => Promise<void> }).onSubmit()
    await flushPromises()

    const emitted = wrapper.emitted('submit')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual({ nombre: 'Auditor', descripcion: '' })
  })
})
