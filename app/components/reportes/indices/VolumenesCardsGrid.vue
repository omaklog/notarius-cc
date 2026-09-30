<template>
  <div class="volumenes-cards-grid">
    <!-- Encabezado de la Sección de Volúmenes -->
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <div>
        <h3 class="text-subtitle-1 font-weight-bold text-grey-darken-4 mb-0 d-flex align-center">
          <v-icon icon="mdi-bookshelf" color="primary" class="mr-2" size="22" />
          <span>Volúmenes del Protocolo Notarial</span>
        </h3>
        <p class="text-caption text-grey-darken-1 mb-0">
          Supervisión de foliado, captura de páginas de inicio/fin y emisión de índices notariales oficiales.
        </p>
      </div>

      <div class="d-flex align-center ga-3">
        <v-chip size="small" color="success" variant="tonal" class="font-weight-medium">
          <v-icon start icon="mdi-check-circle" size="14" />
          {{ totalCompletos }} Completos
        </v-chip>
        <v-chip size="small" color="warning" variant="tonal" class="font-weight-medium">
          <v-icon start icon="mdi-alert-circle" size="14" />
          {{ totalPendientes }} Con Pendientes
        </v-chip>
      </div>
    </div>

    <!-- Estado Cargando -->
    <div v-if="cargando" class="d-flex justify-center align-center pa-10">
      <v-progress-circular indeterminate color="primary" size="36" />
      <span class="ml-3 text-caption text-grey-darken-1">Cargando volúmenes del protocolo...</span>
    </div>

    <!-- Estado Vacío -->
    <v-card
      v-else-if="!volumenes || volumenes.length === 0"
      variant="outlined"
      class="text-center pa-8 border-dashed rounded-lg bg-surface"
    >
      <v-icon icon="mdi-book-remove-outline" size="44" color="grey-darken-1" class="mb-2" />
      <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">No hay volúmenes registrados</div>
      <div class="text-caption text-grey-darken-1">Aún no se han capturado escrituras con número de volumen asignado.</div>
    </v-card>

    <!-- Cuadrícula de Cards de Volumen -->
    <v-row v-else density="comfortable">
      <v-col
        v-for="vol in volumenes"
        :key="vol.volumen"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card
          variant="outlined"
          class="volumen-card pa-4 rounded-lg bg-surface h-100 d-flex flex-column justify-space-between cursor-pointer"
          :class="{ 'card-activo': volumenSeleccionadoId === vol.volumen }"
          @click="emit('seleccionar-volumen', vol.volumen)"
        >
          <div>
            <!-- Cabecera del Card: Número de Volumen y Año -->
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center">
                <v-avatar color="primary" variant="tonal" size="32" class="mr-2">
                  <v-icon icon="mdi-book-open-page-variant" size="18" color="primary" />
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold text-grey-darken-4 lh-1">
                    Volumen {{ vol.volumen }}
                  </div>
                  <div class="text-caption text-grey-darken-1">
                    Año {{ vol.anio }}
                  </div>
                </div>
              </div>

              <!-- Badge de Semáforo -->
              <v-chip
                :color="vol.foliado_completo ? 'success' : 'warning'"
                size="x-small"
                variant="flat"
                class="font-weight-bold"
              >
                <v-icon
                  start
                  :icon="vol.foliado_completo ? 'mdi-check-decagram' : 'mdi-alert-circle-outline'"
                  size="12"
                />
                {{ vol.foliado_completo ? 'Completo' : 'Pendiente' }}
              </v-chip>
            </div>

            <v-divider class="my-3" />

            <!-- Rango de Instrumentos y Métricas de Foliado -->
            <div class="text-body-2 text-grey-darken-3 mb-1">
              <span class="text-caption text-grey-darken-1 font-weight-medium">Rango:</span>
              <strong> Nº {{ vol.instrumento_desde }}</strong> al <strong>Nº {{ vol.instrumento_hasta }}</strong>
            </div>

            <div class="text-caption text-grey-darken-2 mb-2">
              Total de instrumentos: <strong>{{ vol.total_escrituras }}</strong>
            </div>

            <!-- Barra de Avance de Foliado -->
            <div class="mb-3">
              <div class="d-flex justify-space-between text-caption mb-1">
                <span class="text-grey-darken-1">Páginas foliadas</span>
                <span class="font-weight-bold" :class="vol.foliado_completo ? 'text-success' : 'text-warning'">
                  {{ vol.escrituras_foliadas }} / {{ vol.total_escrituras }}
                </span>
              </div>
              <v-progress-linear
                :model-value="vol.total_escrituras > 0 ? (vol.escrituras_foliadas / vol.total_escrituras) * 100 : 0"
                :color="vol.foliado_completo ? 'success' : 'warning'"
                height="6"
                rounded
              />
            </div>
          </div>

          <!-- Botón de Acción -->
          <v-btn
            variant="tonal"
            color="primary"
            density="compact"
            block
            prepend-icon="mdi-pencil-ruler"
            class="text-none font-weight-medium mt-2"
            @click.stop="emit('seleccionar-volumen', vol.volumen)"
          >
            Detalle de Foliado e Índice
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { VolumenIndiceCard } from '~/types/reportes'

const props = withDefaults(
  defineProps<{
    volumenes: VolumenIndiceCard[]
    cargando?: boolean
    volumenSeleccionadoId?: number | null
  }>(),
  {
    cargando: false,
    volumenSeleccionadoId: null,
  }
)

const emit = defineEmits<{
  (e: 'seleccionar-volumen', volumen: number): void
}>()

const totalCompletos = computed(() => {
  return props.volumenes.filter((v) => v.foliado_completo).length
})

const totalPendientes = computed(() => {
  return props.volumenes.filter((v) => !v.foliado_completo).length
})
</script>

<style scoped>
.volumen-card {
  border-color: #cbd2dc;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.volumen-card:hover {
  transform: translateY(-2px);
  border-color: #1b3a5f;
  box-shadow: 0 4px 14px rgba(27, 58, 95, 0.08);
}

.volumen-card.card-activo {
  border-color: #1b3a5f;
  background-color: rgba(27, 58, 95, 0.02);
}
</style>
