import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AvisosSatKpisBar from '@/components/avisosSat/AvisosSatKpisBar.vue';
import { createTestVuetify } from '../../test-utils';
import type { KpisAvisosSatPeriodo } from '~/types/avisosSat';

describe('AvisosSatKpisBar', () => {
  const vuetify = createTestVuetify();

  const mockKpis: KpisAvisosSatPeriodo = {
    periodo_anio: 2026,
    periodo_mes: 8,
    total_operaciones_vulnerables: 15,
    total_sujetas_aviso: 8,
    total_presentados: 5,
    total_pendientes: 3,
    total_avisos_24h: 1,
    monto_total_reportable_mxn: 25000000,
    monto_total_reportable_uma: 230266.18,
    fecha_limite_base: '2026-09-17',
    dias_prorroga_rfc: 3,
    fecha_limite_efectiva: '2026-09-22',
    dias_habiles_restantes: 5,
    semaforo_urgencia: 'amber-darken-3',
    requiere_informe_ceros: false,
    informe_ceros_presentado: false,
  };

  it('muestra las métricas numéricas y porcentajes correctamente', () => {
    const wrapper = mount(AvisosSatKpisBar, {
      global: { plugins: [vuetify] },
      props: {
        kpis: mockKpis,
      },
    });

    const text = wrapper.text();
    expect(text).toContain('15'); // Operaciones vulnerables
    expect(text).toContain('8'); // Sujetas a aviso
    expect(text).toContain('5'); // Presentados
    expect(text).toContain('(63%)'); // 5 / 8 = 62.5% rounded to 63%
    expect(text).toContain('3'); // Pendientes
  });

  it('formatea el monto total reportable en moneda MXN', () => {
    const wrapper = mount(AvisosSatKpisBar, {
      global: { plugins: [vuetify] },
      props: {
        kpis: mockKpis,
      },
    });

    expect(wrapper.text()).toContain('$25,000,000');
  });
});
