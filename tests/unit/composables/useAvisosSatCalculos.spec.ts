import { describe, it, expect } from 'vitest';
import { useAvisosSatCalculos } from '../../../app/composables/useAvisosSatCalculos';

describe('useAvisosSatCalculos', () => {
  const {
    evaluarObligacionAviso,
    calcularDiasProrrogaRfc,
    calcularFechaLimiteSat,
    formatearMontoMxn,
  } = useAvisosSatCalculos();

  describe('evaluarObligacionAviso', () => {
    it('califica como ordinario cuando el monto supera las 16,050 UMAs en acto vulnerable', () => {
      // 32,237 UMAs con UMA 108.57
      const resultado = evaluarObligacionAviso({
        esVulnerable: true,
        montoMxn: 3500000,
        umaVigente: 108.57,
        umbralAvisoUma: 16050,
      });

      expect(resultado.requiere_aviso).toBe(true);
      expect(resultado.tipo_aviso).toBe('ordinario');
      expect(resultado.excede_umbral).toBe(true);
      expect(resultado.monto_uma).toBeGreaterThan(16050);
    });

    it('califica como exento cuando el monto es inferior al umbral de 16,050 UMAs', () => {
      // $1,000,000 / 108.57 = 9,210.65 UMAs < 16,050
      const resultado = evaluarObligacionAviso({
        esVulnerable: true,
        montoMxn: 1000000,
        umaVigente: 108.57,
        umbralAvisoUma: 16050,
      });

      expect(resultado.requiere_aviso).toBe(false);
      expect(resultado.tipo_aviso).toBe('exento');
      expect(resultado.excede_umbral).toBe(false);
    });

    it('califica como exento cuando el acto no es actividad vulnerable independientemente del monto', () => {
      const resultado = evaluarObligacionAviso({
        esVulnerable: false,
        montoMxn: 10000000,
        umaVigente: 108.57,
      });

      expect(resultado.requiere_aviso).toBe(false);
      expect(resultado.tipo_aviso).toBe('exento');
    });

    it('califica prioritariamente como 24_horas ante coincidencia en Lista de Personas Bloqueadas', () => {
      const resultado = evaluarObligacionAviso({
        esVulnerable: true,
        montoMxn: 500000,
        umaVigente: 108.57,
        tieneCoincidenciaLpb: true,
      });

      expect(resultado.requiere_aviso).toBe(true);
      expect(resultado.tipo_aviso).toBe('24_horas');
      expect(resultado.tiene_coincidencia_lpb).toBe(true);
    });
  });

  describe('calcularDiasProrrogaRfc', () => {
    it('otorga +1 día hábil para dígitos 1 y 2', () => {
      // 6 números: 750811 (índice 5 es '1')
      expect(calcularDiasProrrogaRfc('MORA750811AB1')).toBe(1);
      // 6 números: 750812 (índice 5 es '2')
      expect(calcularDiasProrrogaRfc('MORA750812AB1')).toBe(1);
    });

    it('otorga +2 días hábiles para dígitos 3 y 4', () => {
      expect(calcularDiasProrrogaRfc('NOT750813AB1')).toBe(2);
      expect(calcularDiasProrrogaRfc('NOT750814AB1')).toBe(2);
    });

    it('otorga +3 días hábiles para dígitos 5 y 6', () => {
      expect(calcularDiasProrrogaRfc('NOT750815AB1')).toBe(3);
      expect(calcularDiasProrrogaRfc('NOT750816AB1')).toBe(3);
    });

    it('otorga +4 días hábiles para dígitos 7 y 8', () => {
      expect(calcularDiasProrrogaRfc('NOT750817AB1')).toBe(4);
      expect(calcularDiasProrrogaRfc('NOT750818AB1')).toBe(4);
    });

    it('otorga +5 días hábiles para dígitos 9 y 0', () => {
      expect(calcularDiasProrrogaRfc('NOT750819AB1')).toBe(5);
      expect(calcularDiasProrrogaRfc('NOT750810AB1')).toBe(5);
    });
  });

  describe('calcularFechaLimiteSat', () => {
    it('calcula la fecha límite base en el día 17 del mes siguiente y aplica prórroga', () => {
      // Acto celebrado el 12 de Agosto de 2026
      // Mes siguiente: Septiembre 2026. Día 17 de Septiembre 2026 es Jueves.
      // RFC NOT750812AB1 -> dígito '2' -> +1 día hábil -> Viernes 18 de Septiembre 2026.
      const res = calcularFechaLimiteSat('2026-08-12', 'NOT750812AB1', new Date(2026, 7, 20)); // Hoy: 20 Ago 2026

      expect(res.fecha_limite_base).toBe('2026-09-17');
      expect(res.dias_prorroga_rfc).toBe(1);
      expect(res.fecha_limite_efectiva).toBe('2026-09-18');
      expect(res.semaforo_urgencia).toBe('verde');
      expect(res.dias_habiles_restantes).toBeGreaterThan(5);
    });

    it('recorre el día 17 al lunes si cae en sábado o domingo antes de aplicar la prórroga', () => {
      // Acto en Septiembre 2026 -> Vence Octubre 2026.
      // 17 de Octubre de 2026 es Sábado -> Fecha base se traslada a Lunes 19 de Octubre 2026.
      // RFC con +2 días hábiles (dígito 3) -> Martes 20 (+1), Miércoles 21 (+2).
      const res = calcularFechaLimiteSat('2026-09-10', 'NOT750813AB1', new Date(2026, 8, 15));

      expect(res.fecha_limite_base).toBe('2026-10-19');
      expect(res.dias_prorroga_rfc).toBe(2);
      expect(res.fecha_limite_efectiva).toBe('2026-10-21');
    });

    it('establece semáforo amarillo cuando faltan entre 1 y 5 días hábiles', () => {
      // Límite: 18 Septiembre 2026. Fecha hoy: 14 Septiembre 2026 (Lunes a Viernes son 4 días).
      const res = calcularFechaLimiteSat('2026-08-12', 'NOT750812AB1', new Date(2026, 8, 14));
      expect(res.semaforo_urgencia).toBe('amarillo');
      expect(res.texto_tiempo_restante).toContain('Próximo a vencer');
    });

    it('establece semáforo rojo cuando la fecha ya venció', () => {
      // Límite: 18 Septiembre 2026. Fecha hoy: 25 Septiembre 2026.
      const res = calcularFechaLimiteSat('2026-08-12', 'NOT750812AB1', new Date(2026, 8, 25));
      expect(res.semaforo_urgencia).toBe('rojo');
      expect(res.texto_tiempo_restante).toContain('Vencido');
    });
  });

  describe('formatearMontoMxn', () => {
    it('formatea montos correctamente en moneda mexicana', () => {
      const res = formatearMontoMxn(3500000);
      expect(res).toContain('3,500,000.00');
    });
  });
});
