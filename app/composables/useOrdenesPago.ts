import { ref, computed, unref, type MaybeRef } from 'vue'
import { useSupabaseClient } from '#imports'
import type {
  OrdenPago,
  DependenciaOficialLite,
  ResumenFinancieroDerechos,
  OrdenPagoFormData,
  LiquidarOrdenPagoData,
  FiltrosOrdenesPago,
  EstadoOrdenPago,
} from '~/types/ordenesPago'
import { calcularSemaforoLineaCaptura } from '~/utils/ordenesPagoUtils'

export function useOrdenesPago(escrituraId?: MaybeRef<string | undefined>) {
  const supabase = useSupabaseClient()
  const ordenes = ref<OrdenPago[]>([])
  const dependencias = ref<DependenciaOficialLite[]>([])
  const cargando = ref(false)
  const guardando = ref(false)
  const error = ref<string | null>(null)

  /**
   * Resumen financiero reactivo calculado sobre las órdenes en memoria
   */
  const resumenFinanciero = computed<ResumenFinancieroDerechos>(() => {
    const list = ordenes.value
    let totalMonto = 0
    let montoPagado = 0
    let montoPendiente = 0
    let ordenesPorVencer = 0
    let ordenesVencidas = 0
    let totalActivas = 0

    for (const ord of list) {
      if (ord.estado === 'cancelado') continue

      totalActivas++
      const m = Number(ord.monto) || 0
      totalMonto += m

      if (ord.estado === 'pagado') {
        montoPagado += m
      } else {
        montoPendiente += m
        if (ord.semaforo === 'amarillo') {
          ordenesPorVencer++
        } else if (ord.semaforo === 'rojo') {
          ordenesVencidas++
        }
      }
    }

    return {
      total_ordenes: totalActivas,
      total_monto: totalMonto,
      monto_pagado: montoPagado,
      monto_pendiente: montoPendiente,
      ordenes_por_vencer: ordenesPorVencer,
      ordenes_vencidas: ordenesVencidas,
    }
  })

  /**
   * Carga el catálogo de dependencias oficiales
   */
  async function cargarDependencias(): Promise<void> {
    try {
      const { data, error: depError } = await supabase
        .from('cat_dependencias_oficiales')
        .select('id, sigla, nombre, portal_web')
        .eq('activo', true)
        .order('nombre', { ascending: true })

      if (depError) throw depError
      dependencias.value = (data || []) as DependenciaOficialLite[]
    } catch (err: any) {
      console.error('Error al cargar dependencias en useOrdenesPago:', err.message)
      throw err
    }
  }

  /**
   * Normaliza y enriquece una orden de pago con el semáforo y días restantes
   */
  function enriquecerOrden(item: any): OrdenPago {
    const sem = calcularSemaforoLineaCaptura(
      item.estado as EstadoOrdenPago,
      item.fecha_vencimiento_linea
    )

    return {
      ...item,
      monto: Number(item.monto) || 0,
      dias_restantes: sem.diasRestantes,
      semaforo: sem.semaforo,
      dependencia: item.dependencia || {
        id: item.dependencia_id,
        sigla: item.dependencia_sigla || '',
        nombre: item.dependencia_nombre || '',
        portal_web: item.dependencia_portal_web || null,
      },
    }
  }

  /**
   * Carga las órdenes de pago, opcionalmente filtradas por la escritura o filtros globales
   */
  async function cargarOrdenes(filtros?: FiltrosOrdenesPago): Promise<void> {
    cargando.value = true
    error.value = null

    try {
      const escId = unref(escrituraId)
      let query = supabase.from('v_ordenes_pago_resumen').select('*')

      if (escId) {
        query = query.eq('escritura_id', escId)
      }

      if (filtros?.estado && filtros.estado !== 'todos') {
        query = query.eq('estado', filtros.estado)
      }

      if (filtros?.dependencia_id && filtros.dependencia_id !== 'todas') {
        query = query.eq('dependencia_id', filtros.dependencia_id)
      }

      if (filtros?.quien_cubre && filtros.quien_cubre !== 'todos') {
        query = query.eq('quien_cubre', filtros.quien_cubre)
      }

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_emision_linea', filtros.fecha_desde)
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_emision_linea', filtros.fecha_hasta)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error: qError } = await query

      if (qError) {
        // Fallback a tabla ordenes_pago si la vista no estuviese disponible
        console.warn('Fallback a tabla ordenes_pago:', qError.message)
        let fallbackQuery = supabase
          .from('ordenes_pago')
          .select('*, dependencia:cat_dependencias_oficiales(id, sigla, nombre, portal_web)')
        if (escId) fallbackQuery = fallbackQuery.eq('escritura_id', escId)
        const { data: fbData, error: fbError } = await fallbackQuery
        if (fbError) throw fbError
        ordenes.value = (fbData || []).map(enriquecerOrden)
      } else {
        ordenes.value = (data || []).map(enriquecerOrden)
      }

      // Filtrado client-side adicional si se especificó vencimiento o búsqueda de texto
      if (filtros?.vencimiento && filtros.vencimiento !== 'todas') {
        ordenes.value = ordenes.value.filter((o) => {
          if (o.estado === 'pagado' || o.estado === 'cancelado') return false
          if (filtros.vencimiento === 'vencidas') return o.semaforo === 'rojo'
          if (filtros.vencimiento === 'por_vencer_3_dias') return o.semaforo === 'amarillo'
          if (filtros.vencimiento === 'vigentes') return o.semaforo === 'verde'
          return true
        })
      }

      if (filtros?.busqueda && filtros.busqueda.trim() !== '') {
        const term = filtros.busqueda.toLowerCase().trim()
        ordenes.value = ordenes.value.filter(
          (o) =>
            o.folio.toLowerCase().includes(term) ||
            (o.linea_captura && o.linea_captura.toLowerCase().includes(term)) ||
            o.concepto.toLowerCase().includes(term) ||
            (o.escritura_instrumento && o.escritura_instrumento.toLowerCase().includes(term)) ||
            (o.dependencia?.sigla && o.dependencia.sigla.toLowerCase().includes(term))
        )
      }
    } catch (err: any) {
      error.value = err.message || 'Error al cargar órdenes de pago'
      console.error(error.value)
    } finally {
      cargando.value = false
    }
  }

  /**
   * Guarda o actualiza una orden de pago
   */
  async function guardarOrden(data: OrdenPagoFormData, ordenId?: string): Promise<OrdenPago> {
    guardando.value = true
    error.value = null

    try {
      const payload: any = {
        escritura_id: data.escritura_id,
        tramite_id: data.tramite_id || null,
        dependencia_id: data.dependencia_id,
        concepto: data.concepto,
        monto: Number(data.monto) || 0,
        linea_captura: data.linea_captura ? data.linea_captura.trim() : null,
        fecha_emision_linea: data.fecha_emision_linea || new Date().toISOString().slice(0, 10),
        fecha_vencimiento_linea: data.fecha_vencimiento_linea || null,
        quien_cubre: data.quien_cubre || 'adquirente',
        observaciones: data.observaciones ? data.observaciones.trim() : null,
      }

      let resData: any = null

      if (ordenId) {
        const { data: updateRes, error: updateErr } = await supabase
          .from('ordenes_pago')
          .update(payload)
          .eq('id', ordenId)
          .select()
          .single()

        if (updateErr) throw updateErr
        resData = updateRes
      } else {
        const { data: insertRes, error: insertErr } = await supabase
          .from('ordenes_pago')
          .insert(payload)
          .select()
          .single()

        if (insertErr) throw insertErr
        resData = insertRes
      }

      await cargarOrdenes()
      return enriquecerOrden(resData)
    } catch (err: any) {
      error.value = err.message || 'Error al guardar la orden de pago'
      throw err
    } finally {
      guardando.value = false
    }
  }

  /**
   * Asienta la liquidación bancaria de una orden de pago
   */
  async function liquidarOrden(
    data: LiquidarOrdenPagoData,
    comprobanteDocumentoId?: string | null
  ): Promise<void> {
    guardando.value = true
    error.value = null

    try {
      const updatePayload: any = {
        estado: 'pagado',
        metodo_pago: data.metodo_pago,
        folio_autorizacion_bancaria: data.folio_autorizacion_bancaria.trim(),
        fecha_pago: data.fecha_pago || new Date().toISOString().slice(0, 10),
        comprobante_documento_id: comprobanteDocumentoId || null,
        observaciones: data.observaciones ? data.observaciones.trim() : null,
      }

      const { error: liqError } = await supabase
        .from('ordenes_pago')
        .update(updatePayload)
        .eq('id', data.orden_pago_id)

      if (liqError) throw liqError

      await cargarOrdenes()
    } catch (err: any) {
      error.value = err.message || 'Error al liquidar la orden de pago'
      throw err
    } finally {
      guardando.value = false
    }
  }

  /**
   * Cancela una orden de pago asentando el motivo obligatorio
   */
  async function cancelarOrden(ordenId: string, motivo: string): Promise<void> {
    if (!motivo || motivo.trim() === '') {
      throw new Error('El motivo de cancelación es obligatorio')
    }

    guardando.value = true
    error.value = null

    try {
      const { error: cancelError } = await supabase
        .from('ordenes_pago')
        .update({
          estado: 'cancelado',
          motivo_cancelacion: motivo.trim(),
        })
        .eq('id', ordenId)

      if (cancelError) throw cancelError

      await cargarOrdenes()
    } catch (err: any) {
      error.value = err.message || 'Error al cancelar la orden de pago'
      throw err
    } finally {
      guardando.value = false
    }
  }

  /**
   * Consulta una orden de pago específica por ID
   */
  async function consultarOrdenPorId(ordenId: string): Promise<OrdenPago | null> {
    try {
      const { data, error: qError } = await supabase
        .from('v_ordenes_pago_resumen')
        .select('*')
        .eq('id', ordenId)
        .single()

      if (qError) {
        const { data: fbData, error: fbError } = await supabase
          .from('ordenes_pago')
          .select('*, dependencia:cat_dependencias_oficiales(*)')
          .eq('id', ordenId)
          .single()
        if (fbError) return null
        return enriquecerOrden(fbData)
      }

      return enriquecerOrden(data)
    } catch {
      return null
    }
  }

  return {
    ordenes,
    dependencias,
    cargando,
    guardando,
    error,
    resumenFinanciero,
    cargarDependencias,
    cargarOrdenes,
    guardarOrden,
    liquidarOrden,
    cancelarOrden,
    consultarOrdenPorId,
  }
}
