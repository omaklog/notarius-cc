import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import OrdenesPagoFiltros from '~/components/ordenesPago/OrdenesPagoFiltros.vue'
import OrdenesPagoDashboard from '~/pages/ordenes-pago/index.vue'
import { createTestVuetify } from '../../test-utils'
import type { OrdenPago, DependenciaOficialLite } from '~/types/ordenesPago'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

const mockOrdenes = ref<OrdenPago[]>([
  {
    id: 'ord-1',
    folio: 'ORD-2026-0001',
    escritura_id: 'esc-123',
    dependencia_id: 'dep-1',
    concepto: 'Derechos de Testimonio RPP',
    monto: 12500,
    estado: 'pendiente',
    linea_captura: 'LC-12345',
    fecha_emision_linea: '2026-09-16',
    fecha_vencimiento_linea: '2026-09-25',
    quien_cubre: 'adquirente',
    semaforo: 'verde',
    dias_restantes: 9,
    created_at: '2026-09-16T10:00:00Z',
    updated_at: '2026-09-16T10:00:00Z',
    dependencia: { id: 'dep-1', sigla: 'RPP', nombre: 'Registro Público' },
    escritura_instrumento: '45021',
  },
  {
    id: 'ord-2',
    folio: 'ORD-2026-0002',
    escritura_id: 'esc-124',
    dependencia_id: 'dep-2',
    concepto: 'Impuesto ISAI',
    monto: 45000,
    estado: 'pagado',
    linea_captura: 'LC-67890',
    fecha_emision_linea: '2026-09-10',
    fecha_vencimiento_linea: '2026-09-20',
    quien_cubre: 'adquirente',
    semaforo: 'azul',
    created_at: '2026-09-10T10:00:00Z',
    updated_at: '2026-09-12T10:00:00Z',
    dependencia: { id: 'dep-2', sigla: 'TESORERIA', nombre: 'Tesorería CDMX' },
    escritura_instrumento: '45022',
  },
])

const mockDependencias = ref<DependenciaOficialLite[]>([
  { id: 'dep-1', sigla: 'RPP', nombre: 'Registro Público' },
  { id: 'dep-2', sigla: 'TESORERIA', nombre: 'Tesorería CDMX' },
])

const mockCargarDependencias = vi.fn().mockResolvedValue(undefined)
const mockCargarOrdenes = vi.fn().mockResolvedValue(undefined)
const mockLiquidarOrden = vi.fn().mockResolvedValue(undefined)

const mockResumenFinanciero = computed(() => ({
  total_ordenes: 2,
  total_monto: 57500,
  monto_pagado: 45000,
  monto_pendiente: 12500,
  ordenes_por_vencer: 0,
  ordenes_vencidas: 0,
}))

vi.mock('~/composables/useOrdenesPago', () => ({
  useOrdenesPago: () => ({
    ordenes: mockOrdenes,
    dependencias: mockDependencias,
    cargando: ref(false),
    resumenFinanciero: mockResumenFinanciero,
    cargarDependencias: mockCargarDependencias,
    cargarOrdenes: mockCargarOrdenes,
    liquidarOrden: mockLiquidarOrden,
  }),
}))

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: vi.fn(),
    storage: { from: vi.fn() },
  }),
}))

describe('OrdenesPagoFiltros.vue', () => {
  it('renderiza inputs de filtro y emite cambios', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenesPagoFiltros, {
      props: {
        modelValue: {
          busqueda: '',
          dependencia_id: 'todas',
          estado: 'todos',
          vencimiento: 'todas',
          quien_cubre: 'todos',
        },
        dependencias: mockDependencias.value,
      },
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Buscar orden de pago...')
    expect(wrapper.text()).toContain('Dependencia')
    expect(wrapper.text()).toContain('Estado')
  })
})

describe('OrdenesPagoDashboard (/ordenes-pago/index.vue)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('renderiza encabezado, tarjetas KPI y tabla de órdenes', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenesPagoDashboard, {
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Órdenes de Pago y Tesorería Notarial')
    expect(wrapper.text()).toContain('Total Derechos Oficiales')
    expect(wrapper.text()).toContain('57,500.00')
    expect(wrapper.text()).toContain('45,000.00')
    expect(wrapper.text()).toContain('12,500.00')

    expect(wrapper.text()).toContain('ORD-2026-0001')
    expect(wrapper.text()).toContain('Inst. 45021')
    expect(wrapper.text()).toContain('Derechos de Testimonio RPP')
    expect(wrapper.text()).toContain('ORD-2026-0002')
    expect(wrapper.text()).toContain('Inst. 45022')
    expect(wrapper.text()).toContain('Impuesto ISAI')
  })

  it('navega a la escritura al presionar el enlace de instrumento', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenesPagoDashboard, {
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    const linkEscritura = wrapper.findAll('button').find((b) => b.text().includes('Inst. 45021'))
    expect(linkEscritura).toBeDefined()
    await linkEscritura!.trigger('click')

    expect(mockPush).toHaveBeenCalledWith('/escrituras/esc-123')
  })

  it('permite exportar relación en CSV', async () => {
    const vuetify = createTestVuetify()
    const wrapper = mount(OrdenesPagoDashboard, {
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    const btnExportar = wrapper.findAll('button').find((b) => b.text().includes('Exportar Relación'))
    expect(btnExportar).toBeDefined()
    await btnExportar!.trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('Relación de pagos descargada en CSV')
  })
})
