# Contract: Avisos SAT / UIF Interface

**Feature**: `11-avisos-sat`  
**Date**: 2026-09-17  
**Status**: Ready

---

## 1. Composable `useAvisosSatCalculos` (Motor Aritmético y Fechas Puras)

```typescript
export interface DictamenAvisoSat {
  requiere_aviso: boolean;
  tipo_aviso: 'ordinario' | '24_horas' | 'ceros' | 'exento';
  monto_uma: number;
  umbral_aviso_uma: number;
  excede_umbral: boolean;
  es_actividad_vulnerable: boolean;
  tiene_coincidencia_lpb: boolean;
  fundamento_legal: string;
}

export interface FechaLimiteSatResult {
  fecha_limite_base: string;        // Formato YYYY-MM-DD (día 17 del mes siguiente o hábil posterior)
  dias_prorroga_rfc: number;         // 1 a 5 días hábiles según 6º dígito del RFC
  fecha_limite_efectiva: string;    // Formato YYYY-MM-DD
  dias_habiles_restantes: number;   // Días restantes respecto a hoy
  semaforo_urgencia: 'verde' | 'amarillo' | 'rojo';
  texto_tiempo_restante: string;     // e.g. "Quedan 8 días hábiles", "Vence hoy", "Vencido hace 2 días"
}

export interface UseAvisosSatCalculos {
  /**
   * Dictamina si la operación exige aviso ordinario, aviso de 24h o queda exenta
   */
  evaluarObligacionAviso(
    esVulnerable: boolean,
    montoMxn: number,
    umaVigente: number,
    umbralAvisoUma?: number,
    tieneCoincidenciaLpb?: boolean
  ): DictamenAvisoSat;

  /**
   * Calcula los días hábiles de prórroga conforme al 6º dígito numérico del RFC
   */
  calcularDiasProrrogaRfc(rfc: string): number;

  /**
   * Calcula la fecha límite efectiva del día 17 + prórroga RFC saltando fines de semana
   */
  calcularFechaLimiteSat(fechaActo: string, rfcNotario: string): FechaLimiteSatResult;
}
```

---

## 2. Composable `useAvisosSat` (Integración Supabase y Generadores)

```typescript
export interface UseAvisosSat {
  cargando: Ref<boolean>;
  error: Ref<string | null>;
  avisoActual: Ref<AvisoSatItem | null>;
  avisosPeriodo: Ref<AvisoSatItem[]>;
  kpisPeriodo: Ref<KpisAvisosSatPeriodo | null>;

  /**
   * Carga el aviso SAT correspondiente a una escritura específica
   */
  fetchAvisoPorEscritura(escrituraId: string): Promise<AvisoSatItem | null>;

  /**
   * Carga la relación de avisos y métricas de un periodo mensual
   */
  fetchAvisosPeriodo(anio: number, mes: number): Promise<void>;

  /**
   * Genera el contenido XML oficial SPPLD para una escritura individual
   */
  generarXmlIndividual(escrituraId: string): Promise<{ nombreArchivo: string; contenidoXml: string }>;

  /**
   * Genera el paquete consolidado mensual XML de todas las operaciones del periodo
   */
  generarPaqueteConsolidadoXml(anio: number, mes: number): Promise<{ nombreArchivo: string; contenidoXml: string }>;

  /**
   * Genera el archivo PDF oficial de la Cédula de Aviso Notarial
   */
  generarCedulaPdf(escrituraId: string): Promise<Blob>;

  /**
   * Asienta el folio oficial de aceptación emitido por el portal SPPLD y almacena el comprobante PDF
   */
  registrarAcuseSat(
    avisoId: string,
    folioAcuse: string,
    fechaPresentacion: string,
    archivoPdf?: File
  ): Promise<AvisoSatItem>;

  /**
   * Registra formalmente el informe en ceros para un mes sin operaciones reportables
   */
  declararInformeCeros(
    anio: number,
    mes: number,
    folioAcuse: string,
    fechaPresentacion: string,
    archivoPdf?: File
  ): Promise<AvisoSatItem>;
}
```
