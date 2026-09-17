<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useSupabaseClient } from '#imports'

const props = defineProps<{
  escrituraId: string
}>()

const emit = defineEmits<{
  protocolizada: []
}>()

const supabase = useSupabaseClient()
const motivos = ref<string[]>([])
const loading = ref(true)
const procesando = ref(false)
const dialogoBloqueo = ref(false)
const errorMessage = ref<string | null>(null)

async function validar(): Promise<void> {
  loading.value = true
  const { data } = await supabase.rpc('fn_validar_protocolizacion', {
    p_escritura_id: props.escrituraId,
  })
  motivos.value = data ?? []
  loading.value = false
}

onMounted(validar)
watch(() => props.escrituraId, validar)

async function protocolizar(): Promise<void> {
  procesando.value = true
  errorMessage.value = null

  const { error } = await supabase.from('escrituras').update({ estatus: 'protocolizada' }).eq('id', props.escrituraId)

  procesando.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  emit('protocolizada')
}

defineExpose({ validar })
</script>

<template>
  <div class="d-inline-flex align-center">
    <!-- Estado de Carga / Verificando Reglas -->
    <v-btn
      v-if="loading"
      variant="tonal"
      color="grey-darken-1"
      density="comfortable"
      class="text-capitalize"
      disabled
      loading
    >
      Verificando...
    </v-btn>

    <!-- Botón de Protocolización Bloqueada (Reglas Pendientes) -->
    <v-tooltip
      v-else-if="motivos.length > 0"
      text="Protocolización Bloqueada por reglas normativas. Clic para ver detalles"
      location="bottom"
    >
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-bind="tooltipProps"
          color="warning"
          variant="tonal"
          density="comfortable"
          class="text-capitalize font-weight-bold pulse-bloqueo-btn"
          prepend-icon="mdi-shield-alert-outline"
          @click="dialogoBloqueo = true"
        >
          <span class="mr-1">Protocolización Bloqueada</span>
          <v-badge
            color="error"
            :content="motivos.length"
            inline
          />
        </v-btn>
      </template>
    </v-tooltip>

    <!-- Botón de Protocolizar (Solo visible cuando todas las reglas están cumplidas) -->
    <v-btn
      v-else
      color="success"
      variant="elevated"
      density="comfortable"
      class="text-capitalize font-weight-bold"
      prepend-icon="mdi-check-decagram"
      :loading="procesando"
      @click="protocolizar"
    >
      Protocolizar
    </v-btn>

    <!-- Modal con el Desglose de Causales de Bloqueo -->
    <v-dialog v-model="dialogoBloqueo" max-width="640px">
      <v-card class="rounded-lg shadow-xl">
        <v-card-title class="d-flex align-center justify-space-between bg-amber-darken-3 text-white px-6 py-4">
          <div class="d-flex align-center">
            <v-icon icon="mdi-shield-alert" class="mr-3" size="24" />
            <span class="text-h6 font-weight-bold">Protocolización Bloqueada</span>
          </div>
          <v-btn icon variant="text" size="small" color="white" @click="dialogoBloqueo = false">
            <v-icon icon="mdi-close" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-6">
          <div class="text-caption font-weight-bold text-uppercase text-grey-darken-1 mb-2">
            Control de Calidad y Validación Normativa
          </div>
          <p class="text-body-2 text-grey-darken-3 mb-4">
            La protocolización en sistema se encuentra <strong>bloqueada</strong> debido a que existen requisitos legales, procesales o documentales obligatorios pendientes:
          </p>

          <!-- Card de fondo amarillo con padding generoso -->
          <div
            class="bg-amber-lighten-5 border border-amber-lighten-2 rounded-lg mb-4"
            style="padding: 18px 20px !important;"
          >
            <div class="text-subtitle-2 font-weight-bold text-amber-darken-4 mb-3 d-flex align-center">
              <v-icon icon="mdi-alert-circle-outline" size="20" class="mr-2 flex-shrink-0 text-amber-darken-4" />
              <span>{{ motivos.length }} Causal(es) de Bloqueo Detectada(s):</span>
            </div>

            <!-- Lista de cards internos con espaciado, elevación y padding adecuado -->
            <div class="d-flex flex-column" style="gap: 10px;">
              <div
                v-for="(motivo, idx) in motivos"
                :key="idx"
                class="bg-white rounded-lg border border-amber-lighten-3 d-flex align-start shadow-sm"
                style="padding: 14px 16px !important;"
              >
                <div class="mr-3 mt-0.5 flex-shrink-0">
                  <v-avatar color="error" variant="tonal" size="26">
                    <v-icon icon="mdi-close" size="16" color="error" />
                  </v-avatar>
                </div>
                <div class="text-body-2 text-grey-darken-4 font-weight-medium flex-grow-1" style="line-height: 1.45;">
                  {{ motivo }}
                </div>
              </div>
            </div>
          </div>

          <div
            class="rounded-lg bg-grey-lighten-4 text-caption text-grey-darken-3 border border-grey-lighten-2 d-flex align-start"
            style="padding: 12px 16px !important;"
          >
            <v-icon icon="mdi-information-outline" size="18" color="primary" class="mr-2 flex-shrink-0 mt-0.5" />
            <div style="line-height: 1.4;">
              <strong>Nota Notarial:</strong> Al solventar las causales pendientes en sus respectivas pestañas (Comparecientes, PLD, Expediente digital o conclusión de Trámites oficiales), el botón para protocolizar la escritura se habilitará automáticamente.
            </div>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4 bg-grey-lighten-5 justify-end">
          <v-btn
            variant="elevated"
            color="primary"
            class="text-capitalize px-5"
            @click="dialogoBloqueo = false"
          >
            Entendido
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mt-2">
      {{ errorMessage }}
    </v-alert>
  </div>
</template>

<style scoped>
@keyframes pulseWarning {
  0% {
    box-shadow: 0 0 0 0 rgba(230, 81, 0, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(230, 81, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(230, 81, 0, 0);
  }
}

.pulse-bloqueo-btn {
  animation: pulseWarning 2.5s infinite;
}
</style>
