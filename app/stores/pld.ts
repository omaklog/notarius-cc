import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSupabaseClient } from '#imports'
import type {
  PldListaCatalogo,
  PldConsulta,
  PldEvaluacionEscritura,
  PldPepDiligencia,
  ScreeningPrevioInfo,
  PldResultadoConsulta,
  PldMetodoConsulta,
  PldCondicionPep
} from '~/types/pld'

export const usePldStore = defineStore('pld', () => {
  const supabase = useSupabaseClient()

  const listasCatalogo = ref<PldListaCatalogo[]>([])
  // Mapa: comparecienteId -> { [listaCodigo]: PldConsulta }
  const consultasMap = ref<Record<string, Record<string, PldConsulta>>>({})
  const evaluacionActual = ref<PldEvaluacionEscritura | null>(null)
  // Mapa: comparecienteId -> PldPepDiligencia
  const diligenciasPepMap = ref<Record<string, PldPepDiligencia>>({})
  // Mapa: comparecienteId -> ScreeningPrevioInfo | null
  const screeningPrevioMap = ref<Record<string, ScreeningPrevioInfo | null>>({})

  const loading = ref(false)
  const error = ref<string | null>(null)

  // 1. Cargar catálogo de listas de restricción
  const cargarListasCatalogo = async () => {
    try {
      const { data, error: err } = await supabase
        .from('pld_listas_catalogo')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true })

      if (err) throw err
      listasCatalogo.value = data || []
      return listasCatalogo.value
    } catch (e: any) {
      error.value = e.message
      return []
    }
  }

  // 2. Cargar todas las consultas de la escritura
  const cargarConsultasEscritura = async (escrituraId: string) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('pld_consultas')
        .select('*, lista:pld_listas_catalogo(*)')
        .eq('escritura_id', escrituraId)

      if (err) throw err

      const nuevoMapa: Record<string, Record<string, PldConsulta>> = {}
      for (const c of (data || [])) {
        if (!nuevoMapa[c.compareciente_id]) {
          nuevoMapa[c.compareciente_id] = {}
        }
        const codigoLista = c.lista?.codigo || c.lista_id
        nuevoMapa[c.compareciente_id][codigoLista] = c
      }
      consultasMap.value = nuevoMapa
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // 3. Cargar evaluación consolidada de la escritura
  const cargarEvaluacionEscritura = async (escrituraId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('pld_evaluaciones_escritura')
        .select('*')
        .eq('escritura_id', escrituraId)
        .maybeSingle()

      if (err) throw err
      evaluacionActual.value = data || null
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  // 4. Cargar debida diligencia de PEPs
  const cargarDiligenciasPep = async (escrituraId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('pld_pep_diligencias')
        .select('*')
        .eq('escritura_id', escrituraId)

      if (err) throw err
      const mapa: Record<string, PldPepDiligencia> = {}
      for (const d of (data || [])) {
        mapa[d.compareciente_id] = d
      }
      diligenciasPepMap.value = mapa
    } catch (e: any) {
      error.value = e.message
    }
  }

  // 5. Detectar screening previo vigente para un compareciente (< 90 días)
  const buscarScreeningPrevio = async (comparecienteId: string, escrituraIdActual: string) => {
    try {
      const { data, error: err } = await supabase.rpc('fn_obtener_screening_vigente', {
        p_compareciente_id: comparecienteId,
        p_escritura_id_actual: escrituraIdActual
      })

      if (err) throw err
      if (data && data.encontrado) {
        screeningPrevioMap.value[comparecienteId] = {
          escritura_id: data.escritura_origen_id,
          instrumento_numero: data.instrumento,
          fecha: data.fecha,
          dias_antiguedad: data.dias_antiguedad,
          dias_restantes: data.dias_restantes,
          consultas: []
        }
      } else {
        screeningPrevioMap.value[comparecienteId] = null
      }
      return screeningPrevioMap.value[comparecienteId]
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  // 6. Importar screening previo con confirmación
  const importarScreeningPrevio = async (
    escrituraDestinoId: string,
    comparecienteId: string,
    escrituraOrigenId: string
  ) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase.rpc('fn_importar_screening_pld', {
        p_escritura_destino_id: escrituraDestinoId,
        p_compareciente_id: comparecienteId,
        p_escritura_origen_id: escrituraOrigenId
      })

      if (err) throw err
      // Recargar consultas y evaluar escritura
      await cargarConsultasEscritura(escrituraDestinoId)
      await evaluarEscritura(escrituraDestinoId)
      return data
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // 7. Subir evidencia a Supabase Storage
  const subirEvidencia = async (
    file: File,
    escrituraId: string,
    comparecienteId: string,
    listaCodigo: string
  ) => {
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'png'
    const storagePath = `${escrituraId}/${comparecienteId}/${listaCodigo}_${timestamp}.${extension}`

    // Intentar subir a pld-evidencias o evidencias-pld
    let bucketName = 'pld-evidencias'
    let uploadRes = await supabase.storage.from(bucketName).upload(storagePath, file, {
      upsert: true,
      contentType: file.type
    })

    if (uploadRes.error) {
      // Fallback al bucket evidencias-pld
      bucketName = 'evidencias-pld'
      uploadRes = await supabase.storage.from(bucketName).upload(storagePath, file, {
        upsert: true,
        contentType: file.type
      })
    }

    if (uploadRes.error) {
      throw uploadRes.error
    }

    let fileHash: string | null = null
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle && file.arrayBuffer) {
        const arrayBuffer = await file.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      }
    } catch {
      fileHash = null
    }

    return {
      storagePath: `${bucketName}/${storagePath}`,
      fileName: file.name,
      size: file.size,
      hash: fileHash
    }
  }

  // 8. Guardar cotejo de lista
  const guardarConsulta = async (payload: {
    escrituraId: string
    comparecienteId: string
    listaId: string
    resultado: PldResultadoConsulta
    evidenciaStoragePath: string
    evidenciaNombreOriginal?: string | null
    evidenciaHash?: string | null
    evidenciaSize?: number | null
    justificacionDescarte?: string | null
    documentoContrastePath?: string | null
    notas?: string | null
    metodo?: PldMetodoConsulta
  }) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('pld_consultas')
        .upsert({
          escritura_id: payload.escrituraId,
          compareciente_id: payload.comparecienteId,
          lista_id: payload.listaId,
          resultado: payload.resultado,
          evidencia_storage_path: payload.evidenciaStoragePath,
          evidencia_nombre_original: payload.evidenciaNombreOriginal,
          evidencia_hash: payload.evidenciaHash,
          evidencia_size: payload.evidenciaSize,
          justificacion_descarte: payload.justificacionDescarte,
          documento_contraste_path: payload.documentoContrastePath,
          notas: payload.notas,
          metodo: payload.metodo || 'manual',
          consulta_original_fecha: new Date().toISOString()
        }, { onConflict: 'escritura_id,compareciente_id,lista_id' })
        .select('*, lista:pld_listas_catalogo(*)')
        .single()

      if (err) throw err

      // Actualizar estado local reactivo
      if (!consultasMap.value[payload.comparecienteId]) {
        consultasMap.value[payload.comparecienteId] = {}
      }
      const codigoLista = data.lista?.codigo || payload.listaId
      consultasMap.value[payload.comparecienteId][codigoLista] = data

      // Reevaluar la escritura en backend
      await evaluarEscritura(payload.escrituraId)
      return data
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // 9. Ejecutar evaluación canónica de la escritura
  const evaluarEscritura = async (escrituraId: string) => {
    try {
      const { data, error: err } = await supabase.rpc('fn_evaluar_pld_escritura', {
        p_escritura_id: escrituraId
      })

      if (err) throw err
      evaluacionActual.value = data
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  // 10. Actualizar monto liquidado en efectivo (Art. 32)
  const guardarMontoEfectivo = async (escrituraId: string, montoEfectivo: number) => {
    try {
      // Upsert inicial o update del monto_efectivo
      await supabase
        .from('pld_evaluaciones_escritura')
        .upsert({
          escritura_id: escrituraId,
          monto_efectivo: montoEfectivo,
          uma_valor_aplicado: evaluacionActual.value?.uma_valor_aplicado || 113.14,
          uma_fecha_aplicada: evaluacionActual.value?.uma_fecha_aplicada || new Date().toISOString().split('T')[0]
        }, { onConflict: 'escritura_id' })

      return await evaluarEscritura(escrituraId)
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  // 11. Registrar expediente de debida diligencia PEP
  const registrarDiligenciaPep = async (payload: {
    escrituraId: string
    comparecienteId: string
    condicionPep: 'pep_directo' | 'pep_asimilado'
    cargoPublico: string
    dependencia: string
    periodo?: string
    tipoVinculo?: string
    origenFondosDeclarado: string
    documentoSoportePath?: string
  }) => {
    try {
      const { data, error: err } = await supabase
        .from('pld_pep_diligencias')
        .upsert({
          escritura_id: payload.escrituraId,
          compareciente_id: payload.comparecienteId,
          condicion_pep: payload.condicionPep,
          cargo_publico: payload.cargoPublico,
          dependencia: payload.dependencia,
          periodo: payload.periodo,
          tipo_vinculo: payload.tipoVinculo,
          origen_fondos_declarado: payload.origenFondosDeclarado,
          documento_soporte_path: payload.documentoSoportePath
        }, { onConflict: 'escritura_id,compareciente_id' })
        .select()
        .single()

      if (err) throw err
      diligenciasPepMap.value[payload.comparecienteId] = data
      return data
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  // 12. Aprobar debida diligencia PEP (solo Notario Titular / Admin)
  const aprobarDiligenciaPep = async (diligenciaId: string, comparecienteId: string, notas: string) => {
    try {
      const { data, error: err } = await supabase.rpc('fn_aprobar_diligencia_pep', {
        p_diligencia_id: diligenciaId,
        p_notas: notas
      })

      if (err) throw err
      diligenciasPepMap.value[comparecienteId] = data
      return data
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  return {
    listasCatalogo,
    consultasMap,
    evaluacionActual,
    diligenciasPepMap,
    screeningPrevioMap,
    loading,
    error,
    cargarListasCatalogo,
    cargarConsultasEscritura,
    cargarEvaluacionEscritura,
    cargarDiligenciasPep,
    buscarScreeningPrevio,
    importarScreeningPrevio,
    subirEvidencia,
    guardarConsulta,
    evaluarEscritura,
    guardarMontoEfectivo,
    registrarDiligenciaPep,
    aprobarDiligenciaPep
  }
})
