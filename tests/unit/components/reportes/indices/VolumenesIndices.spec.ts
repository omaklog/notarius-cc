import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import VolumenesCardsGrid from '@/components/reportes/indices/VolumenesCardsGrid.vue'
import VolumenDetalleFoliadoModal from '@/components/reportes/indices/VolumenDetalleFoliadoModal.vue'
import ReporteIndiceVolumenImprimible from '@/components/reportes/indices/ReporteIndiceVolumenImprimible.vue'
import { createTestVuetify } from '../../../test-utils'
import type { VolumenIndiceCard, EscrituraIndiceItem } from '~/types/reportes'

describe('Módulo de Índices Notariales por Volumen', () => {
  const vuetify = createTestVuetify()

  beforeEach(() => {
    if (!window.print) {
      window.print = vi.fn()
    }
  })

  const mockVolumenes: VolumenIndiceCard[] = [
    {
      volumen: 25,
      anio: 2026,
      total_escrituras: 2,
      instrumento_desde: 1001,
      instrumento_hasta: 1002,
      escrituras_foliadas: 2,
      escrituras_pendientes: 0,
      foliado_completo: true,
    },
    {
      volumen: 26,
      anio: 2026,
      total_escrituras: 3,
      instrumento_desde: 1003,
      instrumento_hasta: 1005,
      escrituras_foliadas: 1,
      escrituras_pendientes: 2,
      foliado_completo: false,
    },
  ]

  const mockEscrituras: EscrituraIndiceItem[] = [
    {
      id: 'esc-1001',
      instrumento: 1001,
      volumen: 25,
      fecha_celebracion: '2026-09-01',
      acto_nombre: 'Compraventa',
      comparecientes_resumen: [
        { rol: 'Enajenante', nombre: 'Juan Pérez' },
        { rol: 'Adquirente', nombre: 'María López' },
      ],
      pagina_inicial: 1,
      pagina_final: 10,
      estatus: 'protocolizada',
    },
    {
      id: 'esc-1002',
      instrumento: 1002,
      volumen: 25,
      fecha_celebracion: '2026-09-02',
      acto_nombre: 'Poder General',
      comparecientes_resumen: [
        { rol: 'Otorgante', nombre: 'Carlos Ruiz' },
      ],
      pagina_inicial: 11,
      pagina_final: 15,
      estatus: 'anulada',
    },
  ]

  describe('VolumenesCardsGrid', () => {
    it('muestra las tarjetas de volumen con su semáforo de foliado', () => {
      const wrapper = mount(VolumenesCardsGrid, {
        global: { plugins: [vuetify] },
        props: {
          volumenes: mockVolumenes,
          cargando: false,
        },
      })

      const text = wrapper.text()
      expect(text).toContain('Volumen 25')
      expect(text).toContain('Completo')
      expect(text).toContain('Nº 1001 al Nº 1002')

      expect(text).toContain('Volumen 26')
      expect(text).toContain('Pendiente')
      expect(text).toContain('Nº 1003 al Nº 1005')
    })

    it('emite seleccionar-volumen al hacer click en una tarjeta', async () => {
      const wrapper = mount(VolumenesCardsGrid, {
        global: { plugins: [vuetify] },
        props: {
          volumenes: mockVolumenes,
          cargando: false,
        },
      })

      const card = wrapper.find('.volumen-card')
      await card.trigger('click')

      expect(wrapper.emitted('seleccionar-volumen')).toBeTruthy()
      expect(wrapper.emitted('seleccionar-volumen')?.[0]).toEqual([25])
    })
  })

  describe('VolumenDetalleFoliadoModal', () => {
    it('renderiza la lista de escrituras y detecta error si pagina_final < pagina_inicial', async () => {
      const wrapper = mount(VolumenDetalleFoliadoModal, {
        global: { plugins: [vuetify] },
        props: {
          modelValue: true,
          volumen: 25,
          escrituras: mockEscrituras,
          cargando: false,
          guardando: false,
        },
      })

      const vm = wrapper.vm as any
      expect(vm.escriturasLocal.length).toBe(2)
      expect(vm.escriturasLocal[0].instrumento).toBe(1001)

      // Provocar error de foliado
      const fila = vm.escriturasLocal[0]
      fila.pagina_inicial = 20
      fila.pagina_final = 10
      vm.validarFila(fila)

      expect(fila.errorFoliado).toBe(true)
      expect(vm.errorEdicion).toContain('no puede ser menor a la inicial')
    })

    it('emite guardar-foliado si la validación es correcta', async () => {
      const wrapper = mount(VolumenDetalleFoliadoModal, {
        global: { plugins: [vuetify] },
        props: {
          modelValue: true,
          volumen: 25,
          escrituras: mockEscrituras,
          cargando: false,
          guardando: false,
        },
      })

      const vm = wrapper.vm as any
      const fila = vm.escriturasLocal[0]
      fila.pagina_inicial = 1
      fila.pagina_final = 10

      vm.onGuardarFoliado(fila)

      expect(wrapper.emitted('guardar-foliado')).toBeTruthy()
      expect(wrapper.emitted('guardar-foliado')?.[0]).toEqual([
        {
          escrituraId: 'esc-1001',
          paginaInicial: 1,
          paginaFinal: 10,
        },
      ])
    })
  })

  describe('ReporteIndiceVolumenImprimible', () => {
    it('calcula métricas de instrumentos, firmadas y canceladas correctamente', () => {
      const wrapper = mount(ReporteIndiceVolumenImprimible, {
        global: { plugins: [vuetify] },
        props: {
          modelValue: true,
          volumen: 25,
          anio: 2026,
          escrituras: mockEscrituras,
        },
      })

      const vm = wrapper.vm as any
      expect(vm.instrumentoDesde).toBe(1001)
      expect(vm.instrumentoHasta).toBe(1002)
      expect(vm.totalFirmadas).toBe(1)
      expect(vm.totalCanceladas).toBe(1)
      expect(vm.fechaActualLarga).toBeDefined()
    })

    it('invoca window.print al ejecutar el método imprimir', async () => {
      const printSpy = vi.fn()
      window.print = printSpy

      const wrapper = mount(ReporteIndiceVolumenImprimible, {
        global: { plugins: [vuetify] },
        props: {
          modelValue: true,
          volumen: 25,
          anio: 2026,
          escrituras: mockEscrituras,
        },
      })

      const vm = wrapper.vm as any
      vm.imprimir()

      expect(printSpy).toHaveBeenCalled()
    })
  })
})
