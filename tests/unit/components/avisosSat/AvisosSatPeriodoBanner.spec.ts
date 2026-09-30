import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AvisosSatPeriodoBanner from '@/components/avisosSat/AvisosSatPeriodoBanner.vue';
import { createTestVuetify } from '../../test-utils';
import type { KpisAvisosSatPeriodo } from '~/types/avisosSat';

describe('AvisosSatPeriodoBanner', () => {
  const vuetify = createTestVuetify();

  const mockKpis: KpisAvisosSatPeriodo = {
    periodo_anio: 2026,
    periodo_mes: 8,
    total_operaciones_vulnerables: 10,
    total_sujetas_aviso: 4,
    total_presentados: 2,
    total_pendientes: 2,
    total_avisos_24h: 0,
    monto_total_reportable_mxn: 15000000,
    monto_total_reportable_uma: 138159.71,
    fecha_limite_base: '2026-09-17',
    dias_prorroga_rfc: 3,
    fecha_limite_efectiva: '2026-09-22',
    dias_habiles_restantes: 4,
    semaforo_urgencia: 'amber-darken-3',
    requiere_informe_ceros: false,
    informe_ceros_presentado: false,
  };

  it('muestra el banner con mes, año, base legal y fecha límite efectiva', () => {
    const wrapper = mount(AvisosSatPeriodoBanner, {
      global: { plugins: [vuetify] },
      props: {
        kpis: mockKpis,
      },
    });

    const text = wrapper.text();
    expect(text).toContain('Vencimiento Legal Inteligente — Agosto 2026');
    expect(text).toContain('2026-09-17');
    expect(text).toContain('+3 días hábiles');
    expect(text).toContain('2026-09-22');
    expect(text).toContain('Próximo a vencer (4 días)');
  });

  it('muestra plazo vencido cuando los días restantes son negativos', () => {
    const wrapper = mount(AvisosSatPeriodoBanner, {
      global: { plugins: [vuetify] },
      props: {
        kpis: {
          ...mockKpis,
          dias_habiles_restantes: -2,
          semaforo_urgencia: 'error',
        },
      },
    });

    expect(wrapper.text()).toContain('Vencido hace 2 días');
  });
});
