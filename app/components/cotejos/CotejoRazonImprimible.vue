<template>
  <v-dialog
    :model-value="modelValue"
    max-width="850px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg">
      <!-- Barra superior no imprimible -->
      <v-card-title class="d-flex align-center justify-space-between bg-primary text-white pa-4 no-print">
        <div class="d-flex align-center gap-2">
          <v-icon icon="mdi-file-certificate-outline" class="mr-2" />
          <span class="text-h6 font-weight-bold">Razón Notarial de Cotejo y Compulsa</span>
        </div>
        <div class="d-flex align-center gap-2">
          <!-- Selector de Formato -->
          <v-btn-toggle
            v-model="formato"
            mandatory
            density="compact"
            color="secondary"
            class="mr-3"
          >
            <v-btn value="hoja" size="small" class="text-capitalize">
              <v-icon icon="mdi-file-document-outline" class="mr-1" />
              Hoja Carta
            </v-btn>
            <v-btn value="etiqueta" size="small" class="text-capitalize">
              <v-icon icon="mdi-tag-outline" class="mr-1" />
              Etiqueta Adhesiva
            </v-btn>
          </v-btn-toggle>

          <v-btn
            color="secondary"
            variant="flat"
            class="text-white font-weight-bold"
            prepend-icon="mdi-printer"
            @click="imprimir"
          >
            Imprimir
          </v-btn>
          <v-btn
            icon="mdi-close"
            variant="text"
            density="compact"
            color="white"
            @click="cerrar"
          />
        </div>
      </v-card-title>

      <!-- Lienzo Imprimible -->
      <v-card-text class="pa-6 printable-area bg-white">
        <!-- FORMATO 1: HOJA SUELTA CARTA -->
        <div v-if="formato === 'hoja'" class="hoja-carta pa-8">
          <!-- Membrete Oficial Dinámico de Identidad Notarial -->
          <div class="d-flex align-center justify-space-between border-b pb-4 mb-6">
            <div class="d-flex align-center gap-4">
              <v-img
                v-if="logotipoUrl"
                :src="logotipoUrl"
                max-width="85"
                max-height="85"
                contain
                alt="Logotipo Notarial"
                class="mr-4"
              />
              <v-icon
                v-else
                icon="mdi-scale-balance"
                size="64"
                color="primary"
                class="mr-4"
              />
              <div>
                <h1 class="text-h5 font-weight-bold text-primary mb-1">
                  {{ nombreNotariaCompleto }}
                </h1>
                <p class="text-subtitle-1 text-grey-darken-2 mb-0 font-weight-medium">
                  {{ titularCompleto }}
                </p>
                <p class="text-caption text-grey-darken-1 mb-0">
                  {{ domicilioCompleto }}
                </p>
              </div>
            </div>

            <!-- Folio Oficial del Acta -->
            <div class="text-right">
              <div class="border pa-2 rounded bg-grey-lighten-4">
                <span class="text-caption text-uppercase font-weight-bold text-grey-darken-2 d-block">
                  Acta de Cotejo
                </span>
                <span class="text-h5 font-weight-bold text-primary">
                  #{{ acta?.numero_acta }}
                </span>
                <span class="text-caption d-block text-grey-darken-2 font-weight-medium">
                  Libro {{ acta?.libro?.numero_libro || 1 }} · {{ acta?.anio }}
                </span>
              </div>
            </div>
          </div>

          <!-- Título Solemne -->
          <div class="text-center my-6">
            <h2 class="text-h6 font-weight-bold text-uppercase tracking-wide text-primary">
              Certificación Notarial de Cotejo y Compulsa
            </h2>
            <div class="text-caption text-grey-darken-2 text-uppercase">
              Asentada fuera de protocolo con fundamento en la Ley del Notariado
            </div>
          </div>

          <!-- Cuerpo Jurídico Oficial de la Razón de Cotejo -->
          <div class="cuerpo-razon text-justify text-body-1 leading-relaxed mb-8">
            <p class="mb-4">
              {{ textoRazon }}
            </p>
          </div>

          <!-- Observaciones y sellos -->
          <div v-if="acta?.observaciones" class="border-s-4 border-primary pl-4 py-2 mb-8 bg-grey-lighten-4 text-body-2">
            <strong>Anotaciones al calce:</strong> {{ acta.observaciones }}
          </div>

          <!-- Pie con Sello Notarial y Firma -->
          <div class="d-flex align-end justify-space-between mt-12 pt-6">
            <!-- Facsímil del Sello de Autorizar Oficial -->
            <div class="text-center sello-container">
              <v-img
                v-if="selloNotarialUrl"
                :src="selloNotarialUrl"
                max-width="120"
                max-height="120"
                contain
                alt="Sello de Autorizar"
                class="mx-auto mb-2"
              />
              <div v-else class="sello-placeholder mx-auto mb-2">
                <v-icon icon="mdi-seal" size="48" color="secondary" />
                <span class="text-caption text-uppercase d-block font-weight-bold text-secondary">
                  Sello Notarial
                </span>
              </div>
              <span class="text-caption text-grey-darken-2 font-weight-bold">
                SELLO OFICIAL DE AUTORIZAR
              </span>
            </div>

            <!-- Línea de Firma del Notario -->
            <div class="text-center firma-container" style="min-width: 280px;">
              <div class="border-b-2 border-grey-darken-2 mb-2" style="height: 60px;"></div>
              <p class="font-weight-bold text-body-1 text-primary mb-0">
                {{ titularCompleto }}
              </p>
              <p class="text-caption text-grey-darken-2 mb-0">
                {{ nombreNotariaCompleto }}
              </p>
              <p class="text-caption text-grey-darken-1 mb-0 font-italic">
                Firma y Rúbrica
              </p>
            </div>
          </div>
        </div>

        <!-- FORMATO 2: ETIQUETA ADHESIVA AL CALCE -->
        <div v-else class="etiqueta-adhesiva pa-5 border-2 rounded">
          <div class="d-flex align-center justify-space-between border-b pb-2 mb-3">
            <div class="d-flex align-center gap-2">
              <v-img
                v-if="logotipoUrl"
                :src="logotipoUrl"
                max-width="40"
                max-height="40"
                contain
                class="mr-2"
              />
              <div>
                <div class="text-subtitle-2 font-weight-bold text-primary">
                  {{ nombreNotariaCompleto }}
                </div>
                <div class="text-caption text-grey-darken-2 font-weight-medium">
                  {{ titularCompleto }}
                </div>
              </div>
            </div>
            <div class="text-right">
              <span class="text-caption font-weight-bold text-primary">
                ACTA #{{ acta?.numero_acta }} · LIBRO {{ acta?.libro?.numero_libro || 1 }}
              </span>
            </div>
          </div>

          <p class="text-caption text-justify mb-4 leading-normal">
            {{ textoRazon }}
          </p>

          <div class="d-flex align-center justify-space-between pt-2">
            <div class="d-flex align-center gap-2">
              <v-img
                v-if="selloNotarialUrl"
                :src="selloNotarialUrl"
                max-width="50"
                max-height="50"
                contain
              />
              <span class="text-caption font-weight-bold text-secondary">
                DOY FE
              </span>
            </div>
            <div class="text-center" style="min-width: 180px;">
              <div class="border-b mb-1" style="height: 30px;"></div>
              <span class="text-caption font-weight-bold text-primary">
                {{ titularCompleto }}
              </span>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-divider class="no-print" />

      <v-card-actions class="pa-4 justify-end no-print">
        <v-btn variant="text" @click="cerrar">
          Cerrar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="text-white font-weight-bold px-6"
          prepend-icon="mdi-printer"
          @click="imprimir"
        >
          Imprimir Certificación
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ActaCotejo } from '~/types/cotejos'
import { useConfiguracionNotarial } from '~/composables/useConfiguracionNotarial'
import { useCotejos } from '~/composables/useCotejos'

const props = defineProps<{
  modelValue: boolean
  acta: ActaCotejo | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const formato = ref<'hoja' | 'etiqueta'>('hoja')

const {
  nombreNotariaCompleto,
  titularCompleto,
  domicilioCompleto,
  logotipoUrl,
  selloNotarialUrl
} = useConfiguracionNotarial()

const { generarTextoRazonCotejo } = useCotejos()

const textoRazon = computed(() => {
  if (!props.acta) return ''
  return generarTextoRazonCotejo(props.acta)
})

function cerrar() {
  emit('update:modelValue', false)
}

function imprimir() {
  window.print()
}
</script>

<style scoped>
.printable-area {
  font-family: 'IBM Plex Sans', 'Segoe UI', Arial, sans-serif;
  color: #1a1a1a;
}

.hoja-carta {
  border: 1px solid rgba(27, 58, 95, 0.15);
  border-radius: 4px;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.etiqueta-adhesiva {
  background-color: #fafafa;
  border-color: #1b3a5f;
}

.sello-placeholder {
  width: 90px;
  height: 90px;
  border: 2px dashed #a9762e;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

@media print {
  body * {
    visibility: hidden;
  }
  .printable-area,
  .printable-area * {
    visibility: visible;
  }
  .printable-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    box-shadow: none;
    border: none;
  }
  .no-print {
    display: none !important;
  }
}
</style>
