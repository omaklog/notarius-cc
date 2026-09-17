import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PermissionChecklist from '@/components/admin/PermissionChecklist.vue'
import { createTestVuetify } from '../../test-utils'

const permisos = [
  { id: 'p1', modulo: 'escrituras', accion: 'ver', descripcion: 'Ver escrituras', requiere_alcance: true },
  { id: 'p2', modulo: 'escrituras', accion: 'crear', descripcion: 'Crear escrituras', requiere_alcance: true },
  { id: 'p3', modulo: 'administracion', accion: 'acceso', descripcion: 'Acceso a Administración General', requiere_alcance: false },
]

function mountChecklist(modelValue: { permiso_id: string; alcance: 'propias' | 'todas' | null }[] = []) {
  const vuetify = createTestVuetify()
  return mount(PermissionChecklist, {
    props: { permisos, modelValue },
    global: { plugins: [vuetify] },
  })
}

describe('PermissionChecklist', () => {
  it('groups permissions by módulo', () => {
    const wrapper = mountChecklist()
    expect(wrapper.text()).toContain('escrituras')
    expect(wrapper.text()).toContain('administracion')
  })

  it('checking a permiso that requires alcance emits it with a default scope', async () => {
    const wrapper = mountChecklist()
    const checkbox = wrapper.findAllComponents({ name: 'VCheckbox' })[0]

    await checkbox.vm.$emit('update:model-value', true)

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual([{ permiso_id: 'p1', alcance: 'propias' }])
  })

  it('checking a permiso that does not require alcance emits a null scope', async () => {
    const wrapper = mountChecklist()
    const checkbox = wrapper.findAllComponents({ name: 'VCheckbox' })[2]

    await checkbox.vm.$emit('update:model-value', true)

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted![0][0]).toEqual([{ permiso_id: 'p3', alcance: null }])
  })

  it('shows the scope selector only for an assigned permiso that requires it', () => {
    const wrapper = mountChecklist([{ permiso_id: 'p1', alcance: 'propias' }])

    expect(wrapper.findAllComponents({ name: 'VSelect' })).toHaveLength(1)
  })

  it('unchecking a permiso removes it from the model', async () => {
    const wrapper = mountChecklist([{ permiso_id: 'p1', alcance: 'propias' }])
    const checkbox = wrapper.findAllComponents({ name: 'VCheckbox' })[0]

    await checkbox.vm.$emit('update:model-value', false)

    expect(wrapper.emitted('update:modelValue')![0][0]).toEqual([])
  })
})
