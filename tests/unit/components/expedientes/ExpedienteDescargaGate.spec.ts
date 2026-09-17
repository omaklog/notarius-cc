import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ExpedienteDispensaModal from "@/components/expedientes/ExpedienteDispensaModal.vue";
import { crearArchivoZip, estructurarExpedienteParaZip } from "@/utils/zipExpediente";
import { generarHtmlCaratulaExpediente } from "@/utils/pdfExpediente";
import { createTestVuetify } from "../../test-utils";

const mockRegistrarDispensa = vi.fn().mockResolvedValue({ id: "disp-1" });

vi.mock("~/composables/useExpedientes", () => ({
  useExpedientes: () => ({
    registrarDispensa: mockRegistrarDispensa,
  }),
}));

describe("zipExpediente util", () => {
  it("genera un archivo ZIP binario válido con firmas PKZip", () => {
    const zipBytes = crearArchivoZip([
      { path: "documento.txt", data: "Contenido de prueba notarial" },
    ]);

    expect(zipBytes).toBeInstanceOf(Uint8Array);
    expect(zipBytes.length).toBeGreaterThan(30);

    // Firma PKZip (0x04034b50)
    expect(zipBytes[0]).toBe(0x50); // P
    expect(zipBytes[1]).toBe(0x4b); // K
    expect(zipBytes[2]).toBe(0x03);
    expect(zipBytes[3]).toBe(0x04);
  });

  it("organiza documentos en carpetas canónicas e incluye manifiestos", () => {
    const zipBytes = estructurarExpedienteParaZip({
      escrituraNumero: "48102",
      archivos: [
        {
          nombre: "titulo.pdf",
          categoria: "inmueble",
          cotejado: true,
          data: "PDF dummy data",
        },
        {
          nombre: "ine.jpg",
          categoria: "compareciente",
          compareciente: "Juan Pérez",
          cotejado: false,
          data: "JPG dummy data",
        },
      ],
    });

    expect(zipBytes).toBeInstanceOf(Uint8Array);
    expect(zipBytes.length).toBeGreaterThan(100);
  });
});

describe("pdfExpediente util", () => {
  it("genera el HTML con carátula e inventario de cotejos", () => {
    const html = generarHtmlCaratulaExpediente({
      escrituraNumero: 48102,
      actoJuridico: "COMPRAVENTA",
      fechaEmision: "15 de Septiembre de 2026",
      documentos: [
        {
          nombre: "titulo_propiedad.pdf",
          categoria: "inmueble",
          cotejado: true,
          tipo_exhibido: "original",
          cotejado_por: "Lic. Carlos Trejo",
          fecha_cotejo: "2026-09-10T12:00:00Z",
        },
      ],
    });

    expect(html).toContain("Notaría Pública No. 42");
    expect(html).toContain("Escritura No. 48102");
    expect(html).toContain("titulo_propiedad.pdf");
    expect(html).toContain("✔ COTEJADO (ORIGINAL)");
    expect(html).toContain("FE PÚBLICA DE COTEJO NOTARIAL");
  });
});

describe("ExpedienteDispensaModal.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("permite capturar motivo y autorizar dispensa notarial", async () => {
    const vuetify = createTestVuetify();
    const wrapper = mount(ExpedienteDispensaModal, {
      props: {
        modelValue: true,
        escrituraId: "esc-123",
        requisitosFaltantes: [
          { tipo_documento_id: "td-agua", tipo_documento_nombre: "Constancia de Agua" },
        ],
      },
      global: { plugins: [vuetify] },
    });
    await flushPromises();

    expect(document.body.textContent).toContain("Autorizar Dispensa Notarial");

    // Escribir motivo
    const textarea = document.body.querySelector("textarea");
    expect(textarea).not.toBeNull();
    if (textarea) {
      textarea.value = "Se autoriza la firma con carta fianza y boleta en trámite SACMEX.";
      textarea.dispatchEvent(new Event("input"));
    }
    await flushPromises();

    const autorizarBtn = Array.from(document.body.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Autorizar Dispensa")
    );
    expect(autorizarBtn).toBeDefined();
    autorizarBtn?.click();
    await flushPromises();

    expect(mockRegistrarDispensa).toHaveBeenCalledWith(
      "esc-123",
      "td-agua",
      "Se autoriza la firma con carta fianza y boleta en trámite SACMEX."
    );
    expect(wrapper.emitted("dispensa-guardada")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([false]);
  });
});
