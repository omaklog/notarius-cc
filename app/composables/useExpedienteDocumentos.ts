import { ref } from "vue";
import { useSupabaseClient } from "#imports";
import type { CategoriaDocumental, ExpedienteItemConsolidado } from "~/types/expedientes";

export interface ExpedienteDocumentoItem {
  id: string;
  entidad_tipo: "compareciente" | "escritura";
  entidad_id: string;
  categoria: CategoriaDocumental;
  lado?: "anverso" | "reverso" | "completo" | null;
  archivo_nombre: string;
  archivo_path: string;
  mime_type: string;
  size_bytes?: number | null;
  tipo_documento_id?: string | null;
  cotejado_contra_original?: boolean;
  tipo_documento_exhibido?: string | null;
  cotejado_por?: string | null;
  fecha_cotejo?: string | null;
  notas_cotejo?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export type ExpedienteEscrituraVistaItem = ExpedienteItemConsolidado;

export interface SubirDocumentoParams {
  entidadTipo: "compareciente" | "escritura";
  entidadId: string;
  categoria: CategoriaDocumental;
  tipoDocumentoId?: string | null;
  lado?: "anverso" | "reverso" | "completo";
  archivo: File | Blob;
  nombreArchivo: string;
  metadata?: Record<string, any>;
}

export function useExpedienteDocumentos() {
  const supabase = useSupabaseClient();
  const subiendo = ref(false);
  const error = ref<string | null>(null);

  /**
   * Genera una URL firmada segura temporal para visualización o descarga
   */
  async function obtenerUrlFirmada(path: string, expiresInSeconds = 60): Promise<string> {
    try {
      const { data, error: storageError } = await supabase.storage
        .from("expedientes")
        .createSignedUrl(path, expiresInSeconds);

      if (storageError) {
        // Fallback a URL pública si la configuración de storage la admite
        const { data: pubData } = supabase.storage.from("expedientes").getPublicUrl(path);
        if (pubData?.publicUrl) return pubData.publicUrl;
        throw storageError;
      }

      return data?.signedUrl || "";
    } catch (err: any) {
      console.error("Error al obtener URL firmada de storage:", err.message);
      throw err;
    }
  }

  /**
   * Sube un archivo a Supabase Storage y registra la tupla en expediente_documentos
   */
  async function subirDocumento(params: SubirDocumentoParams): Promise<ExpedienteDocumentoItem> {
    subiendo.value = true;
    error.value = null;

    try {
      const extension = params.nombreArchivo.split(".").pop() || "jpg";
      const timestamp = Date.now();
      const storagePath = `${params.entidadTipo}s/${params.entidadId}/${params.categoria}/${timestamp}_${params.lado || "doc"}.${extension}`;

      // Subir archivo al bucket de expedientes
      const { data: storageData, error: storageError } = await supabase.storage
        .from("expedientes")
        .upload(storagePath, params.archivo, {
          contentType: (params.archivo as any).type || "image/jpeg",
          upsert: true,
        });

      if (storageError) {
        console.warn("Storage warning:", storageError.message);
      }

      const finalPath = storageData?.path || storagePath;

      // Registrar tupla en la tabla pública expediente_documentos
      const { data: docData, error: docError } = await supabase
        .from("expediente_documentos")
        .insert({
          entidad_tipo: params.entidadTipo,
          entidad_id: params.entidadId,
          categoria: params.categoria,
          tipo_documento_id: params.tipoDocumentoId ?? null,
          lado: params.lado ?? null,
          archivo_nombre: params.nombreArchivo,
          archivo_path: finalPath,
          mime_type: (params.archivo as any).type || "image/jpeg",
          size_bytes: (params.archivo as any).size || null,
          metadata: params.metadata || {},
        })
        .select()
        .single();

      if (docError) throw docError;

      return docData as ExpedienteDocumentoItem;
    } catch (err: any) {
      error.value = err.message || "Error al registrar documento en expediente";
      throw err;
    } finally {
      subiendo.value = false;
    }
  }

  /**
   * Consulta los documentos registrados directamente para una entidad
   */
  async function listarDocumentosEntidad(
    entidadTipo: "compareciente" | "escritura",
    entidadId: string
  ): Promise<ExpedienteDocumentoItem[]> {
    const { data, error: queryError } = await supabase
      .from("expediente_documentos")
      .select("*")
      .eq("entidad_tipo", entidadTipo)
      .eq("entidad_id", entidadId)
      .order("created_at", { ascending: true });

    if (queryError) throw queryError;
    return (data as ExpedienteDocumentoItem[]) || [];
  }

  /**
   * Consulta el expediente consolidado de una escritura desde la vista v_expediente_escritura
   */
  async function listarExpedienteEscritura(
    escrituraId: string
  ): Promise<ExpedienteEscrituraVistaItem[]> {
    const { data, error: queryError } = await supabase
      .from("v_expediente_escritura")
      .select("*")
      .eq("escritura_id", escrituraId)
      .order("created_at", { ascending: true });

    if (queryError) throw queryError;
    return (data as ExpedienteEscrituraVistaItem[]) || [];
  }

  return {
    subiendo,
    error,
    subirDocumento,
    obtenerUrlFirmada,
    listarDocumentosEntidad,
    listarExpedienteEscritura,
  };
}
