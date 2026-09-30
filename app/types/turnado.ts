export type TurnadoTipoEvento =
  | 'turnado_a_gestor'
  | 'devuelto_a_redactor_prevencion'
  | 'solventado_reingresado'
  | 'tramite_concluido_entregado'
  | 'reasignacion_administrativa'

export type TurnadoRolCustodio = 'redactor' | 'gestor' | 'notario' | 'administrador'

export interface TurnadoEventoItem {
  id: string
  escritura_id: string
  tramite_id?: string | null
  usuario_origen_id: string
  usuario_origen_nombre: string
  rol_origen: TurnadoRolCustodio
  usuario_destino_id: string
  usuario_destino_nombre: string
  rol_destino: TurnadoRolCustodio
  tipo_evento: TurnadoTipoEvento
  motivo: string
  folio_prevencion?: string | null
  fecha_limite_solventacion?: string | null
  documento_soporte_id?: string | null
  instrucciones?: string | null
  tiempo_custodia_horas: number
  created_at: string
}

export interface CustodiaActualResumen {
  custodia_actual_rol: TurnadoRolCustodio
  custodio_actual_id?: string | null
  custodio_actual_nombre?: string | null
  fecha_inicio_custodia_actual: string
  detenido_por_solventacion: boolean
  horas_en_custodia_actual: number
}

export interface TurnarTramitePayload {
  escritura_id: string
  tramite_id?: string | null
  usuario_destino_id: string
  rol_destino: TurnadoRolCustodio
  tipo_evento: TurnadoTipoEvento
  motivo: string
  folio_prevencion?: string | null
  fecha_limite_solventacion?: string | null
  documento_soporte_id?: string | null
  instrucciones?: string | null
}
