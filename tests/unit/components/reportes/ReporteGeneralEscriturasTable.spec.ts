import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReporteGeneralEscriturasTable from '@/components/reportes/ReporteGeneralEscriturasTable.vue'
import { createTestVuetify } from '../../test-utils'
import type { ReporteEscrituraGeneralItem } from '~/types/reportes'

describe('ReporteGeneralEscriturasTable', () => {
  const vuetify = createTestVuetify()

  const mockEscrituras: ReporteEscrituraGeneralItem[] = [
    {
      id: 'esc-1',
      instrumento: 1050,
      anio: 2026,
      volumen: 25,
      fecha_celebracion: '2026-09-10',
      acto_nombre: 'Compraventa Inmueble',
      redactor_nombre: 'Lic. Ana Ruiz',
      estatus: 'protocolizada',
      tramites_asignados: 1,
      tramites_liberados: 2,
    },
    {
      id: 'esc-2',
      instrumento: 1051,
      anio: 2026,
      volumen: 25,
      fecha_celebracion: undefined,
      acto_nombre: 'Testamento Público Abierto',
      redactor_nombre: 'Lic. Carlos Mena',
      estatus: 'borrador',
      tramites_asignados: 2,
      tramites_liberados: 0,
    },
  ]

  it('renderiza las filas de escrituras y las métricas de trámites de gestoría', () => {
    const wrapper = mount(ReporteGeneralEscriturasTable, {
      global: { plugins: [vuetify] },
      props: {
        escrituras: mockEscrituras,
        cargando: false,
        filtroEstatus: 'todas',
        busqueda: '',
      },
    })

    const text = wrapper.text()
    expect(text).toContain('№ 1050')
    expect(text).toContain('Compraventa Inmueble')
    expect(text).toContain('Lic. Ana Ruiz')
    expect(text).toContain('Firmada')
    expect(text).toContain('10/09/2026')

    expect(text).toContain('№ 1051')
    expect(text).toContain('Testamento Público Abierto')
    expect(text).toContain('En Trámite')
    expect(text).toContain('Pendiente de firma')

    // Totales calculados de trámites
    expect(text).toContain('Trámites activos en gestoría: 3')
    expect(text).toContain('Trámites liberados: 2')
  })

  it('emite exportar-csv cuando se presiona el botón correspondiente', async () => {
    const wrapper = mount(ReporteGeneralEscriturasTable, {
      global: { plugins: [vuetify] },
      props: {
        escrituras: mockEscrituras,
        cargando: false,
      },
    })

    const btnExport = wrapper.findAll('button').find((b) => b.text().includes('Exportar a Excel (CSV)'))
    expect(btnExport).toBeDefined()
    await btnExport?.trigger('click')

    expect(wrapper.emitted('exportar-csv')).toBeTruthy()
  })

  it('emite update:filtroEstatus al cambiar el filtro', async () => {
    const wrapper = mount(ReporteGeneralEscriturasTable, {
      global: { plugins: [vuetify] },
      props: {
        escrituras: mockEscrituras,
        cargando: false,
        filtroEstatus: 'todas',
      },
    })

    const vm = wrapper.vm as any
    vm.onActualizarFiltroEstatus('protocolizada')

    expect(wrapper.emitted('update:filtroEstatus')).toBeTruthy()
    expect(wrapper.emitted('update:filtroEstatus')?.[0]).toEqual(['protocolizada'])
  })

  it('emite update:busqueda al actualizar el texto de búsqueda', async () => {
    const wrapper = mount(ReporteGeneralEscriturasTable, {
      global: { plugins: [vuetify] },
      props: {
        escrituras: mockEscrituras,
        cargando: false,
        busqueda: '',
      },
    })

    const vm = wrapper.vm as any
    vm.onActualizarBusqueda('1050')

    expect(wrapper.emitted('update:busqueda')).toBeTruthy()
    expect(wrapper.emitted('update:busqueda')?.[0]).toEqual(['1050'])
  })
})
