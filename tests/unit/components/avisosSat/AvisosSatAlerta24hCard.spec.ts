import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AvisosSatAlerta24hCard from '@/components/avisosSat/AvisosSatAlerta24hCard.vue';
import { createTestVuetify } from '../../test-utils';

describe('AvisosSatAlerta24hCard', () => {
  const vuetify = createTestVuetify();

  it('no muestra alerta si no hay casos de 24 horas', () => {
    const wrapper = mount(AvisosSatAlerta24hCard, {
      global: { plugins: [vuetify] },
      props: {
        alertas: 0,
        operaciones: [],
      },
    });

    expect(wrapper.find('.alerta-24h-card').exists()).toBe(false);
  });

  it('muestra la alerta perentoria cuando hay avisos de 24 horas', async () => {
    const wrapper = mount(AvisosSatAlerta24hCard, {
      global: { plugins: [vuetify] },
      props: {
        alertas: 2,
      },
    });

    expect(wrapper.find('.alerta-24h-card').exists()).toBe(true);
    expect(wrapper.text()).toContain('ALERTA PERENTORIA: 2 Avisos de 24 Horas Pendientes');
    expect(wrapper.text()).toContain('PLAZO FATAL 24H');
  });

  it('emite el evento filtrar-24h al pulsar el botón', async () => {
    const wrapper = mount(AvisosSatAlerta24hCard, {
      global: { plugins: [vuetify] },
      props: {
        alertas: 1,
      },
    });

    const btn = wrapper.find('button');
    expect(btn.exists()).toBe(true);
    await btn.trigger('click');
    expect(wrapper.emitted('filtrar-24h')).toBeTruthy();
  });
});
