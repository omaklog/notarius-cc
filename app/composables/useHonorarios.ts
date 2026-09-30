import { ref, computed, unref, type MaybeRef } from 'vue'
import { useSupabaseClient } from '#imports'
import type {
  HonorariosCuenta,
  HonorariosPartida,
  HonorariosPago,
  HojaLiquidacionConsolidada,
  ResumenLiquidacionTerceros,
  HonorariosKpis,
} from '~/types/honorarios'
import { useHonorariosCalculos } from '~/composables/useHonorariosCalculos'

export function useHonorarios(escrituraIdParam?: MaybeRef<string | undefined>) {
  const supabase = useSupabaseClient()
  const { calcularTotalesPartidas, calcularSaldoYEstado, consolidarHojaLiquidacion } = useHonorariosCalculos()

  const cuenta = ref<HonorariosCuenta | null>(null)
  const partidas = ref<HonorariosPartida[]>([])
  const pagos = ref<HonorariosPago[]>([])
  const ordenesPagoTerceros = ref<any[]>([])
  const cargando = ref(false)
  const guardando = ref(false)
  const error = ref<string | null>(null)

  const kpis = ref<HonorariosKpis>({
    total_cobrado_mes: 0,
    saldo_total_pendiente: 0,
    total_cotizado_acumulado: 0,
    cuentas_liquidadas: 0,
    cuentas_activas: 0,
    porcentaje_efectividad: 0,
  })

  const hojaLiquidacion = computed<HojaLiquidacionConsolidada | null>(() => {
    const id = unref(escrituraIdParam)
    if (!id || !cuenta.value) return null

    return consolidarHojaLiquidacion({
      escrituraId: id,
      instrumento: (cuenta.value as any)?.escritura_instrumento || 'S/N',
      objeto: (cuenta.value as any)?.escritura_objeto || '',
      actoNombre: (cuenta.value as any)?.acto_nombre || '',
      partidas: partidas.value,
      pagos: pagos.value,
      ordenesPago: ordenesPagoTerceros.value,
    })
  })

  /**
   * Carga o inicializa la cuenta de honorarios de la escritura
   */
  async function cargarCuenta(idParam?: string): Promise<void> {
    const id = idParam || unref(escrituraIdParam)
    if (!id) return

    cargando.value = true
    error.value = null

    try {
      // 1. Obtener o crear cuenta maestra
      let { data: cuentaData, error: cuentaError } = await supabase
        .from('honorarios_cuentas')
        .select('*')
        .eq('escritura_id', id)
        .maybeSingle()

      if (cuentaError) throw cuentaError

      if (!cuentaData) {
        // Crear cuenta inicial en estado borrador
        const { data: nuevaCuenta, error: insertError } = await supabase
          .from('honorarios_cuentas')
          .insert({
            escritura_id: id,
            subtotal_gravado: 0,
            subtotal_exento: 0,
            descuento_total: 0,
            iva_total: 0,
            total_cotizado: 0,
            total_pagado: 0,
            saldo_pendiente: 0,
            estatus: 'borrador',
          })
          .select('*')
          .single()

        if (insertError) throw insertError
        cuentaData = nuevaCuenta
      }

      // Obtener datos complementarios de la escritura para la hoja de liquidación
      const { data: escData } = await supabase
        .from('escrituras')
        .select('instrumento, objeto, actos_juridicos(nombre)')
        .eq('id', id)
        .maybeSingle()

      const cuentaObj = {
        ...cuentaData,
        escritura_instrumento: escData?.instrumento ?? '',
        escritura_objeto: escData?.objeto ?? '',
        acto_nombre: (escData?.actos_juridicos as any)?.nombre ?? '',
      } as HonorariosCuenta

      cuenta.value = cuentaObj

      // 2. Obtener partidas de la cotización
      const { data: partidasData, error: partidasError } = await supabase
        .from('honorarios_partidas')
        .select('*')
        .eq('cuenta_id', cuentaData.id)
        .order('orden', { ascending: true })
        .order('created_at', { ascending: true })

      if (partidasError) throw partidasError
      partidas.value = (partidasData || []) as HonorariosPartida[]

      // 3. Obtener pagos y anticipos recibidos
      const { data: pagosData, error: pagosError } = await supabase
        .from('honorarios_pagos')
        .select('*')
        .eq('cuenta_id', cuentaData.id)
        .order('fecha_pago', { ascending: false })
        .order('created_at', { ascending: false })

      if (pagosError) throw pagosError
      pagos.value = (pagosData || []) as HonorariosPago[]

      // 4. Obtener órdenes de pago de terceros de la misma escritura
      const { data: opData } = await supabase
        .from('ordenes_pago')
        .select('id, folio, concepto, monto, estado, cat_dependencias_oficiales(sigla)')
        .eq('escritura_id', id)

      ordenesPagoTerceros.value = (opData || []).map((o: any) => ({
        id: o.id,
        folio: o.folio,
        concepto: o.concepto,
        monto: Number(o.monto) || 0,
        estado: o.estado,
        dependencia: o.cat_dependencias_oficiales?.sigla || 'GOB',
      }))
    } catch (err: any) {
      error.value = err.message || 'Error al cargar cuenta de honorarios'
    } finally {
      cargando.value = false
    }
  }

  /**
   * Guarda o actualiza una partida libre de cotización
   */
  async function guardarPartida(partida: Partial<HonorariosPartida>): Promise<boolean> {
    if (!cuenta.value) return false
    guardando.value = true
    error.value = null

    try {
      if (partida.id) {
        // Actualizar
        const { error: updError } = await supabase
          .from('honorarios_partidas')
          .update({
            concepto: partida.concepto,
            monto: partida.monto,
            aplica_iva: partida.aplica_iva,
            tasa_iva: partida.aplica_iva ? 0.16 : 0.00,
            es_descuento: partida.es_descuento || false,
            orden: partida.orden || 0,
          })
          .eq('id', partida.id)

        if (updError) throw updError
      } else {
        // Insertar
        const { error: insError } = await supabase
          .from('honorarios_partidas')
          .insert({
            cuenta_id: cuenta.value.id,
            concepto: partida.concepto,
            monto: partida.monto,
            aplica_iva: partida.aplica_iva ?? true,
            tasa_iva: partida.aplica_iva ? 0.16 : 0.00,
            es_descuento: partida.es_descuento || false,
            orden: partidas.value.length,
          })

        if (insError) throw insError
      }

      await cargarCuenta()
      return true
    } catch (err: any) {
      error.value = err.message || 'Error al guardar partida de honorarios'
      return false
    } finally {
      guardando.value = false
    }
  }

  /**
   * Elimina una partida de cotización
   */
  async function eliminarPartida(partidaId: string): Promise<boolean> {
    guardando.value = true
    error.value = null

    try {
      const { error: delError } = await supabase
        .from('honorarios_partidas')
        .delete()
        .eq('id', partidaId)

      if (delError) throw delError
      await cargarCuenta()
      return true
    } catch (err: any) {
      error.value = err.message || 'Error al eliminar partida'
      return false
    } finally {
      guardando.value = false
    }
  }

  /**
   * Registra un pago único o anticipo del cliente
   */
  async function registrarPago(pago: Partial<HonorariosPago>): Promise<boolean> {
    if (!cuenta.value) return false
    guardando.value = true
    error.value = null

    try {
      const { error: insError } = await supabase
        .from('honorarios_pagos')
        .insert({
          cuenta_id: cuenta.value.id,
          monto: pago.monto,
          fecha_pago: pago.fecha_pago || new Date().toISOString().substring(0, 10),
          metodo_pago: pago.metodo_pago,
          referencia_bancaria: pago.referencia_bancaria || null,
          concepto: pago.concepto || 'Anticipo de gastos y honorarios',
          notas: pago.notas || null,
        })

      if (insError) throw insError
      await cargarCuenta()
      return true
    } catch (err: any) {
      error.value = err.message || 'Error al asentar pago'
      return false
    } finally {
      guardando.value = false
    }
  }

  /**
   * Actualiza los datos fiscales CFDI 4.0 de la cuenta
   */
  async function actualizarCfdi(datos: Partial<HonorariosCuenta>): Promise<boolean> {
    if (!cuenta.value) return false
    guardando.value = true
    error.value = null

    try {
      const { error: updError } = await supabase
        .from('honorarios_cuentas')
        .update({
          rfc_receptor: datos.rfc_receptor,
          razon_social_receptor: datos.razon_social_receptor,
          regimen_fiscal_receptor: datos.regimen_fiscal_receptor,
          codigo_postal_fiscal: datos.codigo_postal_fiscal,
          uso_cfdi: datos.uso_cfdi,
          estatus_facturacion: datos.estatus_facturacion || 'pendiente',
          uuid_fiscal: datos.uuid_fiscal || null,
          fecha_timbrado: datos.uuid_fiscal ? (datos.fecha_timbrado || new Date().toISOString()) : null,
          metodo_pago_sat: datos.metodo_pago_sat || 'PUE',
          forma_pago_sat: datos.forma_pago_sat || '03',
          updated_at: new Date().toISOString(),
        })
        .eq('id', cuenta.value.id)

      if (updError) throw updError
      await cargarCuenta()
      return true
    } catch (err: any) {
      error.value = err.message || 'Error al actualizar datos de facturación'
      return false
    } finally {
      guardando.value = false
    }
  }

  /**
   * Carga los KPIs consolidados para el tablero /honorarios
   */
  async function cargarKpis(): Promise<void> {
    try {
      const { data: cuentasData, error: err } = await supabase
        .from('honorarios_cuentas')
        .select('total_cotizado, total_pagado, saldo_pendiente, estatus, created_at')

      if (err) throw err
      const list = cuentasData || []

      let totalCobrado = 0
      let saldoTotal = 0
      let totalCotizado = 0
      let liquidadas = 0
      let activas = 0

      for (const c of list) {
        if (c.estatus === 'cancelado') continue
        activas++
        const cot = Number(c.total_cotizado) || 0
        const pag = Number(c.total_pagado) || 0
        const sal = Number(c.saldo_pendiente) || 0

        totalCotizado += cot
        totalCobrado += pag
        saldoTotal += sal

        if (c.estatus === 'liquidado') {
          liquidadas++
        }
      }

      const efectividad = totalCotizado > 0 ? Math.round((totalCobrado / totalCotizado) * 100) : 0

      kpis.value = {
        total_cobrado_mes: totalCobrado,
        saldo_total_pendiente: saldoTotal,
        total_cotizado_acumulado: totalCotizado,
        cuentas_liquidadas: liquidadas,
        cuentas_activas: activas,
        porcentaje_efectividad: efectividad,
      }
    } catch (err: any) {
      console.error('Error al cargar KPIs de cobranza:', err)
    }
  }

  return {
    cuenta,
    partidas,
    pagos,
    ordenesPagoTerceros,
    cargando,
    guardando,
    error,
    kpis,
    hojaLiquidacion,
    cargarCuenta,
    guardarPartida,
    eliminarPartida,
    registrarPago,
    actualizarCfdi,
    cargarKpis,
  }
}
