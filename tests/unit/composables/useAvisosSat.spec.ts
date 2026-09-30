import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAvisosSat } from '../../../app/composables/useAvisosSat';

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

describe('useAvisosSat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cargarAvisoEscritura carga la escritura, evalúa dictamen y retorna el aviso', async () => {
    const mockEscritura = {
      id: 'esc-1',
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

    mockFrom.mockImplementation((table: string) => {
      if (table === 'avisos_sat') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { valor: 108.57, valor_diario: 108.57 },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });

    const { cargarAvisoEscritura, avisoActual, dictamenActual } = useAvisosSat('esc-1');
    const resultado = await cargarAvisoEscritura('esc-1');

    expect(resultado).toBeTruthy();
    expect(avisoActual.value?.numero_instrumento).toBe('48102');
    expect(dictamenActual.value?.requiere_aviso).toBe(true);
    expect(dictamenActual.value?.tipo_aviso).toBe('ordinario');
  });

  it('registrarAcuseSat actualiza el folio oficial y el estatus a presentado', async () => {
    const mockAvisoActualizado = {
      id: 'aviso-1',
      folio_acuse_sat: 'SAT-SPPLD-2026-98124',
      fecha_presentacion_sat: '2026-08-20',
      estatus: 'presentado',
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'avisos_sat') {
        return {
          update: vi.fn().mockReturnValue({
            eq: () => ({
              select: () => ({
                single: vi.fn().mockResolvedValue({
                  data: mockAvisoActualizado,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });

    const { registrarAcuseSat } = useAvisosSat('esc-1');
    const resultado = await registrarAcuseSat(
      'aviso-1',
      'SAT-SPPLD-2026-98124',
      '2026-08-20'
    );

    expect(resultado.folio_acuse_sat).toBe('SAT-SPPLD-2026-98124');
    expect(resultado.estatus).toBe('presentado');
  });
});
