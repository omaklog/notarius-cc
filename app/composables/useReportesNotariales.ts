import { ref, computed } from 'vue'
import { useSupabaseClient } from '#imports'
import type {
  ResumenKpisMes,
  RedactorCargaItem,
  ActoDemandaItem,
  ReporteEscrituraGeneralItem,
  VolumenIndiceCard,
  EscrituraIndiceItem,
  FiltrosReportesPeriodo,
  ResumenFinancieroCobranza,
} from '~/types/reportes'

export function useReportesNotariales() {
  const supabase = useSupabaseClient()

  // 1. Estados Reactivos del Dashboard
  const hoy = new Date()
  const periodo = ref<FiltrosReportesPeriodo>({
    mes: hoy.getMonth() + 1,
    anio: hoy.getFullYear(),
  })

  const cargando = ref(false)
  const error = ref<string | null>(null)

  const kpisMes = ref<ResumenKpisMes>({
    total_abiertas_mes: 0,
    total_firmadas_mes: 0,
    total_en_tramite: 0,
    total_canceladas: 0,
  })

  const cargaRedactores = ref<RedactorCargaItem[]>([])
  const topActos = ref<ActoDemandaItem[]>([])

  // 2. Estados Reactivos del Reporte General
  const escriturasGeneral = ref<ReporteEscrituraGeneralItem[]>([])
  const filtroEstatusGeneral = ref<string>('todas')
  const busquedaGeneral = ref<string>('')
  const cargandoGeneral = ref(false)

  // 3. Estados Reactivos de Índices por Volumen
  const volumenes = ref<VolumenIndiceCard[]>([])
  const volumenActivo = ref<number | null>(null)
  const escriturasDelVolumen = ref<EscrituraIndiceItem[]>([])
  const cargandoVolumenes = ref(false)
  const cargandoDetalleVolumen = ref(false)
  const guardandoFoliado = ref(false)

  // 4. Estados Reactivos de Finanzas (Protegido)
  const finanzas = ref<ResumenFinancieroCobranza>({
    total_cobrado_mes: 0,
    total_saldo_pendiente: 0,
    cuentas_deudoras: [],
  })
  const cargandoFinanzas = ref(false)

  // ==========================================
  // MÉTODOS DEL DASHBOARD EJECUTIVO
  // ==========================================

  async function cambiarPeriodo(mes: number, anio: number) {
    periodo.value = { mes, anio }
    await cargarDashboard()
  }

  async function cargarDashboard() {
    cargando.value = true
    error.value = null

    try {
      const q = supabase.from?.('escrituras')
      if (!q?.select) {
        cargando.value = false
        return
      }

      let query = q.select(`
        id,
        instrumento,
        anio,
        volumen,
        estatus,
        fecha_celebracion,
        created_at,
        responsable_id,
        acto_juridico_id,
        profiles ( id, nombre ),
        actos_juridicos ( id, nombre )
      `)

      if (query.order) {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error: err } = await query

      if (err) {
        error.value = err.message
        return
      }

      const lista = (data || []) as any[]

      // Filtrar escrituras asociadas al mes y año del periodo
      const mesConsultado = periodo.value.mes
      const anioConsultado = periodo.value.anio

      let abiertasMes = 0
      let firmadasMes = 0
      let enTramite = 0
      let canceladas = 0

      const mapaRedactores: Record<string, { nombre: string; cantidad: number }> = {}
      const mapaActos: Record<string, { nombre: string; cantidad: number }> = {}

      for (const esc of lista) {
        const dCreated = esc.created_at ? new Date(esc.created_at) : null
        const dFirma = esc.fecha_celebracion ? new Date(esc.fecha_celebracion + 'T00:00:00') : null

        const creadoEnMes = dCreated && (dCreated.getMonth() + 1) === mesConsultado && dCreated.getFullYear() === anioConsultado
        const firmadoEnMes = dFirma && (dFirma.getMonth() + 1) === mesConsultado && dFirma.getFullYear() === anioConsultado

        if (creadoEnMes) {
          abiertasMes++

          // Distribución por Redactor (sobre escrituras abiertas en el mes)
          const redId = esc.responsable_id || 'sin_asignar'
          const redNombre = esc.profiles?.nombre || 'Sin Asignar'
          if (!mapaRedactores[redId]) {
            mapaRedactores[redId] = { nombre: redNombre, cantidad: 0 }
          }
          mapaRedactores[redId].cantidad++

          // Demanda de Actos Notariales (sobre abiertas en el mes)
          const actoId = esc.acto_juridico_id || 'sin_acto'
          const actoNombre = esc.actos_juridicos?.nombre || 'Otro Acto'
          if (!mapaActos[actoId]) {
            mapaActos[actoId] = { nombre: actoNombre, cantidad: 0 }
          }
          mapaActos[actoId].cantidad++
        }

        if (firmadoEnMes && esc.estatus === 'protocolizada') {
          firmadasMes++
        }

        if (esc.estatus === 'borrador') {
          enTramite++
        } else if (esc.estatus === 'anulada') {
          if (creadoEnMes || firmadoEnMes) {
            canceladas++
          }
        }
      }

      kpisMes.value = {
        total_abiertas_mes: abiertasMes,
        total_firmadas_mes: firmadasMes,
        total_en_tramite: enTramite,
        total_canceladas: canceladas,
      }

      // Procesar Carga de Redactores
      const listaRedactores: RedactorCargaItem[] = []
      for (const [rId, item] of Object.entries(mapaRedactores)) {
        const pct = abiertasMes > 0 ? Number(((item.cantidad / abiertasMes) * 100).toFixed(1)) : 0
        listaRedactores.push({
          redactor_id: rId,
          nombre: item.nombre,
          cantidad_escrituras: item.cantidad,
          porcentaje: pct,
        })
      }
      listaRedactores.sort((a, b) => b.cantidad_escrituras - a.cantidad_escrituras)
      cargaRedactores.value = listaRedactores

      // Procesar Top 5 Actos Notariales
      const listaActos: ActoDemandaItem[] = []
      for (const [aId, item] of Object.entries(mapaActos)) {
        const pct = abiertasMes > 0 ? Number(((item.cantidad / abiertasMes) * 100).toFixed(1)) : 0
        listaActos.push({
          acto_id: aId,
          nombre: item.nombre,
          cantidad: item.cantidad,
          porcentaje: pct,
        })
      }
      listaActos.sort((a, b) => b.cantidad - a.cantidad)
      topActos.value = listaActos.slice(0, 5)
    } catch (e: any) {
      error.value = e?.message || 'Error cargando dashboard de reportes'
    } finally {
      cargando.value = false
    }
  }

  // ==========================================
  // MÉTODOS DEL REPORTE GENERAL DE ESCRITURAS
  // ==========================================

  async function cargarReporteGeneral() {
    cargandoGeneral.value = true
    try {
      const q = supabase.from?.('escrituras')
      if (!q?.select) {
        cargandoGeneral.value = false
        return
      }

      let query = q.select(`
        id,
        instrumento,
        anio,
        volumen,
        fecha_celebracion,
        estatus,
        actos_juridicos ( nombre ),
        profiles ( nombre ),
        tramites ( id, estatus )
      `)

      if (query.order) {
        query = query.order('instrumento', { ascending: false })
      }

      const { data, error: err } = await query
      if (err) throw err

      const items: ReporteEscrituraGeneralItem[] = []
      for (const row of (data || []) as any[]) {
        const tramitesList = Array.isArray(row.tramites) ? row.tramites : []
        const asignados = tramitesList.filter((t: any) => t.estatus !== 'concluido' && t.estatus !== 'cancelado').length
        const liberados = tramitesList.filter((t: any) => t.estatus === 'concluido').length

        items.push({
          id: row.id,
          instrumento: row.instrumento,
          anio: row.anio,
          volumen: row.volumen,
          fecha_celebracion: row.fecha_celebracion,
          acto_nombre: row.actos_juridicos?.nombre || 'Sin Acto',
          redactor_nombre: row.profiles?.nombre || 'Sin Asignar',
          estatus: row.estatus,
          tramites_asignados: asignados,
          tramites_liberados: liberados,
        })
      }

      escriturasGeneral.value = items
    } catch (e: any) {
      console.error('Error al cargar reporte general de escrituras:', e)
    } finally {
      cargandoGeneral.value = false
    }
  }

  const escriturasFiltradasGeneral = computed(() => {
    let result = escriturasGeneral.value

    if (filtroEstatusGeneral.value !== 'todas') {
      result = result.filter((e) => e.estatus === filtroEstatusGeneral.value)
    }

    if (busquedaGeneral.value.trim() !== '') {
      const q = busquedaGeneral.value.toLowerCase().trim()
      result = result.filter(
        (e) =>
          String(e.instrumento).includes(q) ||
          e.acto_nombre.toLowerCase().includes(q) ||
          e.redactor_nombre.toLowerCase().includes(q) ||
          String(e.volumen).includes(q)
      )
    }

    return result
  })

  function exportarReporteGeneralCSV() {
    const encabezados = [
      'No. Instrumento',
      'Año',
      'Volumen',
      'Fecha Celebración',
      'Acto Jurídico',
      'Redactor Responsable',
      'Estatus Notarial',
      'Trámites Activos Asignados',
      'Trámites Liberados',
    ]

    const filas = escriturasFiltradasGeneral.value.map((e) => [
      e.instrumento,
      e.anio,
      e.volumen,
      e.fecha_celebracion || 'Pendiente',
      `"${e.acto_nombre.replace(/"/g, '""')}"`,
      `"${e.redactor_nombre.replace(/"/g, '""')}"`,
      e.estatus.toUpperCase(),
      e.tramites_asignados,
      e.tramites_liberados,
    ])

    const csvContent = '\uFEFF' + [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n')
    descargarArchivo(csvContent, `Reporte_General_Escrituras_${periodo.value.anio}_${periodo.value.mes}.csv`, 'text/csv;charset=utf-8;')
  }

  // ==========================================
  // MÉTODOS DE ÍNDICES NOTARIALES POR VOLUMEN
  // ==========================================

  async function cargarVolumenes() {
    cargandoVolumenes.value = true
    try {
      const q = supabase.from?.('escrituras')
      if (!q?.select) {
        cargandoVolumenes.value = false
        return
      }

      let query = q.select('volumen, anio, instrumento, pagina_inicial, pagina_final, estatus')
      if (query.order) {
        query = query.order('volumen', { ascending: false }).order('instrumento', { ascending: true })
      }

      const { data, error: err } = await query
      if (err) throw err

      const mapaVol: Record<number, {
        volumen: number
        anio: number
        total: number
        desde: number
        hasta: number
        foliadas: number
      }> = {}

      for (const row of (data || []) as any[]) {
        const v = row.volumen
        if (!mapaVol[v]) {
          mapaVol[v] = {
            volumen: v,
            anio: row.anio || periodo.value.anio,
            total: 0,
            desde: row.instrumento,
            hasta: row.instrumento,
            foliadas: 0,
          }
        }
        mapaVol[v].total++
        if (row.instrumento < mapaVol[v].desde) mapaVol[v].desde = row.instrumento
        if (row.instrumento > mapaVol[v].hasta) mapaVol[v].hasta = row.instrumento

        if (row.pagina_inicial != null && row.pagina_final != null) {
          mapaVol[v].foliadas++
        }
      }

      const listaVol: VolumenIndiceCard[] = []
      for (const vNum of Object.keys(mapaVol).map(Number)) {
        const item = mapaVol[vNum]
        const pendientes = item.total - item.foliadas
        listaVol.push({
          volumen: item.volumen,
          anio: item.anio,
          total_escrituras: item.total,
          instrumento_desde: item.desde,
          instrumento_hasta: item.hasta,
          escrituras_foliadas: item.foliadas,
          escrituras_pendientes: pendientes,
          foliado_completo: item.total > 0 && pendientes === 0,
        })
      }

      listaVol.sort((a, b) => b.volumen - a.volumen)
      volumenes.value = listaVol
    } catch (e: any) {
      console.error('Error al cargar volúmenes para índices:', e)
    } finally {
      cargandoVolumenes.value = false
    }
  }

  async function seleccionarVolumen(volumen: number) {
    volumenActivo.value = volumen
    cargandoDetalleVolumen.value = true

    try {
      const q = supabase.from?.('escrituras')
      if (!q?.select) {
        cargandoDetalleVolumen.value = false
        return
      }

      let query = q.select(`
        id,
        instrumento,
        volumen,
        fecha_celebracion,
        estatus,
        pagina_inicial,
        pagina_final,
        actos_juridicos ( nombre ),
        escritura_comparecientes (
          rol,
          comparecientes ( nombre )
        )
      `)

      if (query.eq) {
        query = query.eq('volumen', volumen)
      }
      if (query.order) {
        query = query.order('instrumento', { ascending: true })
      }

      const { data, error: err } = await query
      if (err) throw err

      const items: EscrituraIndiceItem[] = []
      for (const row of (data || []) as any[]) {
        const comparecientes = (row.escritura_comparecientes || []).map((ec: any) => ({
          rol: ec.rol || 'Compareciente',
          nombre: ec.comparecientes?.nombre || 'Compareciente',
        }))

        items.push({
          id: row.id,
          instrumento: row.instrumento,
          volumen: row.volumen,
          fecha_celebracion: row.fecha_celebracion,
          acto_nombre: row.actos_juridicos?.nombre || 'Sin Acto',
          comparecientes_resumen: comparecientes,
          pagina_inicial: row.pagina_inicial,
          pagina_final: row.pagina_final,
          estatus: row.estatus,
        })
      }

      escriturasDelVolumen.value = items
    } catch (e: any) {
      console.error('Error al cargar escrituras del volumen:', e)
    } finally {
      cargandoDetalleVolumen.value = false
    }
  }

  async function actualizarFoliadoEscritura(
    escrituraId: string,
    paginaInicial: number | null,
    paginaFinal: number | null
  ): Promise<boolean> {
    if (paginaInicial != null && paginaFinal != null && paginaFinal < paginaInicial) {
      throw new Error('La página final no puede ser menor a la página inicial')
    }

    guardandoFoliado.value = true
    try {
      const q = supabase.from?.('escrituras')
      if (!q?.update) return false

      let queryUpdate = q.update({
        pagina_inicial: paginaInicial,
        pagina_final: paginaFinal,
      })

      if (queryUpdate.eq) {
        queryUpdate = queryUpdate.eq('id', escrituraId)
      }

      const { error: err } = await queryUpdate
      if (err) throw err

      // Actualizar localmente la fila
      const idx = escriturasDelVolumen.value.findIndex((e) => e.id === escrituraId)
      if (idx !== -1) {
        escriturasDelVolumen.value[idx].pagina_inicial = paginaInicial
        escriturasDelVolumen.value[idx].pagina_final = paginaFinal
      }

      // Recalcular el volumen en la lista de cards
      if (volumenActivo.value !== null) {
        const vIdx = volumenes.value.findIndex((v) => v.volumen === volumenActivo.value)
        if (vIdx !== -1) {
          const totalFoliadas = escriturasDelVolumen.value.filter(
            (e) => e.pagina_inicial != null && e.pagina_final != null
          ).length
          const total = escriturasDelVolumen.value.length
          const pendientes = total - totalFoliadas
          volumenes.value[vIdx].escrituras_foliadas = totalFoliadas
          volumenes.value[vIdx].escrituras_pendientes = pendientes
          volumenes.value[vIdx].foliado_completo = total > 0 && pendientes === 0
        }
      }

      return true
    } catch (e: any) {
      console.error('Error al actualizar foliado de la escritura:', e)
      throw e
    } finally {
      guardandoFoliado.value = false
    }
  }

  function exportarIndiceVolumenCSV(volumen: number) {
    const encabezados = [
      'No. Instrumento',
      'Volumen',
      'Fecha Celebración',
      'Acto Jurídico',
      'Partes / Comparecientes',
      'Página Inicial',
      'Página Final',
      'Estatus / Observaciones',
    ]

    const filas = escriturasDelVolumen.value.map((e) => {
      const parts = e.comparecientes_resumen.map((c) => `${c.rol}: ${c.nombre}`).join('; ')
      const obs = e.estatus === 'anulada' ? 'CANCELADA (NO PASÓ)' : e.estatus === 'protocolizada' ? 'FIRMADA' : 'EN TRÁMITE DE FIRMA'

      return [
        e.instrumento,
        e.volumen,
        e.fecha_celebracion || 'Pendiente',
        `"${e.acto_nombre.replace(/"/g, '""')}"`,
        `"${parts.replace(/"/g, '""')}"`,
        e.pagina_inicial ?? '',
        e.pagina_final ?? '',
        `"${obs}"`,
      ]
    })

    const csvContent = '\uFEFF' + [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n')
    descargarArchivo(csvContent, `Indice_Protocolo_Volumen_${volumen}.csv`, 'text/csv;charset=utf-8;')
  }

  // ==========================================
  // MÉTODOS FINANCIEROS (PROTEGIDO)
  // ==========================================

  async function cargarFinanzas() {
    cargandoFinanzas.value = true
    try {
      const q = supabase.from?.('honorarios_cuentas')
      if (!q?.select) {
        cargandoFinanzas.value = false
        return
      }

      let query = q.select(`
        id,
        escritura_id,
        total_honorarios,
        saldo_pendiente,
        escrituras (
          id,
          instrumento
        ),
        honorarios_pagos (
          monto,
          fecha_pago
        )
      `)

      const { data, error: err } = await query
      if (err) throw err

      let totalCobrado = 0
      let totalSaldo = 0
      const deudores: any[] = []

      for (const c of (data || []) as any[]) {
        const pagos = Array.isArray(c.honorarios_pagos) ? c.honorarios_pagos : []
        for (const p of pagos) {
          totalCobrado += Number(p.monto || 0)
        }
        const saldo = Number(c.saldo_pendiente || 0)
        totalSaldo += saldo

        if (saldo > 0) {
          deudores.push({
            escritura_id: c.escritura_id,
            instrumento: c.escrituras?.instrumento || 0,
            cliente_nombre: 'Cliente de la Escritura',
            monto_total: Number(c.total_honorarios || 0),
            monto_pagado: Number((c.total_honorarios || 0) - saldo),
            saldo_pendiente: saldo,
          })
        }
      }

      finanzas.value = {
        total_cobrado_mes: totalCobrado,
        total_saldo_pendiente: totalSaldo,
        cuentas_deudoras: deudores,
      }
    } catch (e: any) {
      console.error('Error al cargar información financiera:', e)
    } finally {
      cargandoFinanzas.value = false
    }
  }

  // ==========================================
  // UTILIDAD DE DESCARGA
  // ==========================================

  function descargarArchivo(contenido: string, nombreArchivo: string, tipoMime: string) {
    if (typeof window === 'undefined') return
    const blob = new Blob([contenido], { type: tipoMime })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', nombreArchivo)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return {
    periodo,
    cargando,
    error,
    kpisMes,
    cargaRedactores,
    topActos,
    escriturasGeneral,
    escriturasFiltradasGeneral,
    filtroEstatusGeneral,
    busquedaGeneral,
    cargandoGeneral,
    volumenes,
    volumenActivo,
    escriturasDelVolumen,
    cargandoVolumenes,
    cargandoDetalleVolumen,
    guardandoFoliado,
    finanzas,
    cargandoFinanzas,
    cambiarPeriodo,
    cargarDashboard,
    cargarReporteGeneral,
    exportarReporteGeneralCSV,
    cargarVolumenes,
    seleccionarVolumen,
    actualizarFoliadoEscritura,
    exportarIndiceVolumenCSV,
    cargarFinanzas,
  }
}
