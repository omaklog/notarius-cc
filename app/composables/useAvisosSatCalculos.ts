// ============================================================================
// app/composables/useAvisosSatCalculos.ts
// Motor aritmético y de fechas puras para Avisos SAT / UIF (LFPIORPI)
// ============================================================================

import type { DictamenAvisoSat, FechaLimiteSatResult } from '~/types/avisosSat';

export function useAvisosSatCalculos() {
  /**
   * Dictamina si la operación exige aviso ordinario mensual, aviso de 24 horas o queda exenta.
   */
  function evaluarObligacionAviso(options: {
    esVulnerable: boolean;
    montoMxn: number;
    umaVigente: number;
    umbralAvisoUma?: number;
    tieneCoincidenciaLpb?: boolean;
  }): DictamenAvisoSat {
    const {
      esVulnerable,
      montoMxn = 0,
      umaVigente = 108.57,
      umbralAvisoUma = 16050,
      tieneCoincidenciaLpb = false,
    } = options;

    const montoUma = umaVigente > 0 ? Number((montoMxn / umaVigente).toFixed(2)) : 0;
    const excedeUmbral = montoUma >= umbralAvisoUma;

    if (tieneCoincidenciaLpb) {
      return {
        requiere_aviso: true,
        tipo_aviso: '24_horas',
        monto_mxn: montoMxn,
        monto_uma: montoUma,
        uma_vigente: umaVigente,
        umbral_aviso_uma: umbralAvisoUma,
        excede_umbral: excedeUmbral,
        es_actividad_vulnerable: esVulnerable,
        tiene_coincidencia_lpb: true,
        fundamento_legal: 'Art. 17 y 27 Bis LFPIORPI — Coincidencia confirmada en Lista de Personas Bloqueadas (LPB)',
        mensaje_diagnostico: 'ALERTA CRÍTICA: Compareciente detectado en LPB. Se requiere Aviso Urgente de 24 Horas ante la UIF/SAT.',
      };
    }

    if (!esVulnerable) {
      return {
        requiere_aviso: false,
        tipo_aviso: 'exento',
        monto_mxn: montoMxn,
        monto_uma: montoUma,
        uma_vigente: umaVigente,
        umbral_aviso_uma: umbralAvisoUma,
        excede_umbral: false,
        es_actividad_vulnerable: false,
        tiene_coincidencia_lpb: false,
        fundamento_legal: 'Art. 17 Fracc. XII LFPIORPI — El acto jurídico no está catalogado como actividad vulnerable',
        mensaje_diagnostico: 'Operación exenta de aviso por no ser actividad vulnerable ante el SAT.',
      };
    }

    if (excedeUmbral) {
      return {
        requiere_aviso: true,
        tipo_aviso: 'ordinario',
        monto_mxn: montoMxn,
        monto_uma: montoUma,
        uma_vigente: umaVigente,
        umbral_aviso_uma: umbralAvisoUma,
        excede_umbral: true,
        es_actividad_vulnerable: true,
        tiene_coincidencia_lpb: false,
        fundamento_legal: 'Art. 17 Fracc. XII LFPIORPI — Monto de operación supera el umbral de 16,050 UMAs',
        mensaje_diagnostico: `Sujeta a Aviso Ordinario SAT (${montoUma.toLocaleString('es-MX')} UMAs formalizadas vs 16,050 UMAs de umbral).`,
      };
    }

    return {
      requiere_aviso: false,
      tipo_aviso: 'exento',
      monto_mxn: montoMxn,
      monto_uma: montoUma,
      uma_vigente: umaVigente,
      umbral_aviso_uma: umbralAvisoUma,
      excede_umbral: false,
      es_actividad_vulnerable: true,
      tiene_coincidencia_lpb: false,
      fundamento_legal: 'Art. 17 Fracc. XII LFPIORPI — Monto inferior al umbral de aviso de 16,050 UMAs',
      mensaje_diagnostico: `Exenta de aviso ordinario por no rebasar las 16,050 UMAs (${montoUma.toLocaleString('es-MX')} UMAs formalizadas).`,
    };
  }

  /**
   * Calcula los días hábiles adicionales de prórroga conforme al sexto dígito numérico del RFC
   * según la Resolución Miscelánea Fiscal (RMF).
   * 
   * Dígito 1 y 2: +1 día hábil
   * Dígito 3 y 4: +2 días hábiles
   * Dígito 5 y 6: +3 días hábiles
   * Dígito 7 y 8: +4 días hábiles
   * Dígito 9 y 0: +5 días hábiles
   */
  function calcularDiasProrrogaRfc(rfc: string): number {
    if (!rfc) return 1;
    // Extraer todos los dígitos numéricos del RFC
    const numeros = rfc.replace(/\D/g, '');
    if (numeros.length < 6) return 1;

    // El sexto dígito numérico corresponde al índice 5
    const sextoDigito = parseInt(numeros[5] || '1', 10);

    if (sextoDigito === 1 || sextoDigito === 2) return 1;
    if (sextoDigito === 3 || sextoDigito === 4) return 2;
    if (sextoDigito === 5 || sextoDigito === 6) return 3;
    if (sextoDigito === 7 || sextoDigito === 8) return 4;
    if (sextoDigito === 9 || sextoDigito === 0) return 5;

    return 1;
  }

  /**
   * Verifica si una fecha dada cae en fin de semana (sábado = 6, domingo = 0)
   */
  function esFinDeSemana(fecha: Date): boolean {
    const dia = fecha.getDay();
    return dia === 0 || dia === 6;
  }

  /**
   * Suma días hábiles a una fecha dada, saltando sábados y domingos
   */
  function sumarDiasHabiles(fechaInicial: Date, diasHabiles: number): Date {
    const fecha = new Date(fechaInicial);
    let agregados = 0;
    while (agregados < diasHabiles) {
      fecha.setDate(fecha.getDate() + 1);
      if (!esFinDeSemana(fecha)) {
        agregados++;
      }
    }
    return fecha;
  }

  /**
   * Calcula cuántos días hábiles existen entre dos fechas
   */
  function calcularDiferenciaDiasHabiles(desde: Date, hasta: Date): number {
    const fInicio = new Date(desde);
    fInicio.setHours(0, 0, 0, 0);
    const fFin = new Date(hasta);
    fFin.setHours(0, 0, 0, 0);

    if (fInicio > fFin) {
      // Si la fecha actual ya superó la fecha límite, calculamos días de retraso en negativo
      let diasRetraso = 0;
      const cur = new Date(fFin);
      while (cur < fInicio) {
        cur.setDate(cur.getDate() + 1);
        if (!esFinDeSemana(cur)) {
          diasRetraso--;
        }
      }
      return diasRetraso;
    }

    let dias = 0;
    const cur = new Date(fInicio);
    while (cur < fFin) {
      cur.setDate(cur.getDate() + 1);
      if (!esFinDeSemana(cur)) {
        dias++;
      }
    }
    return dias;
  }

  /**
   * Formatea una fecha a string YYYY-MM-DD sin desfasamiento horario
   */
  function formatearFechaIso(d: Date): string {
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  /**
   * Calcula la fecha límite inteligente del aviso:
   * 1. Base: Día 17 del mes inmediato posterior a la fecha del acto.
   *    Si cae en sábado o domingo, se corre al lunes hábil siguiente.
   * 2. Prórroga RFC: Se le suman los N días hábiles correspondientes al sexto dígito del RFC.
   * 3. Cuenta regresiva y semáforo respecto a la fecha actual.
   */
  function calcularFechaLimiteSat(
    fechaActo: string | Date,
    rfcNotario: string = 'NOT750812AB1',
    fechaHoy: Date = new Date()
  ): FechaLimiteSatResult {
    const fecha = typeof fechaActo === 'string' ? new Date(fechaActo.length === 10 ? `${fechaActo}T12:00:00` : fechaActo) : new Date(fechaActo);
    
    // Mes inmediato posterior
    const anioActo = fecha.getFullYear();
    const mesActo = fecha.getMonth(); // 0 a 11
    
    const anioVencimiento = mesActo === 11 ? anioActo + 1 : anioActo;
    const mesVencimiento = mesActo === 11 ? 0 : mesActo + 1;

    // Día 17 del mes siguiente
    let fechaBase = new Date(anioVencimiento, mesVencimiento, 17, 12, 0, 0);
    // Si día 17 cae en sábado (6) o domingo (0), se traslada al primer día hábil (lunes)
    if (fechaBase.getDay() === 6) {
      fechaBase.setDate(19); // Sábado 17 -> Lunes 19
    } else if (fechaBase.getDay() === 0) {
      fechaBase.setDate(18); // Domingo 17 -> Lunes 18
    }

    const diasProrroga = calcularDiasProrrogaRfc(rfcNotario);
    const fechaEfectiva = sumarDiasHabiles(fechaBase, diasProrroga);

    const fHoy = new Date(fechaHoy);
    fHoy.setHours(12, 0, 0, 0);

    const diasHabilesRestantes = calcularDiferenciaDiasHabiles(fHoy, fechaEfectiva);

    let semaforo: 'verde' | 'amarillo' | 'rojo' = 'verde';
    let textoTiempo = '';

    if (diasHabilesRestantes > 5) {
      semaforo = 'verde';
      textoTiempo = `Quedan ${diasHabilesRestantes} días hábiles`;
    } else if (diasHabilesRestantes > 0) {
      semaforo = 'amarillo';
      textoTiempo = `Próximo a vencer (${diasHabilesRestantes} ${diasHabilesRestantes === 1 ? 'día hábil' : 'días hábiles'})`;
    } else if (diasHabilesRestantes === 0) {
      semaforo = 'rojo';
      textoTiempo = 'Vence hoy';
    } else {
      semaforo = 'rojo';
      const diasVencido = Math.abs(diasHabilesRestantes);
      textoTiempo = `Vencido hace ${diasVencido} ${diasVencido === 1 ? 'día hábil' : 'días hábiles'}`;
    }

    return {
      fecha_limite_base: formatearFechaIso(fechaBase),
      dias_prorroga_rfc: diasProrroga,
      fecha_limite_efectiva: formatearFechaIso(fechaEfectiva),
      dias_habiles_restantes: diasHabilesRestantes,
      semaforo_urgencia: semaforo,
      texto_tiempo_restante: textoTiempo,
    };
  }

  /**
   * Formatea un valor numérico a moneda mexicana MXN
   */
  function formatearMontoMxn(monto: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(monto || 0);
  }

  return {
    evaluarObligacionAviso,
    calcularDiasProrrogaRfc,
    calcularFechaLimiteSat,
    formatearMontoMxn,
  };
}
