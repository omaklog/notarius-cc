import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import OrdenPagoFormModal from '~/components/ordenesPago/OrdenPagoFormModal.vue'
import { createTestVuetify } from '../../test-utils'
import type { DependenciaOficialLite } from '~/types/ordenesPago'

describe('OrdenPagoFormModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  const mockDependencias: DependenciaOficialLite[] = [
    { id: 'dep-uuid-1', sigla: 'RPP', nombre: 'Registro Público de la Propiedad' },
    { id: 'dep-uuid-2', sigla: 'CATASTRO_ESTATAL', nombre: 'Instituto Registral y Catastral del Estado' },
    { id: 'dep-uuid-3', sigla: 'CATASTRO_MUN', nombre: 'Dirección de Catastro Municipal' },
  ]

  it('se abre y muestra el título de registro por defecto', async () => {
    const vuetify = createTestVuetify()
    mount(OrdenPagoFormModal, {
      props: {
        modelValue: true,
        escrituraId: 'esc-123',
        dependencias: mockDependencias,
      },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.textContent).toContain('Registrar Orden de Pago de Derechos')
  })

  it('preselecciona la dependencia receptora y el concepto si se proveen por props', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenPagoFormModal, {
      props: {
        modelValue: true,
        escrituraId: 'esc-123',
        dependencias: mockDependencias,
        dependenciaIdPreseleccionada: 'dep-uuid-2',
        conceptoPreseleccionado: 'Pago de Derechos Catastro Estatal',
      },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    // Comprobar variables internas reactivas
    const vm = wrapper.vm as any
    expect(vm.dependenciaId).toBe('dep-uuid-2')
    expect(vm.concepto).toBe('Pago de Derechos Catastro Estatal')
  })

  it('emite update:modelValue con false al hacer clic en Cancelar', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenPagoFormModal, {
      props: {
        modelValue: true,
        escrituraId: 'esc-123',
        dependencias: mockDependencias,
      },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    const cancelarBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar'
    )
    expect(cancelarBtn).toBeDefined()
    cancelarBtn?.click()
    await flushPromises()

    const updateEvents = wrapper.emitted('update:modelValue')
    expect(updateEvents).toBeTruthy()
    expect(updateEvents?.[0]).toEqual([false])
  })

  it('emite update:modelValue con false al llamar a cerrar', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenPagoFormModal, {
      props: {
        modelValue: true,
        escrituraId: 'esc-123',
        dependencias: mockDependencias,
      },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    const vm = wrapper.vm as any
    vm.cerrar()
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('emite saved con el payload correspondiente al guardar', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenPagoFormModal, {
      props: {
        modelValue: true,
        escrituraId: 'esc-123',
        dependencias: mockDependencias,
        dependenciaIdPreseleccionada: 'dep-uuid-2',
        conceptoPreseleccionado: 'Derecho Catastral',
      },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    const vm = wrapper.vm as any
    vm.monto = 1500.5
    vm.lineaCaptura = 'LC-998877'
    await vm.guardar()
    await flushPromises()

    const savedEvents = wrapper.emitted('saved')
    expect(savedEvents).toBeTruthy()
    expect(savedEvents?.[0]?.[0]).toMatchObject({
      escritura_id: 'esc-123',
      dependencia_id: 'dep-uuid-2',
      concepto: 'Derecho Catastral',
      monto: 1500.5,
      linea_captura: 'LC-998877',
    })
  })
})
