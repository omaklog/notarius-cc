import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import OrdenesPagoTab from '~/components/escrituras/tabs/OrdenesPagoTab.vue'
import { createTestVuetify } from '../../test-utils'
import type { OrdenPago, DependenciaOficialLite } from '~/types/ordenesPago'

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: vi.fn(),
    storage: { from: vi.fn() },
  }),
}))

const mockOrdenes = ref<OrdenPago[]>([])
const mockDependencias = ref<DependenciaOficialLite[]>([
  { id: 'dep-1', sigla: 'RPP', nombre: 'Registro Público de la Propiedad' },
  { id: 'dep-2', sigla: 'TESORERIA', nombre: 'Tesorería de la CDMX' },
])

const mockCargarDependencias = vi.fn().mockResolvedValue(undefined)
const mockCargarOrdenes = vi.fn().mockResolvedValue(undefined)
const mockGuardarOrden = vi.fn().mockResolvedValue({})
const mockLiquidarOrden = vi.fn().mockResolvedValue(undefined)
const mockCancelarOrden = vi.fn().mockResolvedValue(undefined)

const mockResumenFinanciero = computed(() => {
  let totalMonto = 0
  let montoPagado = 0
  let montoPendiente = 0
  let ordenesPorVencer = 0
  let ordenesVencidas = 0
  let totalActivas = 0

  for (const ord of mockOrdenes.value) {
    if (ord.estado === 'cancelado') continue
    totalActivas++
    const m = ord.monto || 0
    totalMonto += m
    if (ord.estado === 'pagado') {
      montoPagado += m
    } else {
      montoPendiente += m
      if (ord.semaforo === 'amarillo') ordenesPorVencer++
      if (ord.semaforo === 'rojo') ordenesVencidas++
    }
  }

  return {
    total_ordenes: totalActivas,
    total_monto: totalMonto,
    monto_pagado: montoPagado,
    monto_pendiente: montoPendiente,
    ordenes_por_vencer: ordenesPorVencer,
    ordenes_vencidas: ordenesVencidas,
  }
})

vi.mock('~/composables/useOrdenesPago', () => ({
  useOrdenesPago: () => ({
    ordenes: mockOrdenes,
    dependencias: mockDependencias,
    cargando: ref(false),
    guardando: ref(false),
    error: ref(null),
    resumenFinanciero: mockResumenFinanciero,
    cargarDependencias: mockCargarDependencias,
    cargarOrdenes: mockCargarOrdenes,
    guardarOrden: mockGuardarOrden,
    liquidarOrden: mockLiquidarOrden,
    cancelarOrden: mockCancelarOrden,
  }),
}))

describe('OrdenesPagoTab.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    mockOrdenes.value = []
  })

  it('renderiza la pestaña, tarjetas KPI y llama a cargar datos', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenesPagoTab, {
      props: {
        escrituraId: 'esc-123',
      },
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Total Derechos Oficiales')
    expect(wrapper.text()).toContain('Monto Pagado / Conciliado')
    expect(wrapper.text()).toContain('Saldo Pendiente de Liquidar')
    expect(mockCargarDependencias).toHaveBeenCalled()
    expect(mockCargarOrdenes).toHaveBeenCalled()
  })

  it('muestra la alerta informativa no bloqueante en ámbar ante saldo pendiente', async () => {
    mockOrdenes.value = [
      {
        id: 'ord-1',
        folio: 'ORD-2026-0001',
        escritura_id: 'esc-123',
        dependencia_id: 'dep-1',
        concepto: 'Derechos de Inscripción RPP',
        monto: 18450,
        estado: 'pendiente',
        fecha_emision_linea: '2026-09-16',
        fecha_vencimiento_linea: '2026-09-25',
        quien_cubre: 'adquirente',
        semaforo: 'verde',
        created_at: '2026-09-16T10:00:00Z',
        updated_at: '2026-09-16T10:00:00Z',
        dependencia: { id: 'dep-1', sigla: 'RPP', nombre: 'Registro Público' },
      },
    ]

    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenesPagoTab, {
      props: {
        escrituraId: 'esc-123',
      },
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('CONTROL DE DERECHOS A TERCEROS: SALDO PENDIENTE DE LIQUIDAR')
    expect(wrapper.text()).toContain('18,450.00')
    expect(wrapper.text()).toContain('Esta condición no bloquea la protocolización')
    expect(wrapper.text()).toContain('ORD-2026-0001')
    expect(wrapper.text()).toContain('Derechos de Inscripción RPP')
  })

  it('muestra mensaje de éxito cuando todos los derechos están pagados', async () => {
    mockOrdenes.value = [
      {
        id: 'ord-1',
        folio: 'ORD-2026-0001',
        escritura_id: 'esc-123',
        dependencia_id: 'dep-1',
        concepto: 'Derechos de Inscripción RPP',
        monto: 18450,
        estado: 'pagado',
        fecha_emision_linea: '2026-09-16',
        quien_cubre: 'adquirente',
        semaforo: 'azul',
        created_at: '2026-09-16T10:00:00Z',
        updated_at: '2026-09-16T10:00:00Z',
        dependencia: { id: 'dep-1', sigla: 'RPP', nombre: 'Registro Público' },
      },
    ]

    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenesPagoTab, {
      props: {
        escrituraId: 'esc-123',
      },
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Todos los derechos oficiales registrados para esta escritura se encuentran totalmente liquidados')
  })

  it('permite abrir el modal de nueva orden al presionar el botón', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenesPagoTab, {
      props: {
        escrituraId: 'esc-123',
      },
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    const btnNueva = wrapper.find('button.v-btn--elevated')
    expect(btnNueva.exists()).toBe(true)
    expect(btnNueva.text()).toContain('Nueva Orden de Pago')
  })
})
