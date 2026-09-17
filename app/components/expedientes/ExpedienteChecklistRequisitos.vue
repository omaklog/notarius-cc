<script setup lang="ts">
import { computed, ref } from "vue";
import type { RequisitoExpedienteEvaluado } from "~/types/expedientes";

const props = defineProps<{
  requisitos: RequisitoExpedienteEvaluado[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "subir-requisito", requisito: RequisitoExpedienteEvaluado): void;
  (e: "ver-documento", documentoId: string): void;
  (e: "asentar-cotejo", documentoId: string): void;
}>();

const filtroCategoria = ref<string>("todos");
const filtroEstado = ref<string>("todos");

const categorias = [
  { title: "Todas las categorías", value: "todos" },
  { title: "Inmueble / Objeto", value: "inmueble" },
  { title: "Comparecientes / KYC", value: "compareciente" },
  { title: "Fiscales y Pagos", value: "fiscal" },
  { title: "Internos y Trámite", value: "interno" },
];

const requisitosFiltrados = computed(() => {
  return props.requisitos.filter((r) => {
    if (filtroCategoria.value !== "todos" && r.categoria !== filtroCategoria.value) {
      return false;
    }
    if (filtroEstado.value === "pendientes" && r.estado === "cargado") {
      return false;
    }
    if (filtroEstado.value === "cargados" && r.estado !== "cargado") {
      return false;
    }
    return true;
  });
});
</script>

<template>
  <v-card variant="outlined" class="mb-4 bg-white">
    <div class="pa-4 border-b d-flex flex-wrap align-center justify-space-between ga-3">
      <div class="d-flex align-center ga-2">
        <v-icon color="#1B3A5F" size="22">mdi-clipboard-list-outline</v-icon>
        <span class="text-subtitle-1 font-weight-bold" style="color: #1B3A5F;">
          Matriz de Requisitos Documentales por Acto
        </span>
      </div>

      <!-- Filtros rápidos -->
      <div class="d-flex flex-wrap align-center ga-2">
        <v-select
          v-model="filtroCategoria"
          :items="categorias"
          density="compact"
          variant="outlined"
          hide-details
          style="min-width: 200px;"
        />

        <v-btn-toggle v-model="filtroEstado" mandatory density="compact" variant="outlined" color="#1B3A5F">
          <v-btn value="todos" size="small">Todos</v-btn>
          <v-btn value="pendientes" size="small">Faltantes</v-btn>
          <v-btn value="cargados" size="small">Cargados</v-btn>
        </v-btn-toggle>
      </div>
    </div>

    <!-- Lista de requisitos -->
    <v-list lines="two" class="pa-0">
      <template v-if="requisitosFiltrados.length === 0">
        <div class="pa-6 text-center text-medium-emphasis">
          <v-icon size="36" color="grey-lighten-1" class="mb-2">mdi-check-all</v-icon>
          <div class="text-body-2">No se encontraron requisitos con los filtros seleccionados</div>
        </div>
      </template>

      <template v-for="(req, idx) in requisitosFiltrados" :key="req.tipo_documento_id">
        <v-list-item class="px-4 py-3" :class="{ 'border-b': idx < requisitosFiltrados.length - 1 }">
          <template #prepend>
            <v-avatar
              size="36"
              :color="req.estado === 'cargado' ? '#2F6F4E' : req.estado === 'dispensado' ? '#A9762E' : req.obligatorio ? '#B23A34' : 'grey'"
              variant="tonal"
              class="mr-3"
            >
              <v-icon size="20">
                {{ req.estado === 'cargado' ? 'mdi-check-circle' : req.estado === 'dispensado' ? 'mdi-shield-outline' : 'mdi-clock-outline' }}
              </v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="d-flex align-center ga-2 mb-1 flex-wrap">
            <span class="font-weight-medium text-body-2">{{ req.tipo_documento_nombre }}</span>

            <v-chip
              size="x-small"
              :color="req.obligatorio ? '#B23A34' : 'grey-darken-1'"
              variant="flat"
              class="text-white font-weight-bold"
            >
              {{ req.obligatorio ? 'OBLIGATORIO' : 'OPCIONAL' }}
            </v-chip>

            <v-chip size="x-small" variant="tonal" class="text-capitalize">
              {{ req.categoria }}
            </v-chip>

            <v-chip
              v-if="req.requiere_cotejo_fisico"
              size="x-small"
              color="#A9762E"
              variant="tonal"
              class="font-weight-medium"
            >
              <v-icon start size="12">mdi-certificate</v-icon>
              Exige Cotejo Físico
            </v-chip>
          </v-list-item-title>

          <v-list-item-subtitle class="text-caption">
            <div v-if="req.estado === 'cargado'" class="d-flex align-center ga-2 flex-wrap text-success">
              <v-icon size="14">mdi-file-document-outline</v-icon>
              <span>Archivo: <strong>{{ req.archivo_nombre }}</strong></span>
              <v-chip
                v-if="req.cotejado_contra_original"
                size="x-small"
                color="#2F6F4E"
                variant="flat"
                class="text-white"
              >
                ✔ Cotejado ({{ req.tipo_documento_exhibido || 'Original' }})
              </v-chip>
              <v-chip
                v-else-if="req.requiere_cotejo_fisico"
                size="x-small"
                color="#A9762E"
                variant="flat"
                class="text-white"
              >
                Copia Simple · Requiere Cotejo
              </v-chip>
            </div>

            <div v-else-if="req.estado === 'dispensado'" class="text-medium-emphasis">
              <span style="color: #A9762E; font-weight: 500;">Dispensa Notarial autorizada:</span>
              "{{ req.motivo_dispensa }}"
            </div>

            <div v-else class="text-error font-weight-medium">
              Documento no presentado aún.
            </div>
          </v-list-item-subtitle>

          <template #append>
            <div class="d-flex align-center ga-2">
              <template v-if="req.estado === 'cargado' && req.documento_id">
                <v-btn
                  size="small"
                  variant="text"
                  color="#1B3A5F"
                  prepend-icon="mdi-eye-outline"
                  @click="emit('ver-documento', req.documento_id)"
                >
                  Ver
                </v-btn>

                <v-btn
                  v-if="!req.cotejado_contra_original"
                  size="small"
                  variant="tonal"
                  color="#A9762E"
                  prepend-icon="mdi-stamp"
                  @click="emit('asentar-cotejo', req.documento_id)"
                >
                  Cotejar
                </v-btn>
              </template>

              <template v-else>
                <v-btn
                  size="small"
                  variant="outlined"
                  color="#1B3A5F"
                  prepend-icon="mdi-upload"
                  @click="emit('subir-requisito', req)"
                >
                  Adjuntar
                </v-btn>
              </template>
            </div>
          </template>
        </v-list-item>
      </template>
    </v-list>
  </v-card>
</template>
