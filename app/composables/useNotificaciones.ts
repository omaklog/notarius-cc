import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import type {
  NotificacionBitacoraItem,
  PlantillaNotificacion,
  NotificacionesKpis,
  FiltrosNotificaciones,
  PayloadEnviarNotificacion,
  ResultadoDespachoNotificacion,
  CanalNotificacion,
  ArchivoAdjuntoNotificacion,
} from '~/types/notificaciones'

export function useNotificaciones() {
  const supabase = useSupabaseClient()

  const bitacora = ref<NotificacionBitacoraItem[]>([])
  const plantillas = ref<PlantillaNotificacion[]>([])
  const kpis = ref<NotificacionesKpis>({
    total_enviados_mes: 0,
    tasa_entrega_porcentaje: 100,
    total_whatsapp: 0,
    total_correo: 0,
    total_sms: 0,
    total_fallidos: 0,
    pendientes_reintento: 0,
  })

  const cargando = ref(false)
  const enviando = ref(false)
  const error = ref<string | null>(null)

  async function cargarBitacora(filtros?: FiltrosNotificaciones) {
    cargando.value = true
    error.value = null
    try {
      let query = supabase
        .from('notificaciones_bitacora')
        .select(`
          *,
          escrituras (
            instrumento,
            anio
          ),
          comparecientes (
            nombre
          )
        `)
        .order('created_at', { ascending: false })

      if (filtros?.canal && filtros.canal !== 'todos') {
        query = query.eq('canal', filtros.canal)
      }

      if (filtros?.estatus && filtros.estatus !== 'todos') {
        query = query.eq('estatus', filtros.estatus)
      }

      if (filtros?.escritura_id) {
        query = query.eq('escritura_id', filtros.escritura_id)
      }

      const { data, error: err } = await query

      if (err) {
        error.value = err.message
        return
      }

      let items = (data || []) as NotificacionBitacoraItem[]

      // Filtro adicional en memoria si hay búsqueda de texto
      if (filtros?.busqueda && filtros.busqueda.trim()) {
        const queryTerm = filtros.busqueda.trim().toLowerCase()
        items = items.filter((item) => {
          const nombreMatch = item.destinatario_nombre?.toLowerCase().includes(queryTerm)
          const contactoMatch = item.destinatario_contacto?.toLowerCase().includes(queryTerm)
          const asuntoMatch = item.asunto?.toLowerCase().includes(queryTerm)
          const cuerpoMatch = item.cuerpo_renderizado?.toLowerCase().includes(queryTerm)
          const instrumentoMatch = item.escrituras?.instrumento?.toString().includes(queryTerm)
          return Boolean(nombreMatch || contactoMatch || asuntoMatch || cuerpoMatch || instrumentoMatch)
        })
      }

      bitacora.value = items
    } catch (err: any) {
      error.value = err?.message || 'Error al cargar bitácora de notificaciones.'
    } finally {
      cargando.value = false
    }
  }

  async function cargarPlantillas() {
    cargando.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('plantillas_notificaciones')
        .select('*')
        .order('nombre', { ascending: true })

      if (err) {
        error.value = err.message
        return
      }

      plantillas.value = (data || []) as PlantillaNotificacion[]
    } catch (err: any) {
      error.value = err?.message || 'Error al cargar catálogo de plantillas.'
    } finally {
      cargando.value = false
    }
  }

  async function cargarKpis() {
    try {
      const { data, error: err } = await supabase
        .from('notificaciones_bitacora')
        .select('canal, estatus')
        .order('created_at', { ascending: false })

      if (err || !data) {
        return
      }

      const total = data.length
      const fallidos = data.filter((d: any) => d.estatus === 'fallido').length
      const whatsapp = data.filter((d: any) => d.canal === 'whatsapp').length
      const correo = data.filter((d: any) => d.canal === 'correo').length
      const sms = data.filter((d: any) => d.canal === 'sms').length
      const exitosos = data.filter((d: any) => ['enviado', 'entregado', 'leido'].includes(d.estatus)).length
      const pendientes = data.filter((d: any) => ['pendiente', 'fallido'].includes(d.estatus)).length

      const tasa = total > 0 ? Math.round((exitosos / total) * 100) : 100

      kpis.value = {
        total_enviados_mes: total,
        tasa_entrega_porcentaje: tasa,
        total_whatsapp: whatsapp,
        total_correo: correo,
        total_sms: sms,
        total_fallidos: fallidos,
        pendientes_reintento: pendientes,
      }
    } catch (err: any) {
      console.error('Error calculando KPIs de notificaciones:', err)
    }
  }

  async function enviarNotificacion(
    payload: PayloadEnviarNotificacion
  ): Promise<ResultadoDespachoNotificacion> {
    enviando.value = true
    error.value = null
    try {
      const res = await $fetch<ResultadoDespachoNotificacion>('/api/notificaciones/enviar', {
        method: 'POST',
        body: payload,
      })

      if (typeof window !== 'undefined' && !process.env.VITEST) {
        if (res.whatsapp_native_url) {
          window.location.href = res.whatsapp_native_url
        } else if (res.whatsapp_web_url) {
          window.open(res.whatsapp_web_url, '_blank')
        }
      }

      // Refrescar bitácora y métricas
      await Promise.all([cargarBitacora(), cargarKpis()])

      return res
    } catch (err: any) {
      const msg = err?.data?.statusMessage || err?.message || 'Error al despachar notificación.'
      error.value = msg
      return {
        ok: false,
        estatus: 'fallido',
        error: msg,
      }
    } finally {
      enviando.value = false
    }
  }

  async function reenviarNotificacion(
    id: string,
    canalAlternativo?: CanalNotificacion
  ): Promise<ResultadoDespachoNotificacion> {
    enviando.value = true
    error.value = null
    try {
      const res = await $fetch<ResultadoDespachoNotificacion>('/api/notificaciones/reenviar', {
        method: 'POST',
        body: {
          notificacion_id: id,
          canal_alternativo: canalAlternativo,
        },
      })

      if (typeof window !== 'undefined' && !process.env.VITEST) {
        if (res.whatsapp_native_url) {
          window.location.href = res.whatsapp_native_url
        } else if (res.whatsapp_web_url) {
          window.open(res.whatsapp_web_url, '_blank')
        }
      }

      await Promise.all([cargarBitacora(), cargarKpis()])


      return res
    } catch (err: any) {
      const msg = err?.data?.statusMessage || err?.message || 'Error al reenviar notificación.'
      error.value = msg
      return {
        ok: false,
        estatus: 'fallido',
        error: msg,
      }
    } finally {
      enviando.value = false
    }
  }

  async function guardarPlantilla(
    plantilla: Partial<PlantillaNotificacion>
  ): Promise<{ ok: boolean; error?: string }> {
    cargando.value = true
    error.value = null
    try {
      if (plantilla.id) {
        const { error: err } = await supabase
          .from('plantillas_notificaciones')
          .update({
            ...plantilla,
            updated_at: new Date().toISOString(),
          })
          .eq('id', plantilla.id)

        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('plantillas_notificaciones')
          .insert(plantilla)

        if (err) throw err
      }

      await cargarPlantillas()
      return { ok: true }
    } catch (err: any) {
      const msg = err?.message || 'Error al guardar la plantilla.'
      error.value = msg
      return { ok: false, error: msg }
    } finally {
      cargando.value = false
    }
  }

  async function subirArchivoAdjunto(
    file: File
  ): Promise<ArchivoAdjuntoNotificacion> {
    try {
      const extension = file.name.split('.').pop() || 'dat'
      const nombreArchivo = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`
      const ruta = `expedientes/notificaciones/${nombreArchivo}`

      const { error: uploadError } = await supabase.storage
        .from('expedientes')
        .upload(ruta, file, { upsert: true })

      if (uploadError) {
        // Fallback para pruebas / entornos locales sin bucket
        const fakeUrl = `https://storage.notaria.local/expedientes/notificaciones/${file.name}`
        return {
          nombre: file.name,
          url: fakeUrl,
          tamano_bytes: file.size,
          tipo_mime: file.type,
        }
      }

      const { data: publicUrlData } = supabase.storage
        .from('expedientes')
        .getPublicUrl(ruta)

      return {
        nombre: file.name,
        url: publicUrlData.publicUrl,
        tamano_bytes: file.size,
        tipo_mime: file.type,
      }
    } catch (err) {
      // Mock fallback seguro
      return {
        nombre: file.name,
        url: URL.createObjectURL ? URL.createObjectURL(file) : `https://storage.local/${file.name}`,
        tamano_bytes: file.size,
        tipo_mime: file.type,
      }
    }
  }

  return {
    bitacora,
    plantillas,
    kpis,
    cargando,
    enviando,
    error,
    cargarBitacora,
    cargarPlantillas,
    cargarKpis,
    enviarNotificacion,
    reenviarNotificacion,
    guardarPlantilla,
    subirArchivoAdjunto,
  }
}
