import { ref } from "vue";
import { useSupabaseClient } from "#imports";
import type {
  EvaluacionExpedienteResumen,
  RequisitoDocumentalActo,
  TipoDescargaExpediente,
  TipoDocumentoExhibido,
  TipoDocumentoNotarial,
} from "~/types/expedientes";

export function useExpedientes() {
  const supabase = useSupabaseClient();
  const cargando = ref(false);
  const error = ref<string | null>(null);
  const evaluacion = ref<EvaluacionExpedienteResumen | null>(null);

  /**
   * Evalúa la completitud e integración del expediente de una escritura
   */
  async function evaluarExpediente(escrituraId: string): Promise<EvaluacionExpedienteResumen> {
    cargando.value = true;
    error.value = null;

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "fn_evaluar_requisitos_expediente",
        { p_escritura_id: escrituraId }
      );

      if (rpcError) throw rpcError;
      evaluacion.value = data as EvaluacionExpedienteResumen;
      return data as EvaluacionExpedienteResumen;
    } catch (err: any) {
      error.value = err.message || "Error al evaluar requisitos del expediente";
      throw err;
    } finally {
      cargando.value = false;
    }
  }

  /**
   * Asienta la fe notarial de cotejo de un documento exhibido
   */
  async function asentarCotejo(
    documentoId: string,
    tipoExhibido: TipoDocumentoExhibido,
    notas?: string
  ): Promise<any> {
    cargando.value = true;
    error.value = null;

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "fn_asentar_cotejo_notarial",
        {
          p_documento_id: documentoId,
          p_tipo_exhibido: tipoExhibido,
          p_notas: notas || null,
        }
      );

      if (rpcError) throw rpcError;
      return data;
    } catch (err: any) {
      error.value = err.message || "Error al asentar fe de cotejo notarial";
      throw err;
    } finally {
      cargando.value = false;
    }
  }

  /**
   * Registra una dispensa notarial autorizada por Notario Titular o Administrador
   */
  async function registrarDispensa(
    escrituraId: string,
    tipoDocumentoId: string,
    motivo: string
  ): Promise<any> {
    cargando.value = true;
    error.value = null;

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "fn_registrar_dispensa_documental",
        {
          p_escritura_id: escrituraId,
          p_tipo_documento_id: tipoDocumentoId,
          p_motivo: motivo,
        }
      );

      if (rpcError) throw rpcError;
      return data;
    } catch (err: any) {
      error.value = err.message || "Error al registrar dispensa notarial";
      throw err;
    } finally {
      cargando.value = false;
    }
  }

  /**
   * Registra el evento de descarga o compilación para trazabilidad y auditoría
   */
  async function registrarDescarga(
    escrituraId: string,
    tipoDescarga: TipoDescargaExpediente,
    documentosIds?: string[],
    bytes?: number,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "fn_registrar_descarga_expediente",
        {
          p_escritura_id: escrituraId,
          p_tipo_descarga: tipoDescarga,
          p_documentos_ids: documentosIds || null,
          p_bytes: bytes || null,
          p_metadata: metadata || {},
        }
      );

      if (rpcError) throw rpcError;
      return data as string;
    } catch (err: any) {
      console.warn("No se pudo registrar log de descarga de expediente:", err.message);
      return "";
    }
  }

  /**
   * Consulta el catálogo maestro de tipos de documentos notariales
   */
  async function listarTiposDocumento(): Promise<TipoDocumentoNotarial[]> {
    const { data, error: queryError } = await supabase
      .from("cat_tipos_documento_notarial")
      .select("*")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (queryError) throw queryError;
    return (data as TipoDocumentoNotarial[]) || [];
  }

  /**
   * Consulta los requisitos documentales configurados para un tipo de acto jurídico
   */
  async function listarRequisitosActo(actoJuridicoId: string): Promise<RequisitoDocumentalActo[]> {
    const { data, error: queryError } = await supabase
      .from("acto_juridico_requisitos_documentales")
      .select(`
        id,
        acto_juridico_id,
        tipo_documento_id,
        obligatorio,
        requiere_cotejo_fisico,
        rol_compareciente,
        orden,
        activo,
        cat_tipos_documento_notarial (
          codigo,
          nombre,
          categoria,
          requiere_cotejo_fisico
        )
      `)
      .eq("acto_juridico_id", actoJuridicoId)
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (queryError) throw queryError;

    return (data || []).map((r: any) => ({
      id: r.id,
      acto_juridico_id: r.acto_juridico_id,
      tipo_documento_id: r.tipo_documento_id,
      tipo_documento_codigo: r.cat_tipos_documento_notarial?.codigo,
      tipo_documento_nombre: r.cat_tipos_documento_notarial?.nombre,
      categoria: r.cat_tipos_documento_notarial?.categoria,
      obligatorio: r.obligatorio,
      requiere_cotejo_fisico: r.cat_tipos_documento_notarial?.requiere_cotejo_fisico ?? r.requiere_cotejo_fisico,
      rol_compareciente: r.rol_compareciente,
      orden: r.orden,
      activo: r.activo,
    }));
  }

  return {
    cargando,
    error,
    evaluacion,
    evaluarExpediente,
    asentarCotejo,
    registrarDispensa,
    registrarDescarga,
    listarTiposDocumento,
    listarRequisitosActo,
  };
}
