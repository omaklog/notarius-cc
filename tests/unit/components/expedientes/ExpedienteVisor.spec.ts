import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ExpedienteVisorModal from "@/components/expedientes/ExpedienteVisorModal.vue";
import ExpedienteDocumentosTable from "@/components/expedientes/ExpedienteDocumentosTable.vue";
import { createTestVuetify } from "../../test-utils";
import type { ExpedienteItemConsolidado } from "~/types/expedientes";

const mockDocCotejado: ExpedienteItemConsolidado = {
  documento_id: "doc-1",
  entidad_tipo: "escritura",
  entidad_id: "esc-1",
  categoria: "inmueble",
  archivo_nombre: "titulo_propiedad_123.pdf",
  archivo_path: "escrituras/esc-1/inmueble/titulo.pdf",
  mime_type: "application/pdf",
  size_bytes: 2048000,
  cotejado_contra_original: true,
  tipo_documento_exhibido: "original",
  cotejador_nombre: "Lic. Carlos Trejo",
  fecha_cotejo: "2026-09-10T12:00:00Z",
  created_at: "2026-09-08T10:00:00Z",
  escritura_id: "esc-1",
  origen_documento: "escritura",
};

const mockDocSimple: ExpedienteItemConsolidado = {
  documento_id: "doc-2",
  entidad_tipo: "compareciente",
  entidad_id: "comp-1",
  categoria: "compareciente",
  archivo_nombre: "ine_anverso.jpg",
  archivo_path: "comparecientes/comp-1/ine.jpg",
  mime_type: "image/jpeg",
  size_bytes: 512000,
  cotejado_contra_original: false,
  created_at: "2026-09-09T10:00:00Z",
  escritura_id: "esc-1",
  origen_documento: "compareciente",
  compareciente_id: "comp-1",
  compareciente_nombre: "María Morales Gómez",
};

const mockObtenerUrlFirmada = vi.fn().mockResolvedValue("blob:http://localhost:3000/mock-pdf");

vi.mock("~/composables/useExpedienteDocumentos", () => ({
  useExpedienteDocumentos: () => ({
    obtenerUrlFirmada: mockObtenerUrlFirmada,
  }),
}));

describe("ExpedienteVisorModal.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra datos del documento y banner de cotejo si está cotejado contra original", async () => {
    const vuetify = createTestVuetify();
    mount(ExpedienteVisorModal, {
      props: {
        modelValue: true,
        documento: mockDocCotejado,
      },
      global: { plugins: [vuetify] },
    });
    await flushPromises();

    expect(document.body.textContent).toContain("titulo_propiedad_123.pdf");
    expect(document.body.textContent).toContain("DOCUMENTO COTEJADO CONTRA ORIGINAL EXHIBIDO");
    expect(document.body.textContent).toContain("Lic. Carlos Trejo");
  });

  it("renderiza iframe para documentos PDF", async () => {
    const vuetify = createTestVuetify();
    mount(ExpedienteVisorModal, {
      props: {
        modelValue: true,
        documento: mockDocCotejado,
      },
      global: { plugins: [vuetify] },
    });
    await flushPromises();

    const iframe = document.body.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe("blob:http://localhost:3000/mock-pdf");
  });
});

describe("ExpedienteDocumentosTable.vue", () => {
  it("renderiza documentos con badges de origen e insignias de cotejo notarial", () => {
    const vuetify = createTestVuetify();
    const wrapper = mount(ExpedienteDocumentosTable, {
      props: {
        documentos: [mockDocCotejado, mockDocSimple],
      },
      global: { plugins: [vuetify] },
    });

    expect(wrapper.text()).toContain("titulo_propiedad_123.pdf");
    expect(wrapper.text()).toContain("Instrumento Notarial");
    expect(wrapper.text()).toContain("Cotejado (original)");

    expect(wrapper.text()).toContain("ine_anverso.jpg");
    expect(wrapper.text()).toContain("María Morales Gómez");
    expect(wrapper.text()).toContain("Copia simple");
  });

  it("permite selección múltiple de documentos", async () => {
    const vuetify = createTestVuetify();
    const wrapper = mount(ExpedienteDocumentosTable, {
      props: {
        documentos: [mockDocCotejado, mockDocSimple],
        modelValue: ["doc-1"],
      },
      global: { plugins: [vuetify] },
    });

    expect(wrapper.text()).toContain("1 seleccionados");
  });
});
