<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1050"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-xl border shadow-lg bg-surface d-flex flex-column" style="max-height: 85vh;">
      <!-- Header -->
      <v-card-title class="pa-4 bg-primary text-white d-flex align-center justify-space-between shrink-0">
        <div class="d-flex align-center ga-2">
          <v-icon size="22">mdi-tune-variant</v-icon>
          <span class="text-h6 font-weight-bold">Administración de Plantillas Notariales</span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="white"
          @click="$emit('update:modelValue', false)"
        />
      </v-card-title>

      <!-- Layout de 2 columnas: Lista de Plantillas a la izquierda, Editor a la derecha -->
      <div class="d-flex flex-grow-1 overflow-hidden" style="min-height: 520px;">
        <!-- Columna Izquierda: Catálogo de Plantillas -->
        <div class="border-e d-flex flex-column bg-surface-light" style="width: 320px; min-width: 320px;">
          <div class="pa-3 border-b">
            <v-text-field
              v-model="filtroPlantillas"
              placeholder="Buscar plantilla..."
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              hide-details
              clearable
            />
          </div>

          <div class="flex-grow-1 overflow-y-auto">
            <v-list density="compact" nav class="pa-2">
              <v-list-item
                v-for="p in plantillasFiltradas"
                :key="p.id"
                :active="plantillaSeleccionada?.id === p.id"
                color="primary"
                class="rounded-lg mb-1"
                @click="seleccionarPlantilla(p)"
              >
                <template #prepend>
                  <v-icon :color="p.canal === 'whatsapp' ? 'success' : 'primary'" size="18">
                    {{ p.canal === 'whatsapp' ? 'mdi-whatsapp' : p.canal === 'correo' ? 'mdi-email-outline' : 'mdi-message-text-outline' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-caption font-weight-bold text-truncate">
                  {{ p.nombre }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption text-grey text-truncate">
                  {{ p.codigo }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </div>

        <!-- Columna Derecha: Editor y Previsualización -->
        <div v-if="plantillaSeleccionada" class="flex-grow-1 pa-5 overflow-y-auto d-flex flex-column ga-3">
          <div class="d-flex align-center justify-space-between border-b pb-2">
            <div>
              <div class="text-caption font-monospace text-grey">{{ formEdicion.codigo }}</div>
              <h3 class="text-subtitle-1 font-weight-bold text-primary">{{ formEdicion.nombre }}</h3>
            </div>
            <div class="d-flex align-center ga-3">
              <v-switch
                v-model="formEdicion.requiere_confirmacion"
                color="secondary"
                label="Confirmación previa"
                density="compact"
                hide-details
              />
              <v-switch
                v-model="formEdicion.activo"
                color="success"
                label="Activa"
                density="compact"
                hide-details
              />
            </div>
          </div>

          <!-- Campos editables -->
          <v-row density="compact">
            <v-col cols="12" sm="8">
              <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
                Nombre de la Plantilla
              </label>
              <v-text-field
                v-model="formEdicion.nombre"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="4">
              <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
                Canal
              </label>
              <v-select
                v-model="formEdicion.canal"
                :items="['whatsapp', 'correo', 'sms']"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>

          <div v-if="formEdicion.canal === 'correo'">
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Asunto del Correo
            </label>
            <v-text-field
              v-model="formEdicion.asunto"
              variant="outlined"
              density="compact"
              hide-details
            />
          </div>

          <!-- Variables dinámicas clickeables -->
          <div>
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Insertar Variable Notarial Dinámica
            </label>
            <div class="d-flex flex-wrap ga-1">
              <v-chip
                v-for="v in variablesSugeridas"
                :key="v"
                size="small"
                variant="outlined"
                color="primary"
                class="font-monospace cursor-pointer"
                @click="insertarVariable(v)"
              >
                + &#123;&#123;{{ v }}&#125;&#125;
              </v-chip>
            </div>
          </div>

          <!-- Editor del cuerpo -->
          <div>
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Cuerpo del Mensaje (Texto con tokens)
            </label>
            <v-textarea
              ref="cuerpoTextareaRef"
              v-model="formEdicion.cuerpo"
              rows="5"
              variant="outlined"
              density="compact"
              hide-details
            />
          </div>

          <!-- Previsualización en Vivo con datos ficticios -->
          <div class="mt-2">
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Previsualización con Datos de Muestra
            </label>
            <div class="pa-3 rounded-lg border bg-surface-light text-caption text-pre-wrap text-grey-darken-3 font-monospace">
              {{ textoPrevisualizado }}
            </div>
          </div>

          <!-- Error Alert -->
          <v-alert
            v-if="errorGuardado"
            type="error"
            variant="tonal"
            density="compact"
            class="text-caption"
          >
            {{ errorGuardado }}
          </v-alert>
        </div>
        <div v-else class="flex-grow-1 pa-8 d-flex flex-column align-center justify-center text-grey text-center">
          <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-file-document-edit-outline</v-icon>
          <div>Seleccione una plantilla de la lista lateral para editar su contenido.</div>
        </div>
      </div>

      <!-- Footer Actions -->
      <v-card-actions class="pa-4 bg-surface-light border-t d-flex justify-space-between shrink-0">
        <v-btn
          variant="text"
          color="grey-darken-1"
          class="text-none"
          @click="$emit('update:modelValue', false)"
        >
          Cerrar
        </v-btn>

        <v-btn
          v-if="plantillaSeleccionada"
          color="primary"
          variant="flat"
          class="text-none font-weight-medium px-4"
          :loading="Boolean(cargando)"
          prepend-icon="mdi-content-save-outline"
          @click="guardar"
        >
          Guardar Plantilla
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useNotificaciones } from '~/composables/useNotificaciones'
import { interpolarTexto } from '~/utils/interpoladorNotificaciones'
import type { PlantillaNotificacion } from '~/types/notificaciones'

const props = defineProps<{
  modelValue: boolean
  plantillas?: PlantillaNotificacion[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'actualizado'): void
}>()

const { guardarPlantilla, cargando } = useNotificaciones()

const filtroPlantillas = ref('')
const plantillaSeleccionada = ref<PlantillaNotificacion | null>(null)
const errorGuardado = ref<string | null>(null)

const formEdicion = reactive<Partial<PlantillaNotificacion>>({
  id: '',
  codigo: '',
  nombre: '',
  canal: 'whatsapp',
  asunto: '',
  cuerpo: '',
  variables_disponibles: [],
  requiere_confirmacion: true,
  activo: true,
})

const variablesSugeridas = [
  'nombre_cliente',
  'numero_instrumento',
  'acto',
  'dependencia',
  'folio_tramite',
  'monto',
  'fecha_cita',
  'notaria',
]

const plantillasFiltradas = computed(() => {
  const lista = props.plantillas || []
  if (!filtroPlantillas.value) return lista
  const term = filtroPlantillas.value.toLowerCase().trim()
  return lista.filter(p =>
    p.nombre.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term)
  )
})

watch(
  () => props.plantillas,
  (nuevas) => {
    if (nuevas && nuevas.length > 0 && !plantillaSeleccionada.value) {
      seleccionarPlantilla(nuevas[0])
    }
  },
  { immediate: true }
)

function seleccionarPlantilla(p: PlantillaNotificacion) {
  plantillaSeleccionada.value = p
  errorGuardado.value = null
  formEdicion.id = p.id
  formEdicion.codigo = p.codigo
  formEdicion.nombre = p.nombre
  formEdicion.canal = p.canal
  formEdicion.asunto = p.asunto || ''
  formEdicion.cuerpo = p.cuerpo
  formEdicion.variables_disponibles = [...(p.variables_disponibles || [])]
  formEdicion.requiere_confirmacion = p.requiere_confirmacion
  formEdicion.activo = p.activo
}

function insertarVariable(token: string) {
  formEdicion.cuerpo = (formEdicion.cuerpo || '') + ` {{${token}}}`
  if (!formEdicion.variables_disponibles?.includes(token)) {
    formEdicion.variables_disponibles?.push(token)
  }
}

const textoPrevisualizado = computed(() => {
  const variablesMuestra = {
    nombre_cliente: 'Lic. Fernando Ortiz Morales',
    numero_instrumento: '48102',
    acto: 'Compraventa e Hipoteca',
    dependencia: 'Registro Público de la Propiedad (RPP)',
    folio_tramite: 'RPP-2026-98124',
    monto: '185,420.00',
    fecha_cita: 'Viernes 30 de Octubre a las 11:30 hrs',
    notaria: 'Notaría Pública 42 de la CDMX',
  }
  return interpolarTexto(formEdicion.cuerpo || '', variablesMuestra)
})

async function guardar() {
  errorGuardado.value = null
  const res = await guardarPlantilla({
    id: formEdicion.id,
    nombre: formEdicion.nombre,
    canal: formEdicion.canal,
    asunto: formEdicion.asunto || null,
    cuerpo: formEdicion.cuerpo,
    variables_disponibles: formEdicion.variables_disponibles,
    requiere_confirmacion: formEdicion.requiere_confirmacion,
    activo: formEdicion.activo,
  })

  if (res.ok) {
    emit('actualizado')
  } else {
    errorGuardado.value = res.error || 'Error al guardar la plantilla.'
  }
}

defineExpose({
  seleccionarPlantilla,
  formEdicion,
  guardar,
})
</script>

<style scoped>
.text-pre-wrap {
  white-space: pre-wrap;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
