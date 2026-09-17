<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PersonaFisicaOption } from './RepresentantesSection.vue'

export interface BeneficiarioControladorItem {
  id?: string
  beneficiarioFisicaId: string
  beneficiarioNombre?: string
  porcentajeParticipacion: number
  criterioControl: 'titularidad_acciones' | 'derechos_voto' | 'designacion_directores' | 'control_de_hecho'
  observaciones?: string | null
}

const props = withDefaults(
  defineProps<{
    modelValue: BeneficiarioControladorItem[]
    personasFisicas?: PersonaFisicaOption[]
    disabled?: boolean
  }>(),
  {
    modelValue: () => [],
    personasFisicas: () => [],
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [items: BeneficiarioControladorItem[]]
}>()

const showAddDialog = ref(false)

const formFisicaId = ref('')
const formPorcentaje = ref<number | null>(null)
const formCriterio = ref<'titularidad_acciones' | 'derechos_voto' | 'designacion_directores' | 'control_de_hecho'>('titularidad_acciones')
const formObservaciones = ref('')
const formError = ref<string | null>(null)

const CRITERIOS_OPCIONES = [
  { value: 'titularidad_acciones', title: 'Titularidad de Acciones (> 25% o mayoritario)' },
  { value: 'derechos_voto', title: 'Derechos de Voto Mayoritarios' },
  { value: 'designacion_directores', title: 'Facultad de Nombrar Directores / Consejo' },
  { value: 'control_de_hecho', title: 'Control de Hecho o Influencia Significativa' },
]

const totalPorcentaje = computed(() => {
  return props.modelValue.reduce((acc, curr) => acc + (Number(curr.porcentajeParticipacion) || 0), 0)
})

function abrirDialogo(): void {
  formFisicaId.value = ''
  formPorcentaje.value = null
  formCriterio.value = 'titularidad_acciones'
  formObservaciones.value = ''
  formError.value = null
  showAddDialog.value = true
}

function agregarBeneficiario(): void {
  if (!formFisicaId.value) {
    formError.value = 'Debe seleccionar una persona física del padrón'
    return
  }

  const p = Number(formPorcentaje.value)
  if (!p || p <= 0 || p > 100) {
    formError.value = 'El porcentaje debe ser un valor numérico entre 0.01 y 100'
    return
  }

  if (totalPorcentaje.value + p > 100) {
    formError.value = `La suma total de porcentajes excedería el 100% (Actual: ${totalPorcentaje.value}%)`
    return
  }

  const yaExiste = props.modelValue.some((b) => b.beneficiarioFisicaId === formFisicaId.value)
  if (yaExiste) {
    formError.value = 'Esta persona ya fue registrada como beneficiario controlador'
    return
  }

  const persona = props.personasFisicas.find((pf) => pf.id === formFisicaId.value)
  const nuevo: BeneficiarioControladorItem = {
    beneficiarioFisicaId: formFisicaId.value,
    beneficiarioNombre: persona?.nombre ?? 'Beneficiario Controlador',
    porcentajeParticipacion: p,
    criterioControl: formCriterio.value,
    observaciones: formObservaciones.value.trim() || null,
  }

  emit('update:modelValue', [...props.modelValue, nuevo])
  showAddDialog.value = false
}

function eliminarBeneficiario(index: number): void {
  const copia = [...props.modelValue]
  copia.splice(index, 1)
  emit('update:modelValue', copia)
}

function getCriterioTitulo(criterio: string): string {
  const c = CRITERIOS_OPCIONES.find((o) => o.value === criterio)
  return c?.title ?? criterio
}
</script>

<template>
  <div class="mb-4">
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="d-flex align-center">
        <v-icon icon="mdi-shield-account-outline" color="secondary" class="mr-2" size="small" />
        <div>
          <span class="text-subtitle-2 font-weight-bold text-secondary">
            Beneficiarios Controladores (CFF Art. 32-B Quáter)
          </span>
          <v-chip
            size="x-small"
            class="ml-2 font-weight-bold"
            :color="totalPorcentaje > 100 ? 'error' : 'secondary'"
            variant="tonal"
          >
            Total Declarado: {{ totalPorcentaje.toFixed(2) }}%
          </v-chip>
        </div>
      </div>
      <v-btn
        size="small"
        color="secondary"
        variant="tonal"
        prepend-icon="mdi-plus"
        :disabled="disabled"
        @click="abrirDialogo"
      >
        Declarar Beneficiario
      </v-btn>
    </div>
    <v-divider class="mb-3" />

    <!-- Lista de Beneficiarios Controladores -->
    <div v-if="modelValue.length === 0" class="pa-4 bg-surface rounded text-center border">
      <p class="text-caption text-medium-emphasis mb-0">
        No se han registrado beneficiarios controladores para el cumplimiento del CFF Art. 32-B Quáter.
      </p>
    </div>

    <v-table v-else density="compact" class="border rounded">
      <thead>
        <tr>
          <th>Beneficiario Controlador</th>
          <th>Participación (%)</th>
          <th>Criterio de Control</th>
          <th>Observaciones</th>
          <th class="text-right">Acción</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in modelValue" :key="idx">
          <td class="font-weight-medium">
            {{ item.beneficiarioNombre || item.beneficiarioFisicaId }}
          </td>
          <td>
            <v-chip size="x-small" color="secondary" variant="flat" class="font-weight-bold">
              {{ Number(item.porcentajeParticipacion).toFixed(2) }}%
            </v-chip>
          </td>
          <td class="text-caption">
            {{ getCriterioTitulo(item.criterioControl) }}
          </td>
          <td class="text-caption text-medium-emphasis">
            {{ item.observaciones || '—' }}
          </td>
          <td class="text-right">
            <v-btn
              icon="mdi-delete-outline"
              size="x-small"
              color="error"
              variant="text"
              :disabled="disabled"
              title="Quitar beneficiario"
              @click="eliminarBeneficiario(idx)"
            />
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Modal Declarar Beneficiario -->
    <v-dialog v-model="showAddDialog" max-width="560">
      <v-card>
        <v-card-title class="pa-4 bg-secondary text-white d-flex align-center">
          <v-icon icon="mdi-shield-account" class="mr-2" />
          <span class="text-subtitle-1 font-weight-bold">Declarar Beneficiario Controlador</span>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-alert v-if="formError" type="error" density="compact" variant="tonal" class="mb-3">
            {{ formError }}
          </v-alert>

          <v-select
            v-model="formFisicaId"
            label="Persona Física del Padrón *"
            :items="personasFisicas"
            item-title="nombre"
            item-value="id"
            variant="outlined"
            density="compact"
            class="mb-3"
            no-data-text="No hay personas físicas disponibles"
          />

          <v-text-field
            v-model.number="formPorcentaje"
            label="Porcentaje de Participación (%) *"
            type="number"
            step="0.01"
            min="0.01"
            max="100"
            variant="outlined"
            density="compact"
            class="mb-3"
            placeholder="Ej. 51.00"
          />

          <v-select
            v-model="formCriterio"
            label="Criterio de Control Matriz *"
            :items="CRITERIOS_OPCIONES"
            item-title="title"
            item-value="value"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-textarea
            v-model="formObservaciones"
            label="Observaciones y Respaldo Documental"
            placeholder="Identificación con libro de socios o asamblea constitutiva..."
            rows="2"
            variant="outlined"
            density="compact"
          />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 justify-end ga-2">
          <v-btn variant="text" @click="showAddDialog = false">Cancelar</v-btn>
          <v-btn color="secondary" variant="elevated" @click="agregarBeneficiario">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
