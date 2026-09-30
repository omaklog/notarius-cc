import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import type {
  TurnadoEventoItem,
  CustodiaActualResumen,
  TurnarTramitePayload,
} from '~/types/turnado'

export function useTurnadoTramites() {
  const supabase = useSupabaseClient()

  const eventos = ref<TurnadoEventoItem[]>([])
  const custodiaActual = ref<CustodiaActualResumen | null>(null)
  const cargando = ref(false)
  const turnando = ref(false)
  const error = ref<string | null>(null)

  /**
   * Carga el historial de movimientos de turnado para un trámite o escritura.
   */
  async function cargarHistorial(tramiteId?: string, escrituraId?: string) {
    if (!tramiteId && !escrituraId) return

    cargando.value = true
    error.value = null

    try {
      const q = supabase.from?.('bitacora_turnado_tramites')
      if (!q?.select) {
        cargando.value = false
        return
      }

      let query = q.select(`
        id,
        escritura_id,
        tramite_id,
        usuario_origen_id,
        rol_origen,
        usuario_destino_id,
        rol_destino,
        tipo_evento,
        motivo,
        folio_prevencion,
        fecha_limite_solventacion,
        documento_soporte_id,
        instrucciones,
        tiempo_custodia_horas,
        created_at,
        usuario_origen:profiles!usuario_origen_id ( id, nombre_completo ),
        usuario_destino:profiles!usuario_destino_id ( id, nombre_completo )
      `)

      if (tramiteId && query.eq) {
        query = query.eq('tramite_id', tramiteId)
      } else if (escrituraId && query.eq) {
        query = query.eq('escritura_id', escrituraId)
      }

      if (query.order) {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error: err } = await query

      if (err) throw err

      eventos.value = ((data || []) as any[]).map((row) => ({
        id: row.id,
        escritura_id: row.escritura_id,
        tramite_id: row.tramite_id,
        usuario_origen_id: row.usuario_origen_id,
        usuario_origen_nombre: row.usuario_origen?.nombre_completo || 'Usuario Origen',
        rol_origen: row.rol_origen,
        usuario_destino_id: row.usuario_destino_id,
        usuario_destino_nombre: row.usuario_destino?.nombre_completo || 'Usuario Destino',
        rol_destino: row.rol_destino,
        tipo_evento: row.tipo_evento,
        motivo: row.motivo,
        folio_prevencion: row.folio_prevencion,
        fecha_limite_solventacion: row.fecha_limite_solventacion,
        documento_soporte_id: row.documento_soporte_id,
        instrucciones: row.instrucciones,
        tiempo_custodia_horas: Number(row.tiempo_custodia_horas || 0),
        created_at: row.created_at,
      }))
    } catch (e: any) {
      error.value = e?.message || 'Error al cargar historial de turnado'
      console.error(e)
    } finally {
      cargando.value = false
    }
  }

  /**
   * Obtiene la custodia actual de un trámite específico.
   */
  async function cargarCustodiaActual(tramiteId: string) {
    if (!tramiteId) return

    try {
      const q = supabase.from?.('tramites_escritura')
      if (!q?.select) return

      let query = q.select(`
        id,
        custodia_actual_rol,
        custodio_actual_id,
        fecha_inicio_custodia_actual,
        detenido_por_solventacion,
        custodio:profiles!custodio_actual_id ( id, nombre_completo )
      `)

      if (query.eq) {
        query = query.eq('id', tramiteId)
      }

      const { data, error: err } = await query.single?.() || await query

      if (err) throw err
      const row = Array.isArray(data) ? data[0] : data
      if (!row) return

      const fechaInicio = row.fecha_inicio_custodia_actual ? new Date(row.fecha_inicio_custodia_actual) : new Date()
      const horasDiff = Math.max(0, Number(((Date.now() - fechaInicio.getTime()) / (1000 * 3600)).toFixed(1)))

      custodiaActual.value = {
        custodia_actual_rol: row.custodia_actual_rol || 'redactor',
        custodio_actual_id: row.custodio_actual_id,
        custodio_actual_nombre: row.custodio?.nombre_completo || 'Sin Asignar',
        fecha_inicio_custodia_actual: row.fecha_inicio_custodia_actual || new Date().toISOString(),
        detenido_por_solventacion: Boolean(row.detenido_por_solventacion),
        horas_en_custodia_actual: horasDiff,
      }
    } catch (e: any) {
      console.error('Error al cargar custodia actual:', e)
    }
  }

  /**
   * Obtiene el listado de redactores y gestores activos en la notaría.
   */
  async function obtenerPersonalDisponible() {
    try {
      const q = supabase.from?.('profiles')
      if (!q?.select) return { gestores: [], redactores: [] }

      let query = q.select('id, nombre_completo, activo, rol_id')
      if (query.eq) {
        query = query.eq('activo', true)
      }
      if (query.order) {
        query = query.order('nombre_completo', { ascending: true })
      }

      const { data, error: err } = await query
      if (err) throw err

      const profiles = (data || []) as any[]
      // Por convención notarial, todos los perfiles activos pueden actuar como redactor o gestor
      return {
        gestores: profiles.map((p) => ({ id: p.id, nombre: p.nombre_completo })),
        redactores: profiles.map((p) => ({ id: p.id, nombre: p.nombre_completo })),
      }
    } catch (e: any) {
      console.error('Error al obtener personal disponible:', e)
      return { gestores: [], redactores: [] }
    }
  }

  /**
   * Registra un evento de turnado atómicamente.
   */
  async function registrarTurnado(payload: TurnarTramitePayload): Promise<string> {
    turnando.value = true
    error.value = null

    try {
      let usuarioOrigenId = '00000000-0000-0000-0000-000000000000'
      try {
        const { data } = await (supabase.auth as any)?.getUser?.() || {}
        if (data?.user?.id) {
          usuarioOrigenId = data.user.id
        }
      } catch {
        // fallback
      }
      const rolOrigen = payload.rol_destino === 'gestor' ? 'redactor' : 'gestor'

      // Intentar primero invocar la función RPC atómica
      const rpcCall = supabase.rpc?.('fn_registrar_turnado', {
        p_escritura_id: payload.escritura_id,
        p_tramite_id: payload.tramite_id,
        p_usuario_origen_id: usuarioOrigenId,
        p_rol_origen: rolOrigen,
        p_usuario_destino_id: payload.usuario_destino_id,
        p_rol_destino: payload.rol_destino,
        p_tipo_evento: payload.tipo_evento,
        p_motivo: payload.motivo,
        p_folio_prevencion: payload.folio_prevencion || null,
        p_fecha_limite_solventacion: payload.fecha_limite_solventacion || null,
        p_documento_soporte_id: payload.documento_soporte_id || null,
        p_instrucciones: payload.instrucciones || null,
      })

      if (rpcCall) {
        const { data, error: errRpc } = await rpcCall
        if (!errRpc && data) {
          if (payload.tramiteId) await cargarCustodiaActual(payload.tramite_id!)
          await cargarHistorial(payload.tramite_id || undefined, payload.escritura_id)
          return data as string
        }
      }

      // Fallback si la función RPC aún no está montada en la instancia local
      const { data: insertData, error: insertErr } = await supabase.from('bitacora_turnado_tramites').insert({
        escritura_id: payload.escritura_id,
        tramite_id: payload.tramite_id,
        usuario_origen_id: usuarioOrigenId,
        rol_origen: rolOrigen,
        usuario_destino_id: payload.usuario_destino_id,
        rol_destino: payload.rol_destino,
        tipo_evento: payload.tipo_evento,
        motivo: payload.motivo,
        folio_prevencion: payload.folio_prevencion,
        fecha_limite_solventacion: payload.fecha_limite_solventacion,
        documento_soporte_id: payload.documento_soporte_id,
        instrucciones: payload.instrucciones,
        tiempo_custodia_horas: 0,
      }).select('id').single()

      if (insertErr) throw insertErr

      if (payload.tramite_id) {
        const detenido = payload.tipo_evento === 'devuelto_a_redactor_prevencion'
        await supabase.from('tramites_escritura').update({
          custodia_actual_rol: payload.rol_destino,
          custodio_actual_id: payload.usuario_destino_id,
          fecha_inicio_custodia_actual: new Date().toISOString(),
          detenido_por_solventacion: detenido,
        }).eq('id', payload.tramite_id)

        await cargarCustodiaActual(payload.tramite_id)
      }

      await cargarHistorial(payload.tramite_id || undefined, payload.escritura_id)
      return insertData?.id || 'ok'
    } catch (e: any) {
      error.value = e?.message || 'Error al registrar turnado'
      console.error(e)
      throw e
    } finally {
      turnando.value = false
    }
  }

  // Métodos de conveniencia por caso de uso:

  async function turnarAlGestor(payload: {
    escrituraId: string
    tramiteId: string
    gestorId: string
    instrucciones?: string
  }): Promise<string> {
    return registrarTurnado({
      escritura_id: payload.escrituraId,
      tramite_id: payload.tramiteId,
      usuario_destino_id: payload.gestorId,
      rol_destino: 'gestor',
      tipo_evento: 'turnado_a_gestor',
      motivo: 'Asignación de gestión externa a gestor notarial',
      instrucciones: payload.instrucciones,
    })
  }

  async function devolverPorPrevencion(payload: {
    escrituraId: string
    tramiteId: string
    redactorId: string
    motivo: string
    folioPrevencion?: string
    fechaLimite?: string
    instrucciones?: string
  }): Promise<string> {
    if (!payload.motivo || payload.motivo.trim() === '') {
      throw new Error('El motivo de la prevención es obligatorio para devolver el trámite.')
    }

    return registrarTurnado({
      escritura_id: payload.escrituraId,
      tramite_id: payload.tramiteId,
      usuario_destino_id: payload.redactorId,
      rol_destino: 'redactor',
      tipo_evento: 'devuelto_a_redactor_prevencion',
      motivo: payload.motivo,
      folio_prevencion: payload.folioPrevencion,
      fecha_limite_solventacion: payload.fechaLimite,
      instrucciones: payload.instrucciones,
    })
  }

  async function solventarYReturnar(payload: {
    escrituraId: string
    tramiteId: string
    gestorId: string
    motivo: string
    instrucciones?: string
  }): Promise<string> {
    if (!payload.motivo || payload.motivo.trim() === '') {
      throw new Error('Debe especificar las medidas adoptadas para solventar la observación.')
    }

    return registrarTurnado({
      escritura_id: payload.escrituraId,
      tramite_id: payload.tramiteId,
      usuario_destino_id: payload.gestorId,
      rol_destino: 'gestor',
      tipo_evento: 'solventado_reingresado',
      motivo: payload.motivo,
      instrucciones: payload.instrucciones,
    })
  }

  async function entregarConcluido(payload: {
    escrituraId: string
    tramiteId: string
    redactorId: string
    motivo?: string
  }): Promise<string> {
    return registrarTurnado({
      escritura_id: payload.escrituraId,
      tramite_id: payload.tramiteId,
      usuario_destino_id: payload.redactorId,
      rol_destino: 'redactor',
      tipo_evento: 'tramite_concluido_entregado',
      motivo: payload.motivo || 'Trámite concluido con salida favorable. Entrega de resultados al redactor.',
    })
  }

  return {
    eventos,
    custodiaActual,
    cargando,
    turnando,
    error,
    cargarHistorial,
    cargarCustodiaActual,
    obtenerPersonalDisponible,
    registrarTurnado,
    turnarAlGestor,
    devolverPorPrevencion,
    solventarYReturnar,
    entregarConcluido,
  }
}
