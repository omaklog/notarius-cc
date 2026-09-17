/**
 * TypeScript Contracts: Módulo de Cumplimiento PLD / UIF (LFPIORPI)
 * Feature: 05-cumplimiento-pld
 */

export type PldListaCodigo = 'lpb_uif' | 'ofac_sdn' | 'onu_consolidada' | 'sat_69b' | 'pep';

export type PldMetodoConsulta = 'manual' | 'reutilizado_asistido' | 'api_proveedor';

export type PldResultadoConsulta = 'limpio' | 'coincidencia_bloqueante' | 'falso_positivo';

export type PldCondicionPep = 'no_pep' | 'pep_directo' | 'pep_asimilado';

export type PldCalificacionAviso = 'exento' | 'identificacion' | 'aviso_ordinario' | 'aviso_24h';

export type PldEstatusGlobal = 'pendiente' | 'aprobado' | 'bloqueado';

export interface PldListaCatalogo {
  id: string;
  codigo: PldListaCodigo;
  nombre: string;
  entidad_emisora: string;
  url_consulta: string;
  es_bloqueante: boolean;
  orden: number;
  activo: boolean;
}

export interface PldConsulta {
  id: string;
  escritura_id: string;
  compareciente_id: string;
  lista_id: string;
  metodo: PldMetodoConsulta;
  resultado: PldResultadoConsulta;
  evidencia_storage_path: string;
  evidencia_nombre_original?: string | null;
  evidencia_hash?: string | null;
  evidencia_size?: number | null;
  justificacion_descarte?: string | null;
  documento_contraste_path?: string | null;
  notas?: string | null;
  consulta_original_fecha: string;
  escritura_origen_id?: string | null;
  created_at: string;
  created_by?: string | null;
  // Campos embebidos o joins
  lista?: PldListaCatalogo;
}

export interface PldEvaluacionEscritura {
  escritura_id: string;
  uma_valor_aplicado: number;
  uma_fecha_aplicada: string;
  monto_operacion: number;
  veces_uma: number;
  monto_efectivo: number;
  veces_uma_efectivo: number;
  limite_efectivo_uma?: number | null;
  excede_limite_efectivo: boolean;
  umbral_identificacion_uma?: number | null;
  umbral_aviso_uma?: number | null;
  requiere_identificacion: boolean;
  requiere_aviso_sat: boolean;
  calificacion_aviso: PldCalificacionAviso;
  estatus_global: PldEstatusGlobal;
  updated_at: string;
}

export interface PldPepDiligencia {
  id: string;
  escritura_id: string;
  compareciente_id: string;
  condicion_pep: 'pep_directo' | 'pep_asimilado';
  cargo_publico: string;
  dependencia: string;
  periodo?: string | null;
  tipo_vinculo?: string | null;
  origen_fondos_declarado: string;
  documento_soporte_path?: string | null;
  aprobado: boolean;
  aprobado_por?: string | null;
  fecha_aprobacion?: string | null;
  notas_aprobacion?: string | null;
  created_at: string;
}

export interface ComparecientePldStatus {
  compareciente_id: string;
  nombre_completo: string;
  rfc: string;
  tipo_persona: 'fisica' | 'moral';
  rol_nombre: string;
  rol_codigo: string;
  consultas_completas: boolean;
  tiene_bloqueo: boolean;
  condicion_pep: PldCondicionPep;
  pep_aprobado: boolean;
  beneficiario_controlador_acreditado: boolean;
  estatus: 'verificado' | 'pendiente' | 'bloqueado' | 'diligencia_reforzada';
  consultas: PldConsulta[];
  screening_previo_disponible?: {
    escritura_id: string;
    instrumento_numero: number;
    fecha: string;
    dias_restantes: number;
  } | null;
}
