import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ExpedienteResumenCard from "@/components/expedientes/ExpedienteResumenCard.vue";
import ExpedienteChecklistRequisitos from "@/components/expedientes/ExpedienteChecklistRequisitos.vue";
import { createTestVuetify } from "../../test-utils";
import type { EvaluacionExpedienteResumen, RequisitoExpedienteEvaluado } from "~/types/expedientes";

const mockEvaluacionIncompleta: EvaluacionExpedienteResumen = {
  escritura_id: "esc-1",
  total_requisitos: 4,
  total_cumplidos: 2,
  total_obligatorios: 3,
  obligatorios_cumplidos: 1,
  obligatorios_faltantes: ["Título de Propiedad Antecedente", "Boleta Predial Vigente"],
  titulos_o_poderes_sin_cotejo: [],
  semaforo: "rojo",
  permite_protocolizar: false,
  requisitos: [
    {
      tipo_documento_id: "td-1",
      tipo_documento_codigo: "titulo_propiedad",
      tipo_documento_nombre: "Título de Propiedad Antecedente",
      categoria: "inmueble",
      obligatorio: true,
      requiere_cotejo_fisico: true,
      estado: "pendiente",
      cotejado_contra_original: false,
    },
    {
      tipo_documento_id: "td-2",
      tipo_documento_codigo: "boleta_predial",
      tipo_documento_nombre: "Boleta Predial Vigente",
      categoria: "fiscal",
      obligatorio: true,
      requiere_cotejo_fisico: false,
      estado: "pendiente",
      cotejado_contra_original: false,
    },
    {
      tipo_documento_id: "td-3",
      tipo_documento_codigo: "identificacion_oficial",
      tipo_documento_nombre: "Identificación Oficial Vigente",
      categoria: "compareciente",
      obligatorio: true,
      requiere_cotejo_fisico: false,
      estado: "cargado",
      documento_id: "doc-ine",
      archivo_nombre: "ine_vendedor.pdf",
      cotejado_contra_original: true,
      tipo_documento_exhibido: "original",
    },
    {
      tipo_documento_id: "td-4",
      tipo_documento_codigo: "avaluo_comercial",
      tipo_documento_nombre: "Avalúo Comercial Notarial",
      categoria: "inmueble",
      obligatorio: false,
      requiere_cotejo_fisico: false,
      estado: "cargado",
      documento_id: "doc-avaluo",
      archivo_nombre: "avaluo_2026.pdf",
      cotejado_contra_original: false,
    },
  ],
};

const mockEvaluacionCompleta: EvaluacionExpedienteResumen = {
  ...mockEvaluacionIncompleta,
  total_cumplidos: 4,
  obligatorios_cumplidos: 3,
  obligatorios_faltantes: [],
  semaforo: "verde",
  permite_protocolizar: true,
};

describe("ExpedienteResumenCard.vue", () => {
  it("muestra semáforo rojo y bloqueo de protocolización ante obligatorios faltantes", () => {
    const vuetify = createTestVuetify();
    const wrapper = mount(ExpedienteResumenCard, {
      props: { evaluacion: mockEvaluacionIncompleta },
      global: { plugins: [vuetify] },
    });

    expect(wrapper.text()).toContain("Expediente Incompleto");
    expect(wrapper.text()).toContain("50% Integrado");
    expect(wrapper.text()).toContain("2 de 4 totales");
    expect(wrapper.text()).toContain("1 de 3 obligatorios");
    expect(wrapper.text()).toContain("Bloqueada");
  });

  it("muestra semáforo verde y estado de protocolización habilitada", () => {
    const vuetify = createTestVuetify();
    const wrapper = mount(ExpedienteResumenCard, {
      props: { evaluacion: mockEvaluacionCompleta },
      global: { plugins: [vuetify] },
    });

    expect(wrapper.text()).toContain("Expediente Completo");
    expect(wrapper.text()).toContain("100% Integrado");
    expect(wrapper.text()).toContain("Habilitada");
  });

  it("emite eventos de acción al hacer clic en los botones", async () => {
    const vuetify = createTestVuetify();
    const wrapper = mount(ExpedienteResumenCard, {
      props: { evaluacion: mockEvaluacionIncompleta, seleccionadosCount: 2 },
      global: { plugins: [vuetify] },
    });

    const btns = wrapper.findAll("button");
    const subirBtn = btns.find((b) => b.text().includes("Adjuntar Documento"));
    await subirBtn?.trigger("click");
    expect(wrapper.emitted("subir-documento")).toBeTruthy();

    const dispensaBtn = btns.find((b) => b.text().includes("Dispensa Notarial"));
    await dispensaBtn?.trigger("click");
    expect(wrapper.emitted("solicitar-dispensa")).toBeTruthy();
  });
});

describe("ExpedienteChecklistRequisitos.vue", () => {
  it("renderiza la lista de requisitos con badges y estados correctos", () => {
    const vuetify = createTestVuetify();
    const wrapper = mount(ExpedienteChecklistRequisitos, {
      props: { requisitos: mockEvaluacionIncompleta.requisitos },
      global: { plugins: [vuetify] },
    });

    expect(wrapper.text()).toContain("Título de Propiedad Antecedente");
    expect(wrapper.text()).toContain("OBLIGATORIO");
    expect(wrapper.text()).toContain("Exige Cotejo Físico");
    expect(wrapper.text()).toContain("OPCIONAL");
    expect(wrapper.text()).toContain("ine_vendedor.pdf");
  });

  it("emite ver-documento y asentar-cotejo al presionar acciones", async () => {
    const vuetify = createTestVuetify();
    const wrapper = mount(ExpedienteChecklistRequisitos, {
      props: { requisitos: mockEvaluacionIncompleta.requisitos },
      global: { plugins: [vuetify] },
    });

    const verBtn = wrapper.findAll("button").find((b) => b.text().includes("Ver"));
    await verBtn?.trigger("click");
    expect(wrapper.emitted("ver-documento")?.[0]).toEqual(["doc-ine"]);

    const cotejarBtn = wrapper.findAll("button").find((b) => b.text().includes("Cotejar"));
    await cotejarBtn?.trigger("click");
    expect(wrapper.emitted("asentar-cotejo")?.[0]).toEqual(["doc-avaluo"]);
  });
});
