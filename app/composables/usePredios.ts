import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import type { PredioItem, GeoJSONPolygon } from '~/types/predios'
import { calcularAreaPoligonoM2, calcularCentroide } from '~/utils/geometriaUtils'

export function usePredios() {
  const supabase = useSupabaseClient()

  const predios = ref<PredioItem[]>([])
  const predioActivo = ref<PredioItem | null>(null)
  const cargando = ref(false)
  const guardando = ref(false)
  const error = ref<string | null>(null)

  async function cargarPredios(escrituraId: string): Promise<PredioItem[]> {
    if (!escrituraId) return []

    cargando.value = true
    error.value = null

    try {
      const { data, error: dbError } = await supabase
        .from('predios')
        .select('*')
        .eq('escritura_id', escrituraId)
        .order('created_at', { ascending: true })

      if (dbError) throw dbError

      predios.value = (data as PredioItem[]) || []

      // Mantener selección del predio activo o seleccionar el primero disponible
      if (predios.value.length > 0) {
        if (predioActivo.value) {
          const encontrado = predios.value.find((p) => p.id === predioActivo.value?.id)
          predioActivo.value = encontrado || predios.value[0]
        } else {
          predioActivo.value = predios.value[0]
        }
      } else {
        predioActivo.value = null
      }

      return predios.value
    } catch (e: any) {
      error.value = e.message || 'Error al cargar los predios'
      return []
    } finally {
      cargando.value = false
    }
  }

  function seleccionarPredio(predio: PredioItem | null): void {
    predioActivo.value = predio
  }

  function crearPredioVacio(escrituraId: string, etiqueta?: string): PredioItem {
    const num = predios.value.length + 1
    return {
      id: '',
      escritura_id: escrituraId,
      etiqueta: etiqueta || (num === 1 ? 'Predio Principal' : `Lote ${num}`),
      descripcion: null,
      superficie_terreno_m2: 0,
      superficie_declarada_m2: null,
      geometria: {
        type: 'Polygon',
        coordinates: [[]]
      },
      centroide: null,
      colindancias: [],
      foto_fachada_url: null,
      foto_fachada_storage_path: null
    }
  }

  async function guardarPredio(
    predioData: Partial<PredioItem> & { escritura_id: string; geometria: GeoJSONPolygon }
  ): Promise<PredioItem | null> {
    guardando.value = true
    error.value = null

    try {
      const ring = predioData.geometria.coordinates?.[0] || []
      const superficieCalculada =
        predioData.superficie_terreno_m2 !== undefined && predioData.superficie_terreno_m2 !== null && predioData.superficie_terreno_m2 > 0
          ? predioData.superficie_terreno_m2
          : ring.length >= 3
          ? calcularAreaPoligonoM2(ring)
          : null

      const centroideCalculado =
        predioData.centroide || (ring.length >= 3 ? { type: 'Point' as const, coordinates: calcularCentroide(ring) } : null)

      const payload: any = {
        escritura_id: predioData.escritura_id,
        etiqueta: predioData.etiqueta || 'Predio Principal',
        descripcion: predioData.descripcion || null,
        superficie_terreno_m2: superficieCalculada,
        superficie_declarada_m2: predioData.superficie_declarada_m2 || null,
        geometria: predioData.geometria,
        centroide: centroideCalculado,
        colindancias: predioData.colindancias || []
      }

      let guardado: PredioItem

      if (predioData.id) {
        // Actualizar existente
        const { data, error: dbError } = await supabase
          .from('predios')
          .update(payload)
          .eq('id', predioData.id)
          .select()
          .single()

        if (dbError) throw dbError
        guardado = data as PredioItem
      } else {
        // Crear nuevo
        const { data, error: dbError } = await supabase
          .from('predios')
          .insert(payload)
          .select()
          .single()

        if (dbError) throw dbError
        guardado = data as PredioItem
      }

      await cargarPredios(predioData.escritura_id)
      predioActivo.value = guardado

      return guardado
    } catch (e: any) {
      error.value = e.message || 'Error al guardar el predio'
      return null
    } finally {
      guardando.value = false
    }
  }

  async function eliminarPredio(predioId: string): Promise<boolean> {
    if (!predioId) return false
    guardando.value = true
    error.value = null

    try {
      const { error: dbError } = await supabase.from('predios').delete().eq('id', predioId)
      if (dbError) throw dbError

      predios.value = predios.value.filter((p) => p.id !== predioId)
      if (predioActivo.value?.id === predioId) {
        predioActivo.value = predios.value[0] || null
      }

      return true
    } catch (e: any) {
      error.value = e.message || 'Error al eliminar el predio'
      return false
    } finally {
      guardando.value = false
    }
  }

  async function subirFotoFachada(
    escrituraId: string,
    predioId: string,
    file: File
  ): Promise<{ url: string; path: string } | null> {
    guardando.value = true
    error.value = null

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const timestamp = Date.now()
      const storagePath = `escrituras/${escrituraId}/fachada_${predioId || 'lote'}_${timestamp}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('expedientes')
        .upload(storagePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('expedientes').getPublicUrl(storagePath)
      const publicUrl = urlData.publicUrl

      if (predioId) {
        const { error: updateError } = await supabase
          .from('predios')
          .update({
            foto_fachada_url: publicUrl,
            foto_fachada_storage_path: storagePath
          })
          .eq('id', predioId)

        if (updateError) throw updateError

        if (predioActivo.value?.id === predioId) {
          predioActivo.value.foto_fachada_url = publicUrl
          predioActivo.value.foto_fachada_storage_path = storagePath
        }
      }

      // Registrar también en expediente_documentos si existe la categoría
      try {
        const { data: tipoDoc } = await supabase
          .from('cat_tipos_documento_notarial')
          .select('id')
          .eq('codigo', 'FOTOGRAFIA_FACHADA')
          .maybeSingle()

        if (tipoDoc?.id) {
          await supabase.from('expediente_documentos').insert({
            escritura_id: escrituraId,
            tipo_documento_id: tipoDoc.id,
            nombre_archivo: file.name,
            storage_path: storagePath,
            tamano_bytes: file.size,
            mime_type: file.type || 'image/jpeg',
            es_adicional: true,
            notas: 'Fotografía de fachada registrada desde el módulo de georreferenciación'
          })
        }
      } catch {
        // Registro en expediente_documentos es complementario
      }

      return { url: publicUrl, path: storagePath }
    } catch (e: any) {
      error.value = e.message || 'Error al subir la fotografía de fachada'
      return null
    } finally {
      guardando.value = false
    }
  }

  return {
    predios,
    predioActivo,
    cargando,
    guardando,
    error,
    cargarPredios,
    seleccionarPredio,
    crearPredioVacio,
    guardarPredio,
    eliminarPredio,
    subirFotoFachada
  }
}
