import { ref, computed } from 'vue'
import { useSupabaseClient } from '#imports'
import type { RespuestaConsultaInegi } from '~~/server/api/uma/consultar-inegi.get'

export interface UmaRegistro {
  id?: string
  valor: number
  fecha_inicio_vigencia: string
  fecha_fin_vigencia?: string | null
  notas?: string | null
  fuente?: string | null
  created_at?: string
  updated_at?: string
  created_by?: string | null
}

export function calcularValorMensualUma(valorDiario: number): number {
  return Number((valorDiario * 30.4).toFixed(2))
}

export function calcularValorAnualUma(valorDiario: number): number {
  return Number((valorDiario * 30.4 * 12).toFixed(2))
}

export function useUmaHistorico() {
  const supabase = useSupabaseClient()

  const umas = ref<UmaRegistro[]>([])
  const cargando = ref(false)
  const guardando = ref(false)
  const consultandoInegi = ref(false)
  const error = ref<string | null>(null)

  const anioActual = computed(() => new Date().getFullYear())

  // UMA vigente en la fecha de hoy
  const umaVigente = computed(() => {
    if (!umas.value || umas.value.length === 0) return null
    const hoyStr = new Date().toISOString().split('T')[0]
    // Buscar registro cuya fecha de inicio sea <= hoy y fin >= hoy o null
    const vigente = umas.value.find((u) => {
      const inicioOk = u.fecha_inicio_vigencia <= hoyStr
      const finOk = !u.fecha_fin_vigencia || u.fecha_fin_vigencia >= hoyStr
      return inicioOk && finOk
    })
    return vigente || umas.value[0] || null
  })

  // Detección si para el año en curso ya se cuenta con UMA registrada o confirmada
  const requiereActualizacionAnioActual = computed(() => {
    if (!umas.value || umas.value.length === 0) return true
    const anio = anioActual.value
    // Verifica si hay algún registro que inicie en el año actual o notas de confirmación/ratificación
    const existeRegistroAnio = umas.value.some((u) => {
      if (u.fecha_inicio_vigencia && u.fecha_inicio_vigencia.startsWith(String(anio))) {
        return true
      }
      if (u.notas && u.notas.includes(String(anio))) {
        return true
      }
      return false
    })
    return !existeRegistroAnio
  })

  async function cargarHistorialUmas(): Promise<void> {
    cargando.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('uma_historico')
        .select('*')
        .order('fecha_inicio_vigencia', { ascending: false })

      if (err) throw err
      umas.value = (data as UmaRegistro[]) || []
    } catch (err: any) {
      error.value = err.message || 'Error al cargar el catálogo de UMAs'
    } finally {
      cargando.value = false
    }
  }

  async function guardarUma(registro: {
    id?: string
    valor: number
    fecha_inicio_vigencia: string
    fecha_fin_vigencia?: string | null
    notas?: string | null
    fuente?: string | null
  }): Promise<{ ok: boolean; error?: string; data?: UmaRegistro }> {
    if (!registro.valor || Number(registro.valor) <= 0) {
      return { ok: false, error: 'El valor diario de la UMA debe ser mayor a 0.' }
    }
    if (!registro.fecha_inicio_vigencia) {
      return { ok: false, error: 'La fecha de inicio de vigencia es obligatoria.' }
    }

    guardando.value = true
    error.value = null
    try {
      if (registro.id) {
        // Actualización
        const { data, error: err } = await supabase
          .from('uma_historico')
          .update({
            valor: Number(registro.valor),
            fecha_inicio_vigencia: registro.fecha_inicio_vigencia,
            fecha_fin_vigencia: registro.fecha_fin_vigencia || null,
            notas: registro.notas || null,
            fuente: registro.fuente || 'DOF / INEGI',
          })
          .eq('id', registro.id)
          .select()
          .single()

        if (err) throw err
        await cargarHistorialUmas()
        return { ok: true, data: data as UmaRegistro }
      } else {
        // Inserción
        // Si hay un registro previo sin fecha_fin_vigencia o con fin posterior, se ajusta automáticamente
        const prev = umas.value.find((u) => !u.fecha_fin_vigencia || u.fecha_fin_vigencia >= registro.fecha_inicio_vigencia)
        if (prev && prev.id) {
          const inicioDate = new Date(registro.fecha_inicio_vigencia)
          inicioDate.setDate(inicioDate.getDate() - 1)
          const finPrevio = inicioDate.toISOString().split('T')[0]
          await supabase
            .from('uma_historico')
            .update({ fecha_fin_vigencia: finPrevio })
            .eq('id', prev.id)
        }

        const { data, error: err } = await supabase
          .from('uma_historico')
          .insert({
            valor: Number(registro.valor),
            fecha_inicio_vigencia: registro.fecha_inicio_vigencia,
            fecha_fin_vigencia: registro.fecha_fin_vigencia || null,
            notas: registro.notas || null,
            fuente: registro.fuente || 'DOF / INEGI',
          })
          .select()
          .single()

        if (err) throw err
        await cargarHistorialUmas()
        return { ok: true, data: data as UmaRegistro }
      }
    } catch (err: any) {
      const msg = err.message || 'Error al guardar el registro de UMA'
      error.value = msg
      return { ok: false, error: msg }
    } finally {
      guardando.value = false
    }
  }

  async function confirmarValorActualParaAnio(anio: number = new Date().getFullYear()): Promise<{ ok: boolean; error?: string }> {
    const vigente = umaVigente.value
    if (!vigente) {
      return { ok: false, error: 'No existe ningún valor de UMA previo para ratificar.' }
    }

    return guardarUma({
      valor: vigente.valor,
      fecha_inicio_vigencia: `${anio}-02-01`,
      fecha_fin_vigencia: null,
      fuente: vigente.fuente || 'Ratificación Notarial / DOF',
      notas: `Ratificado sin cambios para el ejercicio fiscal ${anio}.`,
    })
  }

  async function consultarInegi(simular = false): Promise<RespuestaConsultaInegi> {
    consultandoInegi.value = true
    try {
      const url = simular ? '/api/uma/consultar-inegi?simular=true' : '/api/uma/consultar-inegi'
      const res = await $fetch<RespuestaConsultaInegi>(url)
      return res
    } catch (err: any) {
      return {
        ok: false,
        error: err.data?.message || err.message || 'Error al comunicarse con el servidor.',
        fuentesOficiales: [
          {
            nombre: 'INEGI - Unidad de Medida y Actualización (UMA)',
            url: 'https://www.inegi.org.mx/temas/uma/',
            descripcion: 'Página oficial con los valores de la UMA diario, mensual y anual actualizados por el INEGI.',
          },
          {
            nombre: 'Diario Oficial de la Federación (DOF)',
            url: 'https://www.dof.gob.mx/',
            descripcion: 'Publicación oficial del decreto de actualización de la UMA efectuada los primeros 10 días de enero.',
          },
        ],
      }
    } finally {
      consultandoInegi.value = false
    }
  }

  return {
    umas,
    cargando,
    guardando,
    consultandoInegi,
    error,
    anioActual,
    umaVigente,
    requiereActualizacionAnioActual,
    cargarHistorialUmas,
    guardarUma,
    confirmarValorActualParaAnio,
    consultarInegi,
  }
}
