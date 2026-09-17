<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useSupabaseClient } from "#imports";
import {
  useExpedienteDocumentos,
  type ExpedienteEscrituraVistaItem,
} from "~/composables/useExpedienteDocumentos";
import { useExpedientes } from "~/composables/useExpedientes";
import type {
  EvaluacionExpedienteResumen,
  ExpedienteItemConsolidado,
  RequisitoExpedienteEvaluado,
  TipoDocumentoNotarial,
} from "~/types/expedientes";
import { estructurarExpedienteParaZip } from "~/utils/zipExpediente";
import { generarHtmlCaratulaExpediente } from "~/utils/pdfExpediente";

import ExpedienteResumenCard from "~/components/expedientes/ExpedienteResumenCard.vue";
import ExpedienteChecklistRequisitos from "~/components/expedientes/ExpedienteChecklistRequisitos.vue";
import ExpedienteDocumentosTable from "~/components/expedientes/ExpedienteDocumentosTable.vue";
import ExpedienteVisorModal from "~/components/expedientes/ExpedienteVisorModal.vue";
import ExpedienteCotejoModal from "~/components/expedientes/ExpedienteCotejoModal.vue";
import ExpedienteDispensaModal from "~/components/expedientes/ExpedienteDispensaModal.vue";

const props = defineProps<{
  escrituraId: string;
  escrituraNumero?: string | number;
  actoNombre?: string;
}>();

const supabase = useSupabaseClient();
const { listarExpedienteEscritura, subirDocumento, obtenerUrlFirmada, subiendo } = useExpedienteDocumentos();
const {
  evaluarExpediente,
  listarTiposDocumento,
  registrarDescarga,
  cargando: cargandoExpedientes,
} = useExpedientes();

const documentos = ref<ExpedienteEscrituraVistaItem[]>([]);
const tiposCatalogo = ref<TipoDocumentoNotarial[]>([]);
const evaluacion = ref<EvaluacionExpedienteResumen | null>(null);
const loading = ref(true);
const errorMsg = ref<string | null>(null);

// Selección múltiple para descargas
const seleccionadosIds = ref<string[]>([]);

// Modales
const showAdjuntarDialog = ref(false);
const showVisorDialog = ref(false);
const showCotejoDialog = ref(false);
const showDispensaDialog = ref(false);

const docParaVisor = ref<ExpedienteItemConsolidado | null>(null);
const docIdParaCotejo = ref<string | null>(null);
const docNombreParaCotejo = ref<string | null>(null);

// Formulario de adjunto
const archivoSeleccionado = ref<File | null>(null);
const tipoDocSeleccionado = ref<string | null>(null);
const categoriaSeleccionada = ref<any>("otro");
const guardandoAdjunto = ref(false);

const categoriasOpciones = [
  { title: "Inmueble / Objeto", value: "inmueble" },
  { title: "Compareciente / KYC", value: "compareciente" },
  { title: "Fiscales y Pagos", value: "fiscal" },
  { title: "Acta Constitutiva", value: "acta_constitutiva" },
  { title: "Poder Notarial", value: "poder_notarial" },
  { title: "Comprobante de Domicilio", value: "comprobante_domicilio" },
  { title: "Identificación Oficial", value: "identificacion_oficial" },
  { title: "Otro Documento Notarial", value: "otro" },
];

async function cargarExpediente(): Promise<void> {
  loading.value = true;
  errorMsg.value = null;

  try {
    const [docs, catalogo] = await Promise.all([
      listarExpedienteEscritura(props.escrituraId),
      listarTiposDocumento().catch(() => []),
    ]);

    documentos.value = docs;
    tiposCatalogo.value = catalogo;

    // Intentar evaluar expediente (si la escritura tiene acto registrado)
    try {
      evaluacion.value = await evaluarExpediente(props.escrituraId);
    } catch {
      // Fallback gracioso para escrituras sin acto o entornos de prueba
      evaluacion.value = null;
    }
  } catch (err: any) {
    errorMsg.value = err.message || "Error al cargar expediente de la escritura";
  } finally {
    loading.value = false;
  }
}

onMounted(cargarExpediente);

// Métricas del expediente para compatibilidad
const totalDocumentos = computed(() => documentos.value.length);
const countEscritura = computed(() => documentos.value.filter((d) => d.origen_documento === "escritura").length);
const countCompareciente = computed(() => documentos.value.filter((d) => d.origen_documento === "compareciente").length);

function abrirVisor(doc: ExpedienteItemConsolidado): void {
  docParaVisor.value = doc;
  showVisorDialog.value = true;
}

function abrirVisorPorId(documentoId: string): void {
  const doc = documentos.value.find((d) => d.documento_id === documentoId);
  if (doc) {
    abrirVisor(doc);
  }
}

function abrirCotejo(documentoId: string): void {
  const doc = documentos.value.find((d) => d.documento_id === documentoId);
  docIdParaCotejo.value = documentoId;
  docNombreParaCotejo.value = doc?.archivo_nombre || null;
  showCotejoDialog.value = true;
}

function handleSubirRequisito(req: RequisitoExpedienteEvaluado): void {
  tipoDocSeleccionado.value = req.tipo_documento_id;
  categoriaSeleccionada.value = req.categoria || "otro";
  showAdjuntarDialog.value = true;
}

async function descargarDocumento(doc: ExpedienteItemConsolidado): Promise<void> {
  try {
    const url = await obtenerUrlFirmada(doc.archivo_path, 60);
    if (url) {
      window.open(url, "_blank");
      // Auditoría
      await registrarDescarga(props.escrituraId, "individual", [doc.documento_id], doc.size_bytes || 0);
    }
  } catch (err: any) {
    alert(`No se pudo descargar el archivo: ${err.message || "Error desconocido"}`);
  }
}

async function handleDescargarZip(): Promise<void> {
  const docsADescargar = seleccionadosIds.value.length > 0
    ? documentos.value.filter((d) => seleccionadosIds.value.includes(d.documento_id))
    : documentos.value;

  if (docsADescargar.length === 0) return;

  loading.value = true;
  try {
    // Descargar blobs
    const archivosConDatos = await Promise.all(
      docsADescargar.map(async (d) => {
        try {
          const url = await obtenerUrlFirmada(d.archivo_path, 60);
          const res = await fetch(url);
          const buf = await res.arrayBuffer();
          return {
            nombre: d.archivo_nombre,
            categoria: d.categoria,
            origen: d.origen_documento,
            compareciente: d.compareciente_nombre,
            cotejado: !!d.cotejado_contra_original,
            data: new Uint8Array(buf),
          };
        } catch {
          return {
            nombre: d.archivo_nombre,
            categoria: d.categoria,
            origen: d.origen_documento,
            compareciente: d.compareciente_nombre,
            cotejado: !!d.cotejado_contra_original,
            data: new Uint8Array([0]),
          };
        }
      })
    );

    const zipBytes = estructurarExpedienteParaZip({
      escrituraNumero: props.escrituraNumero || "S_N",
      archivos: archivosConDatos,
    });

    const blob = new Blob([zipBytes as any], { type: "application/zip" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `Expediente_Escritura_${props.escrituraNumero || props.escrituraId.slice(0, 8)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    // Registro de auditoría
    await registrarDescarga(
      props.escrituraId,
      "zip_seleccion",
      docsADescargar.map((d) => d.documento_id),
      zipBytes.length
    );
  } catch (err: any) {
    alert(`Error al generar paquete ZIP: ${err.message || "Error desconocido"}`);
  } finally {
    loading.value = false;
  }
}

async function handleCompilarPdf(): Promise<void> {
  try {
    const htmlCaratula = generarHtmlCaratulaExpediente({
      escrituraNumero: props.escrituraNumero || "S/N",
      actoJuridico: props.actoNombre || "ACTO NOTARIAL",
      fechaEmision: new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }),
      documentos: documentos.value.map((d) => ({
        nombre: d.archivo_nombre,
        categoria: d.categoria,
        origen: d.origen_documento,
        compareciente: d.compareciente_nombre,
        cotejado: !!d.cotejado_contra_original,
        tipo_exhibido: d.tipo_documento_exhibido,
        cotejado_por: d.cotejador_nombre,
        fecha_cotejo: d.fecha_cotejo,
      })),
    });

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(htmlCaratula);
      win.document.close();
      win.focus();
    }

    await registrarDescarga(
      props.escrituraId,
      "pdf_compilado",
      documentos.value.map((d) => d.documento_id)
    );
  } catch (err: any) {
    alert(`Error al compilar expediente: ${err.message || "Error desconocido"}`);
  }
}

async function handleAdjuntar(): Promise<void> {
  if (!archivoSeleccionado.value) return;

  guardandoAdjunto.value = true;
  try {
    await subirDocumento({
      entidadTipo: "escritura",
      entidadId: props.escrituraId,
      categoria: categoriaSeleccionada.value,
      tipoDocumentoId: tipoDocSeleccionado.value,
      archivo: archivoSeleccionado.value,
      nombreArchivo: archivoSeleccionado.value.name,
    });

    showAdjuntarDialog.value = false;
    archivoSeleccionado.value = null;
    tipoDocSeleccionado.value = null;
    categoriaSeleccionada.value = "otro";
    await cargarExpediente();
  } catch (err: any) {
    alert(`Error al adjuntar documento: ${err.message || "Error desconocido"}`);
  } finally {
    guardandoAdjunto.value = false;
  }
}

const requisitosFaltantesParaDispensa = computed(() => {
  if (!evaluacion.value) return [];
  return evaluacion.value.requisitos
    .filter((r) => r.estado === "pendiente" && r.obligatorio)
    .map((r) => ({
      tipo_documento_id: r.tipo_documento_id,
      tipo_documento_nombre: r.tipo_documento_nombre,
    }));
});

defineExpose({
  cargarExpediente,
  documentos,
  totalDocumentos,
});
</script>

<template>
  <div class="expediente-tab-container">
    <!-- Tarjetas de métricas superiores (compatibilidad y resumen rápido) -->
    <v-row class="mb-4" density="compact">
      <v-col cols="12" sm="4">
        <v-card variant="outlined" class="pa-3 bg-white">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis font-weight-medium">Total Documentos</div>
              <div class="text-h6 font-weight-bold" style="color: #1b3a5f">{{ totalDocumentos }}</div>
            </div>
            <v-avatar color="#1B3A5F" variant="tonal" size="36">
              <v-icon size="20">mdi-folder-multiple-outline</v-icon>
            </v-avatar>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="4">
        <v-card variant="outlined" class="pa-3 bg-white">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis font-weight-medium">Del Instrumento</div>
              <div class="text-h6 font-weight-bold text-primary">{{ countEscritura }}</div>
            </div>
            <v-avatar color="primary" variant="tonal" size="36">
              <v-icon size="20">mdi-file-document-outline</v-icon>
            </v-avatar>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="4">
        <v-card variant="outlined" class="pa-3 bg-white">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis font-weight-medium">De Comparecientes</div>
              <div class="text-h6 font-weight-bold" style="color: #a9762e">{{ countCompareciente }}</div>
            </div>
            <v-avatar color="#A9762E" variant="tonal" size="36">
              <v-icon size="20">mdi-account-badge-outline</v-icon>
            </v-avatar>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Semáforo e integración institucional (Stitch Canvas) -->
    <ExpedienteResumenCard
      :evaluacion="evaluacion"
      :loading="loading"
      :seleccionados-count="seleccionadosIds.length"
      @subir-documento="showAdjuntarDialog = true"
      @descargar-zip="handleDescargarZip"
      @compilar-pdf="handleCompilarPdf"
      @solicitar-dispensa="showDispensaDialog = true"
      @actualizar="cargarExpediente"
    />

    <!-- Matriz de requisitos por acto jurídico (si está disponible) -->
    <ExpedienteChecklistRequisitos
      v-if="evaluacion && evaluacion.requisitos.length > 0"
      :requisitos="evaluacion.requisitos"
      :loading="loading"
      @subir-requisito="handleSubirRequisito"
      @ver-documento="abrirVisorPorId"
      @asentar-cotejo="abrirCotejo"
    />

    <!-- Alerta de error si ocurre -->
    <v-alert
      v-if="errorMsg"
      type="error"
      variant="tonal"
      density="compact"
      closable
      class="mb-4"
      @click:close="errorMsg = null"
    >
      {{ errorMsg }}
    </v-alert>

    <!-- Tabla interactiva de documentos del expediente con casillas para descarga -->
    <ExpedienteDocumentosTable
      v-model="seleccionadosIds"
      :documentos="documentos"
      :loading="loading"
      @ver-documento="abrirVisor"
      @descargar-documento="descargarDocumento"
      @asentar-cotejo="abrirCotejo"
    />

    <!-- Modal Visor Integrado -->
    <ExpedienteVisorModal
      v-model="showVisorDialog"
      :documento="docParaVisor"
      @asentar-cotejo="abrirCotejo"
    />

    <!-- Modal Asentar Fe de Cotejo Notarial -->
    <ExpedienteCotejoModal
      v-model="showCotejoDialog"
      :documento-id="docIdParaCotejo"
      :documento-nombre="docNombreParaCotejo"
      @cotejo-guardado="cargarExpediente"
    />

    <!-- Modal Dispensa Notarial -->
    <ExpedienteDispensaModal
      v-model="showDispensaDialog"
      :escritura-id="escrituraId"
      :requisitos-faltantes="requisitosFaltantesParaDispensa"
      @dispensa-guardada="cargarExpediente"
    />

    <!-- Diálogo para Adjuntar Documento a la Escritura -->
    <v-dialog v-model="showAdjuntarDialog" max-width="520px">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between pa-4 bg-grey-lighten-4 border-b">
          <div class="d-flex align-center ga-2">
            <v-icon color="#1B3A5F">mdi-file-upload-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold" style="color: #1b3a5f">
              Adjuntar Documento al Expediente
            </span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showAdjuntarDialog = false" />
        </v-card-title>

        <v-card-text class="pa-4">
          <v-select
            v-if="tiposCatalogo.length > 0"
            v-model="tipoDocSeleccionado"
            :items="tiposCatalogo"
            item-title="nombre"
            item-value="id"
            label="Tipo de Documento Notarial (Catálogo)"
            variant="outlined"
            density="compact"
            class="mb-3"
            clearable
          />

          <v-select
            v-model="categoriaSeleccionada"
            :items="categoriasOpciones"
            label="Categoría del Documento *"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-file-input
            v-model="archivoSeleccionado"
            label="Seleccionar Archivo *"
            variant="outlined"
            density="compact"
            prepend-icon="mdi-paperclip"
            show-size
            accept="image/*,application/pdf"
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4 d-flex justify-end ga-2">
          <v-btn
            variant="text"
            color="secondary"
            :disabled="guardandoAdjunto"
            @click="showAdjuntarDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="#1B3A5F"
            class="text-white font-weight-medium"
            :loading="guardandoAdjunto"
            :disabled="!archivoSeleccionado || guardandoAdjunto"
            @click="handleAdjuntar"
          >
            Adjuntar Documento
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
