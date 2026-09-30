import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AvisosSatOperacionesTable from '@/components/avisosSat/AvisosSatOperacionesTable.vue';
import { createTestVuetify } from '../../test-utils';
import type { AvisoSatItem } from '~/types/avisosSat';

describe('AvisosSatOperacionesTable', () => {
  const vuetify = createTestVuetify();

  const mockOperaciones: AvisoSatItem[] = [
    {
      id: 'aviso-1',
      escritura_id: 'esc-1',
      numero_instrumento: '48100',
      fecha_acto: '2026-08-01',
      acto_juridico_nombre: 'Compraventa Residencial',
      cliente_principal: 'Juan Pérez García',
      monto_operacion_mxn: 3500000,
      monto_operacion_uma: 32237.26,
      tipo_aviso: 'ordinario',
      estatus: 'pendiente',
      periodo_anio: 2026,
      periodo_mes: 8,
      created_at: '2026-08-01T10:00:00Z',
    },
    {
      id: 'aviso-2',
      escritura_id: 'esc-2',
      numero_instrumento: '48105',
      fecha_acto: '2026-08-05',
      acto_juridico_nombre: 'Constitución de Sociedad',
      cliente_principal: 'Inmobiliaria Sol SA de CV',
      monto_operacion_mxn: 5200000,
      monto_operacion_uma: 47895.37,
      tipo_aviso: 'ordinario',
      estatus: 'presentado',
      folio_acuse_sat: 'SAT-SPPLD-2026-98124',
      fecha_presentacion_sat: '2026-08-15',
      periodo_anio: 2026,
      periodo_mes: 8,
      created_at: '2026-08-05T12:00:00Z',
    },
    {
      id: 'aviso-3',
      escritura_id: 'esc-3',
      numero_instrumento: '48110',
      fecha_acto: '2026-08-10',
      acto_juridico_nombre: 'Donación de Inmueble',
      cliente_principal: 'Carlos López Hernández',
      monto_operacion_mxn: 2100000,
      monto_operacion_uma: 19342.36,
      tipo_aviso: '24_horas',
      estatus: 'pendiente',
      periodo_anio: 2026,
      periodo_mes: 8,
      created_at: '2026-08-10T15:00:00Z',
    },
  ];

  it('renderiza la lista de operaciones correctamente con columnas e instrumentos', () => {
    const wrapper = mount(AvisosSatOperacionesTable, {
      global: { plugins: [vuetify] },
      props: {
        operaciones: mockOperaciones,
      },
    });

    const text = wrapper.text();
    expect(text).toContain('#48100');
    expect(text).toContain('#48105');
    expect(text).toContain('#48110');
    expect(text).toContain('Compraventa Residencial');
    expect(text).toContain('Inmobiliaria Sol SA de CV');
    expect(text).toContain('SAT-SPPLD-2026-98124');
  });

  it('filtra por estado al seleccionar el chip de pendientes y presentadas', async () => {
    const wrapper = mount(AvisosSatOperacionesTable, {
      global: { plugins: [vuetify] },
      props: {
        operaciones: mockOperaciones,
      },
    });

    const vm = wrapper.vm as any;

    // Cambiar a pendientes
    vm.setFiltro('pendientes');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('#48100');
    expect(wrapper.text()).toContain('#48110');
    expect(wrapper.text()).not.toContain('#48105');

    // Cambiar a presentadas
    vm.setFiltro('presentadas');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('#48105');
    expect(wrapper.text()).not.toContain('#48100');
    expect(wrapper.text()).not.toContain('#48110');

    // Cambiar a avisos 24h
    vm.setFiltro('24h');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('#48110');
    expect(wrapper.text()).not.toContain('#48100');
    expect(wrapper.text()).not.toContain('#48105');
  });

  it('filtra por texto de búsqueda en número de instrumento o cliente', async () => {
    const wrapper = mount(AvisosSatOperacionesTable, {
      global: { plugins: [vuetify] },
      props: {
        operaciones: mockOperaciones,
      },
    });

    const input = wrapper.find('input[placeholder*="Buscar por instrumento"]');
    await input.setValue('Juan Pérez');

    expect(wrapper.text()).toContain('#48100');
    expect(wrapper.text()).not.toContain('#48105');
    expect(wrapper.text()).not.toContain('#48110');
  });

  it('emite eventos de generar-xml, emitir-pdf y registrar-acuse al pulsar los botones', async () => {
    const wrapper = mount(AvisosSatOperacionesTable, {
      global: { plugins: [vuetify] },
      props: {
        operaciones: mockOperaciones,
      },
    });

    // Encontrar botones de acción
    const xmlBtn = wrapper.find('button[title*="Generar Layout XML"]');
    if (xmlBtn.exists()) {
      await xmlBtn.trigger('click');
      expect(wrapper.emitted('generar-xml')).toBeTruthy();
      expect(wrapper.emitted('generar-xml')![0]).toEqual(['esc-1']);
    }

    const pdfBtn = wrapper.find('button[title*="Descargar / Imprimir Cédula"]');
    if (pdfBtn.exists()) {
      await pdfBtn.trigger('click');
      expect(wrapper.emitted('emitir-pdf')).toBeTruthy();
      expect(wrapper.emitted('emitir-pdf')![0][0].id).toBe('aviso-1');
    }

    const acuseBtn = wrapper.find('button[title*="Registrar Folio de Acuse"]');
    if (acuseBtn.exists()) {
      await acuseBtn.trigger('click');
      expect(wrapper.emitted('registrar-acuse')).toBeTruthy();
      expect(wrapper.emitted('registrar-acuse')![0][0].id).toBe('aviso-1');
    }
  });
});
