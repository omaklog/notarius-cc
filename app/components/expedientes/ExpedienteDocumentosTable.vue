<script setup lang="ts">
import { computed, ref } from "vue";
import type { ExpedienteItemConsolidado } from "~/types/expedientes";

const props = defineProps<{
  documentos: ExpedienteItemConsolidado[];
  loading?: boolean;
  modelValue?: string[]; // IDs seleccionados
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
  (e: "ver-documento", doc: ExpedienteItemConsolidado): void;
  (e: "descargar-documento", doc: ExpedienteItemConsolidado): void;
  (e: "asentar-cotejo", documentoId: string): void;
}>();

const busqueda = ref("");
const filtroOrigen = ref<"todos" | "escritura" | "compareciente">("todos");

const documentosFiltrados = computed(() => {
  return props.documentos.filter((doc) => {
    if (filtroOrigen.value !== "todos" && doc.origen_documento !== filtroOrigen.value) {
      return false;
    }
    if (busqueda.value.trim()) {
      const q = busqueda.value.toLowerCase().trim();
      const matchNombre = (doc.archivo_nombre || "").toLowerCase().includes(q);
      const matchComp = (doc.compareciente_nombre || "").toLowerCase().includes(q);
      const matchCat = (doc.categoria || "").toLowerCase().includes(q);
      if (!matchNombre && !matchComp && !matchCat) return false;
    }
    return true;
  });
});

const seleccionados = computed({
  get: () => props.modelValue || [],
  set: (val: string[]) => emit("update:modelValue", val),
});

const todosSeleccionados = computed(() => {
  if (documentosFiltrados.value.length === 0) return false;
  return documentosFiltrados.value.every((d) => seleccionados.value.includes(d.documento_id));
});

function toggleSeleccionarTodos(): void {
  if (todosSeleccionados.value) {
    const idsVisibles = new Set(documentosFiltrados.value.map((d) => d.documento_id));
    seleccionados.value = seleccionados.value.filter((id) => !idsVisibles.has(id));
  } else {
    const nuevos = new Set([...seleccionados.value, ...documentosFiltrados.value.map((d) => d.documento_id)]);
    seleccionados.value = Array.from(nuevos);
  }
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
</script>

<template>
  <v-card variant="outlined" class="bg-white">
    <!-- Barra de búsqueda y filtros -->
    <div class="pa-3 border-b d-flex flex-wrap align-center justify-space-between ga-3">
      <div class="d-flex flex-wrap align-center ga-3 flex-grow-1">
        <v-text-field
          v-model="busqueda"
          density="compact"
          variant="outlined"
          placeholder="Buscar archivo, compareciente o categoría..."
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
          style="max-width: 380px;"
        />

        <v-chip-group v-model="filtroOrigen" mandatory>
          <v-chip value="todos" filter variant="tonal" size="small">
            Todos ({{ documentos.length }})
          </v-chip>
          <v-chip value="escritura" filter variant="tonal" color="primary" size="small">
            Instrumento ({{ documentos.filter((d) => d.origen_documento === 'escritura').length }})
          </v-chip>
          <v-chip value="compareciente" filter variant="tonal" color="#A9762E" size="small">
            Comparecientes ({{ documentos.filter((d) => d.origen_documento === 'compareciente').length }})
          </v-chip>
        </v-chip-group>
      </div>

      <div v-if="seleccionados.length > 0" class="d-flex align-center ga-2">
        <v-chip size="small" color="#1B3A5F" variant="flat" class="text-white">
          {{ seleccionados.length }} seleccionados
        </v-chip>
        <v-btn
          variant="text"
          size="small"
          color="grey"
          @click="seleccionados = []"
        >
          Limpiar selección
        </v-btn>
      </div>
    </div>

    <!-- Progreso -->
    <v-progress-linear v-if="loading" indeterminate color="#1B3A5F" />

    <!-- Estado vacío -->
    <div v-if="!loading && documentosFiltrados.length === 0" class="pa-8 text-center text-medium-emphasis">
      <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-folder-open-outline</v-icon>
      <div class="text-subtitle-1 font-weight-medium">No hay documentos en el expediente</div>
      <div class="text-caption">
        Los archivos adjuntos al instrumento y los documentos de identificación KYC aparecerán aquí.
      </div>
    </div>

    <!-- Tabla -->
    <v-table v-else hover density="comfortable">
      <thead>
        <tr>
          <th style="width: 48px;" class="text-center">
            <v-checkbox-btn
              :model-value="todosSeleccionados"
              density="compact"
              @update:model-value="toggleSeleccionarTodos"
            />
          </th>
          <th class="text-left">Documento</th>
          <th class="text-left">Categoría</th>
          <th class="text-left">Origen / Titular</th>
          <th class="text-left">Fe de Cotejo Notarial</th>
          <th class="text-left">Tamaño</th>
          <th class="text-left">Fecha</th>
          <th class="text-end">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="doc in documentosFiltrados" :key="doc.documento_id">
          <!-- Checkbox selección individual -->
          <td class="text-center">
            <v-checkbox
              v-model="seleccionados"
              :value="doc.documento_id"
              density="compact"
              hide-details
            />
          </td>

          <!-- Nombre de archivo e icono -->
          <td>
            <div class="d-flex align-center">
              <v-icon
                :color="doc.origen_documento === 'compareciente' ? '#A9762E' : '#1B3A5F'"
                class="mr-2"
                size="22"
              >
                {{ doc.origen_documento === 'compareciente' ? 'mdi-account-box-outline' : 'mdi-file-document-outline' }}
              </v-icon>
              <div>
                <div class="font-weight-medium text-body-2">{{ doc.archivo_nombre }}</div>
                <div v-if="doc.lado" class="text-caption text-medium-emphasis">
                  Cara: <span class="text-capitalize">{{ doc.lado }}</span>
                </div>
              </div>
            </div>
          </td>

          <!-- Categoría -->
          <td>
            <v-chip size="x-small" variant="tonal" class="text-capitalize">
              {{ doc.categoria?.replace(/_/g, ' ') }}
            </v-chip>
          </td>

          <!-- Origen -->
          <td>
            <v-chip
              v-if="doc.origen_documento === 'compareciente'"
              size="small"
              color="#A9762E"
              variant="flat"
              class="text-white font-weight-medium"
            >
              <v-icon start size="14">mdi-badge-account-horizontal</v-icon>
              {{ doc.compareciente_nombre || 'Compareciente KYC' }}
            </v-chip>
            <v-chip v-else size="small" color="#1B3A5F" variant="tonal">
              <v-icon start size="14">mdi-file-cabinet</v-icon>
              Instrumento Notarial
            </v-chip>
          </td>

          <!-- Fe de Cotejo Notarial -->
          <td>
            <template v-if="doc.cotejado_contra_original">
              <v-chip
                size="small"
                color="#2F6F4E"
                variant="flat"
                class="text-white font-weight-medium"
                :title="doc.cotejador_nombre ? 'Cotejado por: ' + doc.cotejador_nombre : 'Cotejado contra original'"
              >
                <v-icon start size="14">mdi-seal</v-icon>
                Cotejado ({{ doc.tipo_documento_exhibido || 'Original' }})
              </v-chip>
            </template>
            <template v-else>
              <div class="d-flex align-center ga-1">
                <span class="text-caption text-medium-emphasis">Copia simple</span>
                <v-btn
                  size="x-small"
                  variant="text"
                  color="#A9762E"
                  @click="emit('asentar-cotejo', doc.documento_id)"
                >
                  Cotejar
                </v-btn>
              </div>
            </template>
          </td>

          <!-- Tamaño -->
          <td class="text-caption text-medium-emphasis">
            {{ formatBytes(doc.size_bytes) }}
          </td>

          <!-- Fecha -->
          <td class="text-caption text-medium-emphasis">
            {{ formatDate(doc.created_at) }}
          </td>

          <!-- Acciones -->
          <td class="text-end">
            <div class="d-flex align-center justify-end ga-1">
              <v-btn
                variant="text"
                size="small"
                color="#1B3A5F"
                icon="mdi-eye-outline"
                title="Ver en visor"
                @click="emit('ver-documento', doc)"
              />
              <v-btn
                variant="text"
                size="small"
                color="#1B3A5F"
                icon="mdi-download-outline"
                title="Descargar"
                @click="emit('descargar-documento', doc)"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>
