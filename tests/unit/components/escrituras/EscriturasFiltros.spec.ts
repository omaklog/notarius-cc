import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EscriturasFiltros from '@/components/escrituras/EscriturasFiltros.vue'
import { createTestVuetify } from '../../test-utils'

const actosJuridicos = [
  { id: 'acto-1', nombre: 'Compraventa' },
  { id: 'acto-2', nombre: 'Testamento' },
]

const responsables = [
  { id: 'user-1', nombre_completo: 'Lic. Notario' },
  { id: 'user-2', nombre_completo: 'Lic. Auxiliar' },
]

function mountFiltros(props = {}) {
  const vuetify = createTestVuetify()
  return mount(EscriturasFiltros, {
    props: {
      actosJuridicos,
      responsables,
      ...props,
    },
    global: { plugins: [vuetify] },
  })
}

describe('EscriturasFiltros', () => {
  it('emite los valores de filtro seleccionados al cambiar un campo', async () => {
    const wrapper = mountFiltros()

    const vm = wrapper.vm as unknown as {
      estatus: string | null
      actoJuridicoId: string | null
      fechaDesde: string | null
      fechaHasta: string | null
      responsableId: string | null
    }

    vm.estatus = 'protocolizada'
    vm.actoJuridicoId = 'acto-1'
    vm.fechaDesde = '2026-01-01'
    vm.fechaHasta = '2026-12-31'
    vm.responsableId = 'user-1'

    await flushPromises()

    const emitted = wrapper.emitted('filter')
    expect(emitted).toBeTruthy()
    const lastEmitted = emitted![emitted!.length - 1][0]
    expect(lastEmitted).toEqual({
      estatus: 'protocolizada',
      actoJuridicoId: 'acto-1',
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-12-31',
      responsableId: 'user-1',
    })
  })

  it('limpia los filtros al ejecutar limpiar() y emite valores nulos', async () => {
    const wrapper = mountFiltros({
      modelValue: {
        estatus: 'borrador',
        actoJuridicoId: 'acto-2',
      },
    })

    const vm = wrapper.vm as unknown as {
      limpiar: () => void
      estatus: string | null
      actoJuridicoId: string | null
    }

    vm.limpiar()
    await flushPromises()

    expect(vm.estatus).toBeNull()
    expect(vm.actoJuridicoId).toBeNull()

    const emitted = wrapper.emitted('filter')
    expect(emitted).toBeTruthy()
    const lastEmitted = emitted![emitted!.length - 1][0]
    expect(lastEmitted).toEqual({
      estatus: null,
      actoJuridicoId: null,
      fechaDesde: null,
      fechaHasta: null,
      responsableId: null,
    })
  })
})
