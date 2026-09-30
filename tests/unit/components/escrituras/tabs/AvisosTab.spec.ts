import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AvisosTab from '@/components/escrituras/tabs/AvisosTab.vue';
import { createTestVuetify } from '../../../test-utils';

const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: mockFrom,
    storage: {
      from: mockStorageFrom,
    },
  }),
}));

describe('AvisosTab', () => {
  const vuetify = createTestVuetify();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la pestaña completa con semáforo normativo, dictamen UMA y botones de acción', async () => {
    const mockEscritura = {
      id: 'esc-101',
      instrumento: 48102,
      numero_instrumento: 48102,
      fecha_celebracion: '2026-08-12',
      fecha_firma: '2026-08-12',
      monto_operacion: 3500000,
      valor_operacion: 3500000,
      acto_juridico_id: 'acto-1',
      actos_juridicos: {
        nombre: 'Compraventa de Inmueble',
        es_actividad_vulnerable: true,
      },
    };

    const mockAviso = {
      id: 'aviso-101',
      escritura_id: 'esc-101',
      periodo_anio: 2026,
      periodo_mes: 8,
      tipo_aviso: 'ordinario',
      estatus: 'presentado',
      folio_acuse_sat: 'SAT-SPPLD-2026-98124',
      fecha_presentacion_sat: '2026-08-20 12:00:00',
      monto_operacion_mxn: 3500000,
      monto_operacion_uma: 32237.26,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'avisos_sat') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockAviso, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'escrituras') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: mockEscritura, error: null }),
            }),
          }),
        };
      }
      if (table === 'pld_screenings' || table === 'pld_consultas') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'uma_historico') {
        return {
          select: () => ({
            lte: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { valor: 108.57, valor_diario: 108.57 }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });

    const wrapper = mount(AvisosTab, {
      props: {
        escrituraId: 'esc-101',
        estatusEscritura: 'borrador',
      },
      global: {
        plugins: [vuetify],
      },
    });

    await flushPromises();

    // Validar encabezado y semáforo
    expect(wrapper.text()).toContain('Sujeta a Aviso Ordinario SAT');
    expect(wrapper.text()).toContain('Generar Layout XML SPPLD');
    expect(wrapper.text()).toContain('Cédula PDF');
    expect(wrapper.text()).toContain('Dictamen PLD y Cálculo de Umbrales en UMA');
    expect(wrapper.text()).toContain('Compraventa de Inmueble');
    expect(wrapper.text()).toContain('Indicador de Vencimiento Legal Inteligente');
    expect(wrapper.text()).toContain('SAT-SPPLD-2026-98124');
  });
});
