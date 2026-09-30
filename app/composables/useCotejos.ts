import { ref, computed } from 'vue'
import { useSupabaseClient } from '#imports'
import type {
  LibroCotejo,
  ActaCotejo,
  RegistrarActaCotejoPayload,
  CancelarActaCotejoPayload,
  CerrarLibroPayload,
  FiltrosCotejo,
  MetricasCotejo,
  EstatusActaCotejo
} from '~/types/cotejos'
import { useConfiguracionNotarial } from '~/composables/useConfiguracionNotarial'

// Estado reactivo a nivel de módulo para mantener sincronía entre vistas
const librosState = ref<LibroCotejo[]>([])
const libroActivoState = ref<LibroCotejo | null>(null)
const actasState = ref<ActaCotejo[]>([])
const cargandoState = ref(false)

export function useCotejos() {
  let supabase: any = null
  try {
    supabase = useSupabaseClient()
  } catch {
    supabase = null
  }

  const guardando = ref(false)
  const subiendoArchivo = ref(false)
  const error = ref<string | null>(null)

  const {
    configuracion,
    nombreNotariaCompleto,
    titularCompleto
  } = useConfiguracionNotarial()

  const libros = computed(() => librosState.value)
  const libroActivo = computed(() => libroActivoState.value)
  const actas = computed(() => actasState.value)
  const cargando = computed(() => cargandoState.value)

  // Métricas y Contadores Operativos
  const metricas = computed<MetricasCotejo>(() => {
    const list = actasState.value
    const hoyStr = new Date().toISOString().slice(0, 10)

    const actasHoy = list.filter(a => (a.fecha_cotejo || '').startsWith(hoyStr)).length
    const actasCanceladas = list.filter(a => a.estatus === 'cancelado').length
    const actasAutorizadasLibro = list.filter(a => a.estatus === 'autorizado' || a.estatus === 'entregado').length
    const totalTantosExpedidos = list
      .filter(a => a.estatus !== 'cancelado')
      .reduce((sum, a) => sum + (Number(a.numero_tantos) || 1), 0)

    return {
      actasHoy,
      actasAutorizadasLibro,
      totalTantosExpedidos,
      actasCanceladas
    }
  })

  const proximaActaDisponible = computed(() => {
    return (libroActivoState.value?.total_actas || 0) + 1
  })

  const porcentajeUsoLibro = computed(() => {
    const libro = libroActivoState.value
    if (!libro || !libro.limite_actas) return 0
    return Math.min(100, Math.round(((libro.total_actas || 0) / libro.limite_actas) * 100))
  })

  /**
   * Carga los libros de cotejo registrados.
   */
  async function cargarLibros(): Promise<LibroCotejo[]> {
    cargandoState.value = true
    error.value = null
    try {
      if (!supabase?.from) return librosState.value

      const { data, error: err } = await supabase
        .from('libros_cotejo')
        .select('*')
        .order('anio', { ascending: false })
        .order('numero_libro', { ascending: false })

      if (err) throw err

      librosState.value = (data || []) as LibroCotejo[]

      // Localizar o actualizar libro activo
      const abierto = librosState.value.find(l => l.estatus === 'abierto')
      libroActivoState.value = abierto || librosState.value[0] || null

      return librosState.value
    } catch (e: any) {
      error.value = e?.message || 'Error al cargar los libros de cotejos'
      console.error(e)
      return []
    } finally {
      cargandoState.value = false
    }
  }

  /**
   * Carga el libro activo actual.
   */
  async function cargarLibroActivo(): Promise<LibroCotejo | null> {
    try {
      if (!supabase?.from) return libroActivoState.value

      const { data, error: err } = await supabase
        .from('libros_cotejo')
        .select('*')
        .eq('estatus', 'abierto')
        .order('anio', { ascending: false })
        .order('numero_libro', { ascending: false })
        .limit(1)
        .maybeSingle?.() || await supabase.from('libros_cotejo').select('*').eq('estatus', 'abierto').limit(1)

      if (err) throw err

      const row = Array.isArray(data) ? data[0] : data
      libroActivoState.value = (row || null) as LibroCotejo | null
      return libroActivoState.value
    } catch (e: any) {
      console.error('Error al cargar libro activo:', e)
      return null
    }
  }

  /**
   * Abre formalmente un nuevo libro de cotejos.
   */
  async function abrirNuevoLibro(
    numeroLibro: number,
    anio: number,
    limiteActas = 200,
    notas = ''
  ): Promise<LibroCotejo> {
    guardando.value = true
    error.value = null
    try {
      if (!numeroLibro || numeroLibro <= 0) {
        throw new Error('El número de libro debe ser un entero positivo')
      }
      if (!anio || anio < 2000) {
        throw new Error('El año del ejercicio debe ser válido')
      }

      if (!supabase?.from) throw new Error('Servicio de base de datos no disponible')

      const nuevoPayload = {
        numero_libro: numeroLibro,
        anio,
        limite_actas: limiteActas,
        total_actas: 0,
        estatus: 'abierto',
        notas: notas?.trim() || null,
        fecha_apertura: new Date().toISOString()
      }

      const { data, error: err } = await supabase
        .from('libros_cotejo')
        .insert(nuevoPayload)
        .select('*')
        .single?.() || await supabase.from('libros_cotejo').insert(nuevoPayload).select('*')

      if (err) throw err

      const row = (Array.isArray(data) ? data[0] : data) as LibroCotejo
      librosState.value = [row, ...librosState.value]
      libroActivoState.value = row

      return row
    } catch (e: any) {
      error.value = e?.message || 'Error al aperturar el libro de cotejos'
      console.error(e)
      throw e
    } finally {
      guardando.value = false
    }
  }

  /**
   * Cierra formalmente un libro de cotejos emitiendo su certificación.
   */
  async function cerrarLibro(libroId: string, textoClausura?: string): Promise<boolean> {
    guardando.value = true
    error.value = null
    try {
      if (!libroId) throw new Error('ID de libro no especificado')
      if (!supabase?.from) throw new Error('Servicio de base de datos no disponible')

      const updateData = {
        estatus: 'cerrado',
        fecha_cierre: new Date().toISOString(),
        acta_clausura_texto: textoClausura || null,
        updated_at: new Date().toISOString()
      }

      const { data, error: err } = await supabase
        .from('libros_cotejo')
        .update(updateData)
        .eq('id', libroId)
        .select('*')
        .single?.() || await supabase.from('libros_cotejo').update(updateData).eq('id', libroId).select('*')

      if (err) throw err

      const row = (Array.isArray(data) ? data[0] : data) as LibroCotejo
      // Actualizar estado local
      librosState.value = librosState.value.map(l => (l.id === libroId ? { ...l, ...row } : l))
      if (libroActivoState.value?.id === libroId) {
        libroActivoState.value = { ...libroActivoState.value, ...row }
      }

      return true
    } catch (e: any) {
      error.value = e?.message || 'Error al cerrar el libro de cotejos'
      console.error(e)
      throw e
    } finally {
      guardando.value = false
    }
  }

  /**
   * Carga actas de cotejo aplicando filtros de búsqueda.
   */
  async function cargarActas(filtros?: FiltrosCotejo): Promise<ActaCotejo[]> {
    cargandoState.value = true
    error.value = null
    try {
      if (!supabase?.from) return actasState.value

      let query = supabase
        .from('actas_cotejo')
        .select('*, libro:libros_cotejo(*)')

      if (filtros?.libro_id) {
        query = query.eq('libro_id', filtros.libro_id)
      }

      if (filtros?.tipo_documento && filtros.tipo_documento !== 'todos') {
        query = query.eq('tipo_documento', filtros.tipo_documento)
      }

      if (filtros?.estatus && filtros.estatus !== 'todos') {
        query = query.eq('estatus', filtros.estatus)
      }

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_cotejo', `${filtros.fecha_desde}T00:00:00`)
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_cotejo', `${filtros.fecha_hasta}T23:59:59`)
      }

      if (filtros?.busqueda?.trim()) {
        const q = `%${filtros.busqueda.trim()}%`
        query = query.or(`solicitante_nombre.ilike.${q},documento_descripcion.ilike.${q},solicitante_identificacion.ilike.${q}`)
      }

      query = query.order('fecha_cotejo', { ascending: false }).order('numero_acta', { ascending: false })

      const { data, error: err } = await query

      if (err) throw err

      actasState.value = (data || []) as ActaCotejo[]
      return actasState.value
    } catch (e: any) {
      error.value = e?.message || 'Error al cargar actas de cotejo'
      console.error(e)
      return []
    } finally {
      cargandoState.value = false
    }
  }

  /**
   * Obtiene un acta específica por su ID.
   */
  async function obtenerActaPorId(id: string): Promise<ActaCotejo | null> {
    try {
      if (!supabase?.from) return null
      const { data, error: err } = await supabase
        .from('actas_cotejo')
        .select('*, libro:libros_cotejo(*)')
        .eq('id', id)
        .single?.() || await supabase.from('actas_cotejo').select('*, libro:libros_cotejo(*)').eq('id', id)

      if (err) throw err
      const row = Array.isArray(data) ? data[0] : data
      return (row || null) as ActaCotejo | null
    } catch (e: any) {
      console.error('Error al obtener acta:', e)
      return null
    }
  }

  /**
   * Registra un nuevo cotejo utilizando la función atómica PostgreSQL.
   */
  async function registrarActa(payload: RegistrarActaCotejoPayload): Promise<ActaCotejo> {
    guardando.value = true
    error.value = null
    try {
      if (!payload.libro_id) throw new Error('Debe seleccionar un libro de cotejos activo')
      if (!payload.solicitante_nombre?.trim()) throw new Error('El nombre del solicitante es obligatorio')
      if (!payload.tipo_documento?.trim()) throw new Error('El tipo de documento es obligatorio')
      if (!payload.documento_descripcion?.trim()) throw new Error('La descripción del documento exhibido es obligatoria')
      if (!payload.numero_hojas || payload.numero_hojas < 1) throw new Error('El número de fojas debe ser al menos 1')
      if (!payload.numero_tantos || payload.numero_tantos < 1) throw new Error('El número de tantos debe ser al menos 1')

      if (!supabase?.rpc) throw new Error('Servicio de llamadas almacenadas no disponible')

      const notarioNombre = payload.notario_actuante || titularCompleto.value || 'Notario Titular'

      const rpcParams = {
        p_libro_id: payload.libro_id,
        p_solicitante_nombre: payload.solicitante_nombre.trim(),
        p_solicitante_identificacion: payload.solicitante_identificacion?.trim() || null,
        p_solicitante_compareciente_id: payload.solicitante_compareciente_id || null,
        p_tipo_documento: payload.tipo_documento.trim(),
        p_documento_descripcion: payload.documento_descripcion.trim(),
        p_numero_hojas: payload.numero_hojas,
        p_numero_tantos: payload.numero_tantos,
        p_observaciones: payload.observaciones?.trim() || null,
        p_notario_actuante: notarioNombre,
        p_estatus: payload.estatus || 'autorizado'
      }

      const { data, error: err } = await supabase.rpc('fn_registrar_acta_cotejo', rpcParams)

      if (err) throw err

      const nuevaActa = (Array.isArray(data) ? data[0] : data) as ActaCotejo

      // Asociar libro local si existe
      if (nuevaActa) {
        if (!nuevaActa.libro && libroActivoState.value?.id === payload.libro_id) {
          nuevaActa.libro = libroActivoState.value
        }
        actasState.value = [nuevaActa, ...actasState.value]

        // Incrementar total en libro activo local
        if (libroActivoState.value && libroActivoState.value.id === payload.libro_id) {
          libroActivoState.value.total_actas = (libroActivoState.value.total_actas || 0) + 1
        }
      }

      return nuevaActa
    } catch (e: any) {
      error.value = e?.message || 'Error al registrar el acta de cotejo'
      console.error(e)
      throw e
    } finally {
      guardando.value = false
    }
  }

  /**
   * Actualiza el estatus del acta (ej. de 'registrado' a 'autorizado' o 'entregado').
   */
  async function actualizarEstatusActa(id: string, estatus: EstatusActaCotejo): Promise<boolean> {
    guardando.value = true
    error.value = null
    try {
      if (!supabase?.from) throw new Error('Servicio de base de datos no disponible')

      const { error: err } = await supabase
        .from('actas_cotejo')
        .update({ estatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (err) throw err

      actasState.value = actasState.value.map(a => (a.id === id ? { ...a, estatus } : a))
      return true
    } catch (e: any) {
      error.value = e?.message || 'Error al actualizar el estatus del acta'
      console.error(e)
      throw e
    } finally {
      guardando.value = false
    }
  }

  /**
   * Cancela formalmente un acta de cotejo registrando el motivo en auditoría.
   */
  async function cancelarActa(id: string, motivo: string): Promise<boolean> {
    guardando.value = true
    error.value = null
    try {
      if (!id) throw new Error('ID de acta requerido')
      if (!motivo?.trim()) throw new Error('Debe especificar el motivo legal de cancelación')

      if (!supabase?.from) throw new Error('Servicio de base de datos no disponible')

      const updateData = {
        estatus: 'cancelado' as EstatusActaCotejo,
        motivo_cancelacion: motivo.trim(),
        cancelado_en: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error: err } = await supabase
        .from('actas_cotejo')
        .update(updateData)
        .eq('id', id)

      if (err) throw err

      actasState.value = actasState.value.map(a =>
        a.id === id ? { ...a, ...updateData } : a
      )
      return true
    } catch (e: any) {
      error.value = e?.message || 'Error al cancelar el acta de cotejo'
      console.error(e)
      throw e
    } finally {
      guardando.value = false
    }
  }

  /**
   * Sube un archivo digitalizado (original o copia cotejada) a Supabase Storage.
   */
  async function subirDocumentoCotejo(
    actaId: string,
    libroId: string,
    file: File,
    tipo: 'original' | 'certificada'
  ): Promise<string | null> {
    subiendoArchivo.value = true
    error.value = null
    try {
      const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg']
      if (!allowedMimes.includes(file.type)) {
        throw new Error('Formato no permitido. Solo se aceptan PDF, PNG o JPG.')
      }

      const MAX_SIZE = 15 * 1024 * 1024 // 15MB
      if (file.size > MAX_SIZE) {
        throw new Error('El archivo excede el tamaño máximo permitido de 15MB.')
      }

      const ext = file.name.split('.').pop() || (file.type.includes('pdf') ? 'pdf' : 'png')
      const filePath = `${libroId}/${actaId}/${Date.now()}_${tipo}.${ext}`

      const storageClient = supabase.storage?.from('cotejos-documentos')
      if (!storageClient) throw new Error('Servicio de almacenamiento no disponible')

      const { error: uploadErr } = await storageClient.upload(filePath, file, {
        upsert: true,
        contentType: file.type
      })

      if (uploadErr) throw uploadErr

      const { data: urlData } = storageClient.getPublicUrl(filePath)
      const publicUrl = urlData?.publicUrl || filePath

      // Actualizar URL en la base de datos
      const updateColumn = tipo === 'original' ? 'archivo_original_url' : 'archivo_copia_certificada_url'
      await supabase
        .from('actas_cotejo')
        .update({ [updateColumn]: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', actaId)

      actasState.value = actasState.value.map(a =>
        a.id === actaId ? { ...a, [updateColumn]: publicUrl } : a
      )

      return publicUrl
    } catch (e: any) {
      error.value = e?.message || 'Error al subir documento de cotejo'
      console.error(e)
      throw e
    } finally {
      subiendoArchivo.value = false
    }
  }

  /**
   * Genera el texto notarial oficial de la Razón de Cotejo.
   */
  function generarTextoRazonCotejo(acta: ActaCotejo): string {
    const notario = titularCompleto.value || acta.notario_actuante || 'Notario Titular'
    const notaria = nombreNotariaCompleto.value || 'Notaría Pública'
    const entidad = configuracion.value?.entidad_federativa || 'Estado de México'
    const municipio = configuracion.value?.municipio || 'Toluca'

    const fojasTexto = acta.numero_hojas === 1 ? '1 FOJA ÚTIL' : `${acta.numero_hojas} FOJAS ÚTILES`
    const tantosTexto = acta.numero_tantos === 1 ? '1 TANTO' : `${acta.numero_tantos} TANTOS`
    const numLibro = acta.libro?.numero_libro || (acta as any).numero_libro || 1
    const anioLibro = acta.anio || new Date().getFullYear()

    const fechaHoy = new Date().toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    return `EL SUSCRITO ${notario.toUpperCase()}, ${notaria.toUpperCase()}, EN EJERCICIO, CON RESIDENCIA EN ${municipio.toUpperCase()}, ${entidad.toUpperCase()}, HACE CONSTAR:\n\nQUE LA(S) PRESENTE(S) ${fojasTexto} QUE ANTECEDEN, CONCUERDA(N) FIEL Y EXACTAMENTE EN TODAS Y CADA UNA DE SUS PARTES CON SU DOCUMENTO ORIGINAL QUE EL SOLICITANTE ${acta.solicitante_nombre.toUpperCase()} TUVO A BIEN EXHIBIRME A LA VISTA, CONSISTENTE EN: ${acta.documento_descripcion.toUpperCase()}, MISMO QUE LE FUE DEVUELTO EN EL ACTO DE SU COTEJO Y COMPULSA.\n\nSE EXPIDE(N) ${tantosTexto} PARA LOS FINES LEGALES A QUE HAYA LUGAR, ASENTÁNDOSE BAJO EL ACTA NÚMERO ${acta.numero_acta} DEL LIBRO DE COTEJOS NÚMERO ${numLibro}, CORRESPONDIENTE AL EJERCICIO NOTARIAL ${anioLibro}.\n\nEN ${municipio.toUpperCase()}, ${entidad.toUpperCase()}, A ${fechaHoy.toUpperCase()}. DOY FE.`
  }

  /**
   * Genera el texto formal para el Acta Solemne de Clausura de Libro de Cotejos.
   */
  function generarTextoClausuraLibro(libro: LibroCotejo): string {
    const notario = titularCompleto.value || 'Notario Titular'
    const notaria = nombreNotariaCompleto.value || 'Notaría Pública'
    const entidad = configuracion.value?.entidad_federativa || 'Estado de México'
    const municipio = configuracion.value?.municipio || 'Toluca'

    const fechaHoy = new Date().toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    const total = libro.total_actas || 0
    const canceladas = actasState.value.filter(a => a.libro_id === libro.id && a.estatus === 'cancelado').length
    const validas = total - canceladas

    return `ACTA DE CLAUSURA Y CIERRE DEL LIBRO DE COTEJOS NÚMERO ${libro.numero_libro}.\n\nEN LA CIUDAD DE ${municipio.toUpperCase()}, ${entidad.toUpperCase()}, SIENDO EL DÍA ${fechaHoy.toUpperCase()}, EL SUSCRITO ${notario.toUpperCase()}, ${notaria.toUpperCase()}, HACE CONSTAR:\n\nQUE EL PRESENTE LIBRO DE COTEJOS NÚMERO ${libro.numero_libro}, CORRESPONDIENTE AL EJERCICIO FISCAL Y NOTARIAL ${libro.anio}, QUEDA FORMALMENTE CERRADO Y CLAUSURADO EN TÉRMINOS DE LA LEY DEL NOTARIADO, CONTENIENDO UN ASIENTO TOTAL DE ${total} ACTAS CORRELATIVAS, DE LAS CUALES ${validas} FUERON VÁLIDAMENTE AUTORIZADAS Y ${canceladas} INUTILIZADAS O CANCELADAS, QUEDANDO ASENTADO EL ÍNDICE CORRESPONDIENTE PARA LA INSPECCIÓN DE LA DIRECCIÓN GENERAL DE NOTARÍAS.\n\nDOY FE.`
  }

  return {
    libros,
    libroActivo,
    actas,
    cargando,
    guardando,
    subiendoArchivo,
    error,
    metricas,
    proximaActaDisponible,
    porcentajeUsoLibro,
    cargarLibros,
    cargarLibroActivo,
    abrirNuevoLibro,
    cerrarLibro,
    cargarActas,
    obtenerActaPorId,
    registrarActa,
    actualizarEstatusActa,
    cancelarActa,
    subirDocumentoCotejo,
    generarTextoRazonCotejo,
    generarTextoClausuraLibro
  }
}
