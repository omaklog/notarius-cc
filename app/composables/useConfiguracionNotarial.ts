import { ref, computed } from 'vue'
import { useSupabaseClient } from '#imports'
import type { ConfiguracionNotarial, ActualizarConfiguracionPayload } from '~/types/configuracion'

// Estado reactivo singleton a nivel de módulo
const configuracionState = ref<ConfiguracionNotarial | null>(null)
const cargandoState = ref(false)
const cargadoInicial = ref(false)

const ID_SINGLETON_DEFAULT = '00000000-0000-0000-0000-000000000001'

export function useConfiguracionNotarial() {
  let supabase: any = null
  try {
    supabase = useSupabaseClient()
  } catch {
    supabase = null
  }

  const guardando = ref(false)
  const subiendoActivo = ref(false)
  const error = ref<string | null>(null)

  const configuracion = computed(() => configuracionState.value)
  const cargando = computed(() => cargandoState.value)

  const nombreNotariaCompleto = computed(() => {
    const conf = configuracionState.value
    if (!conf) return 'Notaría Pública'
    return `Notaría Pública No. ${conf.numero_notaria} del ${conf.entidad_federativa}`
  })

  const titularCompleto = computed(() => {
    const conf = configuracionState.value
    if (!conf) return 'Notario Titular'
    const titulo = conf.notario_titular_titulo ? `${conf.notario_titular_titulo} ` : ''
    return `${titulo}${conf.notario_titular_nombre}`.trim()
  })

  const domicilioCompleto = computed(() => {
    const conf = configuracionState.value
    if (!conf) return ''
    const partes: string[] = []
    if (conf.domicilio_calle) {
      let calleNum = conf.domicilio_calle
      if (conf.domicilio_num_ext) calleNum += ` No. ${conf.domicilio_num_ext}`
      if (conf.domicilio_num_int) calleNum += ` Int. ${conf.domicilio_num_int}`
      partes.push(calleNum)
    }
    if (conf.domicilio_colonia) partes.push(`Col. ${conf.domicilio_colonia}`)
    if (conf.domicilio_codigo_postal) partes.push(`C.P. ${conf.domicilio_codigo_postal}`)
    if (conf.municipio) partes.push(conf.municipio)
    if (conf.entidad_federativa) partes.push(conf.entidad_federativa)
    return partes.join(', ')
  })

  const logotipoUrl = computed(() => configuracionState.value?.logotipo_url || null)
  const selloNotarialUrl = computed(() => configuracionState.value?.sello_notarial_url || null)

  /**
   * Carga la configuración institucional con caché en memoria.
   */
  async function cargarConfiguracion(forzar = false): Promise<ConfiguracionNotarial | null> {
    if (cargadoInicial.value && configuracionState.value && !forzar) {
      return configuracionState.value
    }

    cargandoState.value = true
    error.value = null

    try {
      if (!supabase?.from) {
        cargandoState.value = false
        return configuracionState.value
      }

      const q = supabase.from('configuracion_notarial')

      const { data, error: err } = await q.select('*').limit(1).maybeSingle?.() || await q.select('*').limit(1)

      if (err) throw err

      const row = Array.isArray(data) ? data[0] : data
      if (row) {
        configuracionState.value = row as ConfiguracionNotarial
      } else {
        // Fallback por defecto si aún no se inicializó
        configuracionState.value = {
          id: ID_SINGLETON_DEFAULT,
          numero_notaria: 1,
          entidad_federativa: 'Estado de México',
          municipio: 'Toluca',
          notario_titular_nombre: 'Lic. Notario Titular',
        }
      }

      cargadoInicial.value = true
      return configuracionState.value
    } catch (e: any) {
      error.value = e?.message || 'Error al cargar la configuración notarial'
      console.error(e)
      return null
    } finally {
      cargandoState.value = false
    }
  }

  /**
   * Actualiza los datos de la notaría.
   */
  async function guardarConfiguracion(payload: ActualizarConfiguracionPayload): Promise<boolean> {
    guardando.value = true
    error.value = null

    try {
      if (payload.numero_notaria != null && payload.numero_notaria <= 0) {
        throw new Error('El número de notaría debe ser un entero positivo')
      }
      if (payload.notario_titular_nombre !== undefined && !payload.notario_titular_nombre?.trim()) {
        throw new Error('El nombre del notario titular es obligatorio')
      }
      if (payload.municipio !== undefined && !payload.municipio?.trim()) {
        throw new Error('El municipio es obligatorio')
      }
      if (payload.entidad_federativa !== undefined && !payload.entidad_federativa?.trim()) {
        throw new Error('La entidad federativa es obligatoria')
      }

      if (!supabase?.from) {
        throw new Error('Servicio de base de datos no disponible')
      }

      const targetId = configuracionState.value?.id || ID_SINGLETON_DEFAULT

      const updateData = {
        ...payload,
        updated_at: new Date().toISOString()
      }

      const { data, error: err } = await supabase
        .from('configuracion_notarial')
        .update(updateData)
        .eq('id', targetId)
        .select('*')
        .maybeSingle?.() || await supabase.from('configuracion_notarial').update(updateData).eq('id', targetId).select('*')

      if (err) throw err

      const row = Array.isArray(data) ? data[0] : data
      if (row) {
        configuracionState.value = row as ConfiguracionNotarial
      } else {
        configuracionState.value = {
          ...(configuracionState.value || ({} as any)),
          ...updateData,
          id: targetId,
        }
      }

      return true
    } catch (e: any) {
      error.value = e?.message || 'Error al guardar la configuración'
      console.error(e)
      throw e
    } finally {
      guardando.value = false
    }
  }

  /**
   * Sube un archivo de logotipo o sello a Supabase Storage y actualiza la URL.
   */
  async function subirActivoGrafico(file: File, tipo: 'logotipo' | 'sello'): Promise<string | null> {
    subiendoActivo.value = true
    error.value = null

    try {
      const allowedMimes = ['image/png', 'image/jpeg', 'image/svg+xml']
      if (!allowedMimes.includes(file.type)) {
        throw new Error('Formato de imagen no permitido. Solo se aceptan PNG, JPG o SVG.')
      }

      const MAX_SIZE = 3 * 1024 * 1024 // 3MB
      if (file.size > MAX_SIZE) {
        throw new Error('El tamaño del archivo no debe exceder 3MB.')
      }

      const carpeta = tipo === 'logotipo' ? 'logos' : 'sellos'
      const ext = file.name.split('.').pop() || 'png'
      const fileName = `${carpeta}/${Date.now()}_${tipo}.${ext}`

      const storageClient = supabase.storage?.from('notaria-identidad')
      if (!storageClient) {
        throw new Error('El servicio de almacenamiento no está disponible')
      }

      const { error: uploadError } = await storageClient.upload(fileName, file, {
        upsert: true,
        contentType: file.type
      })

      if (uploadError) throw uploadError

      const { data: urlData } = storageClient.getPublicUrl(fileName)
      const publicUrl = urlData?.publicUrl || ''

      const updatePayload: ActualizarConfiguracionPayload = {}
      if (tipo === 'logotipo') {
        updatePayload.logotipo_url = publicUrl
      } else {
        updatePayload.sello_notarial_url = publicUrl
      }

      await guardarConfiguracion(updatePayload)
      return publicUrl
    } catch (e: any) {
      error.value = e?.message || `Error al subir ${tipo}`
      console.error(e)
      throw e
    } finally {
      subiendoActivo.value = false
    }
  }

  /**
   * Elimina el logotipo o sello notarial.
   */
  async function eliminarActivoGrafico(tipo: 'logotipo' | 'sello'): Promise<boolean> {
    guardando.value = true
    error.value = null

    try {
      const updatePayload: ActualizarConfiguracionPayload = {}
      if (tipo === 'logotipo') {
        updatePayload.logotipo_url = null
      } else {
        updatePayload.sello_notarial_url = null
      }

      await guardarConfiguracion(updatePayload)
      return true
    } catch (e: any) {
      error.value = e?.message || `Error al eliminar ${tipo}`
      console.error(e)
      throw e
    } finally {
      guardando.value = false
    }
  }

  /**
   * Interpola variables dinámicas en plantillas de texto oficiales.
   */
  function interpoladorLeyenda(plantilla: string, variables: Record<string, string | number> = {}): string {
    if (!plantilla) return ''
    const conf = configuracionState.value

    const mapaVariables: Record<string, string | number> = {
      numero_notaria: conf?.numero_notaria || '',
      notaria: conf?.numero_notaria ? `Notaría Pública No. ${conf.numero_notaria}` : '',
      notario_titular: conf?.notario_titular_nombre || '',
      titular: titularCompleto.value,
      entidad: conf?.entidad_federativa || '',
      municipio: conf?.municipio || '',
      distrito: conf?.distrito_judicial || '',
      patente: conf?.patente_fiat_numero || '',
      fecha: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
      ...variables
    }

    return plantilla.replace(/{([a-zA-Z0-9_]+)}/g, (match, key) => {
      if (key in mapaVariables && mapaVariables[key] != null) {
        return String(mapaVariables[key])
      }
      return match
    })
  }

  return {
    configuracion,
    cargando,
    guardando,
    subiendoActivo,
    error,
    nombreNotariaCompleto,
    titularCompleto,
    domicilioCompleto,
    logotipoUrl,
    selloNotarialUrl,
    cargarConfiguracion,
    guardarConfiguracion,
    subirActivoGrafico,
    eliminarActivoGrafico,
    interpoladorLeyenda
  }
}
