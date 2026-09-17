import { describe, expect, it, vi, beforeEach } from "vitest";
import { useExpedientes } from "~/composables/useExpedientes";
import { useExpedienteDocumentos } from "~/composables/useExpedienteDocumentos";

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock("#imports", () => ({
  useSupabaseClient: () => ({
    rpc: mockRpc,
    from: mockFrom,
    storage: {
      from: mockStorageFrom,
    },
  }),
}));

describe("useExpedientes Composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("evaluarExpediente invoca fn_evaluar_requisitos_expediente y actualiza evaluacion", async () => {
    const mockEvaluacion = {
      escritura_id: "esc-1",
      total_requisitos: 5,
      total_cumplidos: 5,
      semaforo: "verde",
      permite_protocolizar: true,
      requisitos: [],
    };
    mockRpc.mockResolvedValueOnce({ data: mockEvaluacion, error: null });

    const { evaluarExpediente, evaluacion, cargando } = useExpedientes();
    const res = await evaluarExpediente("esc-1");

    expect(mockRpc).toHaveBeenCalledWith("fn_evaluar_requisitos_expediente", {
      p_escritura_id: "esc-1",
    });
    expect(res).toEqual(mockEvaluacion);
    expect(evaluacion.value).toEqual(mockEvaluacion);
    expect(cargando.value).toBe(false);
  });

  it("asentarCotejo invoca fn_asentar_cotejo_notarial", async () => {
    mockRpc.mockResolvedValueOnce({ data: { id: "doc-1", cotejado_contra_original: true }, error: null });

    const { asentarCotejo } = useExpedientes();
    const res = await asentarCotejo("doc-1", "original", "Original con holograma");

    expect(mockRpc).toHaveBeenCalledWith("fn_asentar_cotejo_notarial", {
      p_documento_id: "doc-1",
      p_tipo_exhibido: "original",
      p_notas: "Original con holograma",
    });
    expect(res.cotejado_contra_original).toBe(true);
  });

  it("registrarDispensa invoca fn_registrar_dispensa_documental", async () => {
    mockRpc.mockResolvedValueOnce({ data: { id: "disp-1" }, error: null });

    const { registrarDispensa } = useExpedientes();
    await registrarDispensa("esc-1", "tipo-1", "Motivo fundado notarial");

    expect(mockRpc).toHaveBeenCalledWith("fn_registrar_dispensa_documental", {
      p_escritura_id: "esc-1",
      p_tipo_documento_id: "tipo-1",
      p_motivo: "Motivo fundado notarial",
    });
  });

  it("registrarDescarga invoca fn_registrar_descarga_expediente", async () => {
    mockRpc.mockResolvedValueOnce({ data: "log-id-123", error: null });

    const { registrarDescarga } = useExpedientes();
    const logId = await registrarDescarga("esc-1", "zip_seleccion", ["doc-1", "doc-2"], 1024);

    expect(mockRpc).toHaveBeenCalledWith("fn_registrar_descarga_expediente", {
      p_escritura_id: "esc-1",
      p_tipo_descarga: "zip_seleccion",
      p_documentos_ids: ["doc-1", "doc-2"],
      p_bytes: 1024,
      p_metadata: {},
    });
    expect(logId).toBe("log-id-123");
  });
});

describe("useExpedienteDocumentos Composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("obtenerUrlFirmada solicita URL al bucket expedientes", async () => {
    mockStorageFrom.mockReturnValueOnce({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://supabase.co/signed/doc.pdf" },
        error: null,
      }),
    });

    const { obtenerUrlFirmada } = useExpedienteDocumentos();
    const url = await obtenerUrlFirmada("escrituras/1/doc.pdf", 60);

    expect(mockStorageFrom).toHaveBeenCalledWith("expedientes");
    expect(url).toBe("https://supabase.co/signed/doc.pdf");
  });
});
