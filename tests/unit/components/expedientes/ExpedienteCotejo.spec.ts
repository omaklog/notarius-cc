import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ExpedienteCotejoModal from "@/components/expedientes/ExpedienteCotejoModal.vue";
import { createTestVuetify } from "../../test-utils";

const mockAsentarCotejo = vi.fn().mockResolvedValue({ id: "doc-1", cotejado_contra_original: true });

vi.mock("~/composables/useExpedientes", () => ({
  useExpedientes: () => ({
    asentarCotejo: mockAsentarCotejo,
  }),
}));

describe("ExpedienteCotejoModal.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("renderiza el diálogo de fe notarial de cotejo", async () => {
    const vuetify = createTestVuetify();
    mount(ExpedienteCotejoModal, {
      props: {
        modelValue: true,
        documentoId: "doc-1",
        documentoNombre: "titulo_antecedente.pdf",
      },
      global: { plugins: [vuetify] },
    });
    await flushPromises();

    expect(document.body.textContent).toContain("Asentar Fe Notarial de Cotejo");
    expect(document.body.textContent).toContain("titulo_antecedente.pdf");
    expect(document.body.textContent).toContain("Fe Pública Notarial");
  });

  it("invoca asentarCotejo con los parámetros seleccionados y emite cotejo-guardado", async () => {
    const vuetify = createTestVuetify();
    const wrapper = mount(ExpedienteCotejoModal, {
      props: {
        modelValue: true,
        documentoId: "doc-100",
        documentoNombre: "escritura_primera.pdf",
      },
      global: { plugins: [vuetify] },
    });
    await flushPromises();

    const guardarBtn = Array.from(document.body.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Asentar Fe de Cotejo")
    );
    expect(guardarBtn).toBeDefined();
    guardarBtn?.click();
    await flushPromises();

    expect(mockAsentarCotejo).toHaveBeenCalledWith(
      "doc-100",
      "original",
      expect.stringContaining("Documento original tenido a la vista")
    );
    expect(wrapper.emitted("cotejo-guardado")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([false]);
  });
});
