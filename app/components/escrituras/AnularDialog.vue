<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/yup'
import { useForm } from 'vee-validate'
import * as yup from 'yup'
import { computed, ref } from 'vue'
import { useSupabaseClient } from '#imports'
import { useAuth } from '~/composables/useAuth'

const props = defineProps<{
  escrituraId: string
}>()

const emit = defineEmits<{
  anular: [motivo: string]
  anulada: []
}>()

let auth: ReturnType<typeof useAuth> | null = null
try {
  auth = useAuth()
} catch {
  // outside pinia/auth context in tests
}

const puedeAnular = computed(() => {
  if (!auth) return true
  return auth.hasPermiso('escrituras', 'anular', props.escrituraId)
})

let supabase: ReturnType<typeof useSupabaseClient> | null = null
try {
  supabase = useSupabaseClient()
} catch {
  // outside nuxt context in tests
}

const dialogOpen = ref(false)
const procesando = ref(false)
const errorMessage = ref<string | null>(null)

const schema = toTypedSchema(
  yup.object({
    motivo: yup.string().trim().required('El motivo de anulación es obligatorio'),
  }),
)

const { handleSubmit, defineField, errors, resetForm } = useForm({
  validationSchema: schema,
  initialValues: { motivo: '' },
})

const [motivo, motivoAttrs] = defineField('motivo')

function abrir(): void {
  errorMessage.value = null
  resetForm()
  dialogOpen.value = true
}

function cerrar(): void {
  dialogOpen.value = false
  errorMessage.value = null
  resetForm()
}

const onSubmit = handleSubmit(async (values) => {
  errorMessage.value = null

  if (supabase && props.escrituraId) {
    procesando.value = true
    const { error } = await supabase
      .from('escrituras')
      .update({
        estatus: 'anulada',
        motivo_anulacion: values.motivo,
      })
      .eq('id', props.escrituraId)

    procesando.value = false

    if (error) {
      errorMessage.value = error.message
      return
    }
  }

  emit('anular', values.motivo)
  emit('anulada')
  dialogOpen.value = false
  resetForm()
})

defineExpose({
  onSubmit,
  abrir,
  cerrar,
  dialogOpen,
  motivo,
  setMotivo: (val: string) => {
    motivo.value = val
  },
})
</script>

<template>
  <div v-if="puedeAnular">
    <v-btn color="error" variant="outlined" @click="abrir">
      Anular
    </v-btn>

    <v-dialog v-model="dialogOpen" max-width="500" persistent>
      <v-card color="surface" elevation="8" rounded="lg">
        <v-card-title>Anular escritura</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Esta acción es irreversible. El número de instrumento quedará cancelado y nunca podrá ser reutilizado.
          </p>

          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
            closable
            @click:close="errorMessage = null"
          >
            {{ errorMessage }}
          </v-alert>

          <v-form @submit.prevent="onSubmit">
            <v-textarea
              v-model="motivo"
              v-bind="motivoAttrs"
              label="Motivo de anulación"
              :error-messages="errors.motivo ? [errors.motivo] : []"
              variant="outlined"
              density="comfortable"
              rows="3"
              class="mb-2"
              autofocus
            />

            <div class="d-flex justify-end ga-2 mt-4">
              <v-btn variant="text" :disabled="procesando" @click="cerrar">
                Cancelar
              </v-btn>
              <v-btn type="submit" color="error" :loading="procesando">
                Anular escritura
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
