<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/yup'
import { useForm } from 'vee-validate'
import * as yup from 'yup'
import { watch } from 'vue'

const props = defineProps<{
  nombre?: string
  descripcion?: string | null
}>()

const emit = defineEmits<{
  submit: [values: { nombre: string; descripcion: string | null }]
}>()

const schema = toTypedSchema(
  yup.object({
    nombre: yup.string().required('El nombre es obligatorio'),
    descripcion: yup.string().nullable().optional(),
  }),
)

const { handleSubmit, defineField, errors, setValues } = useForm({
  validationSchema: schema,
  initialValues: {
    nombre: props.nombre ?? '',
    descripcion: props.descripcion ?? '',
  },
})

const [nombre, nombreAttrs] = defineField('nombre')
const [descripcion, descripcionAttrs] = defineField('descripcion')

watch(
  () => [props.nombre, props.descripcion],
  () => {
    setValues({ nombre: props.nombre ?? '', descripcion: props.descripcion ?? '' })
  },
)

const onSubmit = handleSubmit((values) => {
  emit('submit', { nombre: values.nombre, descripcion: values.descripcion ?? null })
})

defineExpose({ onSubmit })
</script>

<template>
  <v-form @submit.prevent="onSubmit">
    <v-text-field
      v-model="nombre"
      v-bind="nombreAttrs"
      label="Nombre del rol"
      :error-messages="errors.nombre ? [errors.nombre] : []"
      variant="outlined"
      density="comfortable"
      class="mb-2"
    />
    <v-textarea
      v-model="descripcion"
      v-bind="descripcionAttrs"
      label="Descripción (opcional)"
      :error-messages="errors.descripcion ? [errors.descripcion] : []"
      variant="outlined"
      density="comfortable"
      rows="2"
    />
    <slot name="actions" />
  </v-form>
</template>
