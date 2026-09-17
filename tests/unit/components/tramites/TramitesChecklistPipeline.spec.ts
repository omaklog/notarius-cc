import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import TramitesChecklistPipeline from '~/components/tramites/TramitesChecklistPipeline.vue'
import { createTestVuetify } from '../../test-utils'
import type { PasoEscrituraItem } from '~/types/tramites'

const mockPasos: PasoEscrituraItem[] = [
  { paso_id: 1, paso_nombre: 'CAPTURA', paso_orden: 1, dependencia_clave: 0, genera_orden_pago: false, activo: true, completado: true, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: '2026-09-16T10:00:00Z', notas: null },
  { paso_id: 2, paso_nombre: 'ING. CAT. EST.', paso_orden: 2, dependencia_clave: 1, genera_orden_pago: false, activo: true, completado: true, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: '2026-09-16T11:00:00Z', notas: null },
  { paso_id: 3, paso_nombre: 'O.P. CAT. EST.', paso_orden: 3, dependencia_clave: 1, genera_orden_pago: true, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 4, paso_nombre: 'RECHAZO CAT. EST.', paso_orden: 4, dependencia_clave: 1, genera_orden_pago: false, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 5, paso_nombre: 'CEDULA CAT. EST.', paso_orden: 5, dependencia_clave: 1, genera_orden_pago: false, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 6, paso_nombre: 'CORREGIR CED. EST.', paso_orden: 6, dependencia_clave: 1, genera_orden_pago: false, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 7, paso_nombre: 'PAGO T.D.', paso_orden: 7, dependencia_clave: 0, genera_orden_pago: false, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 8, paso_nombre: 'ORD. DE PAG. R.P.P.', paso_orden: 8, dependencia_clave: 3, genera_orden_pago: true, activo: true, completado: true, orden_pago_id: 'op-888', orden_pago_folio: 'OP-2026-0008', orden_pago_monto: 3500, fecha_completado: '2026-09-16T12:00:00Z', notas: null },
  { paso_id: 9, paso_nombre: 'INGRESO A R.P.P.', paso_orden: 9, dependencia_clave: 3, genera_orden_pago: false, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 10, paso_nombre: 'RECHAZO R.P.P.', paso_orden: 10, dependencia_clave: 3, genera_orden_pago: false, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 11, paso_nombre: 'REINGRESO A R.P.P', paso_orden: 11, dependencia_clave: 3, genera_orden_pago: false, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 12, paso_nombre: 'SALIDA DE R.P.P', paso_orden: 12, dependencia_clave: 4, genera_orden_pago: false, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 13, paso_nombre: '1ER TEST AL CLIENTE', paso_orden: 13, dependencia_clave: 4, genera_orden_pago: false, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 14, paso_nombre: 'ING. TRAM. MUN.', paso_orden: 14, dependencia_clave: 2, genera_orden_pago: false, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 15, paso_nombre: 'RECHAZO MUNICIPAL', paso_orden: 15, dependencia_clave: 2, genera_orden_pago: false, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 16, paso_nombre: 'O.P. MUNICIPAL', paso_orden: 16, dependencia_clave: 2, genera_orden_pago: true, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
  { paso_id: 17, paso_nombre: 'P.T. FIRMADO Y SELLADO', paso_orden: 17, dependencia_clave: 0, genera_orden_pago: false, activo: true, completado: false, orden_pago_id: null, orden_pago_folio: null, orden_pago_monto: null, fecha_completado: null, notas: null },
]

const mockPasosEscritura = ref<PasoEscrituraItem[]>([])
const mockCargarPasosEscritura = vi.fn().mockImplementation(() => {
  mockPasosEscritura.value = [...mockPasos]
  return Promise.resolve(mockPasosEscritura.value)
})
const mockTogglePasoEscritura = vi.fn().mockResolvedValue(undefined)

vi.mock('~/composables/useTramites', () => ({
  useTramites: () => ({
    pasosEscritura: mockPasosEscritura,
    cargando: ref(false),
    cargarPasosEscritura: mockCargarPasosEscritura,
    togglePasoEscritura: mockTogglePasoEscritura,
  }),
}))

describe('TramitesChecklistPipeline.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPasosEscritura.value = []
  })

  function mountComponent(props = {}) {
    const vuetify = createTestVuetify()
    return mount(TramitesChecklistPipeline, {
      props: {
        escrituraId: 'esc-test-1',
        ...props,
      },
      global: { plugins: [vuetify] },
    })
  }

  it('renderiza los 17 pasos y calcula el progreso correctamente', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(mockCargarPasosEscritura).toHaveBeenCalledWith('esc-test-1')
    expect(wrapper.text()).toContain('Pipeline y Checklist de Gestoría Notarial (17 Pasos)')

    // 3 pasos completados de 17 (paso 1, 2 y 8) -> 18%
    expect(wrapper.text()).toContain('3 de 17 pasos completados (18%)')

    // Verifica que están presentes nombres y números clave
    expect(wrapper.text()).toContain('CAPTURA')
    expect(wrapper.text()).toContain('O.P. CAT. EST.')
    expect(wrapper.text()).toContain('ORD. DE PAG. R.P.P.')
    expect(wrapper.text()).toContain('1ER TEST AL CLIENTE')
    expect(wrapper.text()).toContain('P.T. FIRMADO Y SELLADO')
  })

  it('permite alternar (toggle) un paso de forma libre y emite actualizado', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    // Buscamos los checkboxes
    const checkboxes = wrapper.findAllComponents({ name: 'VCheckboxBtn' })
    expect(checkboxes.length).toBe(17)

    // Simulamos toggle en el paso 3 (O.P. CAT. EST.) que está inicialmente no completado
    await checkboxes[2].vm.$emit('update:modelValue', true)
    await flushPromises()

    expect(mockTogglePasoEscritura).toHaveBeenCalledWith(
      'esc-test-1',
      3, // paso_id
      true, // nuevo estado completado
      null,
      null
    )
    expect(wrapper.emitted('actualizado')).toBeTruthy()
  })

  it('muestra botón "Crear O.P." en pasos que generan orden de pago sin orden asociada y emite evento', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    // El paso 3 (O.P. CAT. EST.) tiene genera_orden_pago=true y orden_pago_id=null
    // El paso 8 (ORD. DE PAG. R.P.P.) tiene genera_orden_pago=true y orden_pago_id='op-888'
    // El paso 16 (O.P. MUNICIPAL) tiene genera_orden_pago=true y orden_pago_id=null

    // Verificamos que el paso 8 muestra su folio en un chip
    expect(wrapper.text()).toContain('OP-2026-0008')

    // Buscamos los botones de Crear O.P.
    const btnsCrearOP = wrapper.findAll('button').filter((b) => b.text().includes('Crear O.P.'))
    expect(btnsCrearOP.length).toBe(2) // Pasos 3 y 16

    // Hacemos click en el primer botón de Crear O.P. (paso 3)
    await btnsCrearOP[0].trigger('click')

    expect(wrapper.emitted('abrir-orden-pago')).toBeTruthy()
    const emitArgs = wrapper.emitted('abrir-orden-pago')![0][0] as any
    expect(emitArgs).toEqual({
      pasoId: 3,
      dependenciaClave: 1,
      concepto: 'O.P. CAT. EST.',
    })
  })

  it('deshabilita edición e interacciones en modo readOnly', async () => {
    const wrapper = mountComponent({ readOnly: true })
    await flushPromises()

    const checkboxes = wrapper.findAllComponents({ name: 'VCheckboxBtn' })
    expect(checkboxes[0].props('disabled')).toBe(true)

    // No debe haber botones "Crear O.P."
    const btnsCrearOP = wrapper.findAll('button').filter((b) => b.text().includes('Crear O.P.'))
    expect(btnsCrearOP.length).toBe(0)
  })
})
