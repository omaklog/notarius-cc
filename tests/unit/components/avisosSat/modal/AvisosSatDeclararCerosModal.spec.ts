import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AvisosSatDeclararCerosModal from '@/components/avisosSat/modal/AvisosSatDeclararCerosModal.vue';
import { createTestVuetify } from '../../../test-utils';

describe('AvisosSatDeclararCerosModal', () => {
  const vuetify = createTestVuetify();

  it('calcula el nombre del mes correspondiente y maneja visibilidad', () => {
    const wrapper = mount(AvisosSatDeclararCerosModal, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: true,
        periodoAnio: 2026,
        periodoMes: 8,
      },
    });

    const vm = wrapper.vm as any;
    expect(vm.nombreMes).toBe('Agosto');
  });

  it('emite el evento declarar con el folio y fecha de presentación', async () => {
    const wrapper = mount(AvisosSatDeclararCerosModal, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: true,
        periodoAnio: 2026,
        periodoMes: 8,
      },
    });

    const vm = wrapper.vm as any;
    vm.folioAcuse = 'SAT-CEROS-2026-999';
    vm.fechaPresentacion = '2026-09-10';

    vm.confirmar();

    expect(wrapper.emitted('declarar')).toBeTruthy();
    expect(wrapper.emitted('declarar')![0][0]).toEqual({
      folioAcuse: 'SAT-CEROS-2026-999',
      fechaPresentacion: '2026-09-10',
      archivoPdf: undefined,
    });
  });
});
