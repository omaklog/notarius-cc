<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/yup'
import { useForm } from 'vee-validate'
import * as yup from 'yup'
import { watch } from 'vue'

export interface ActoJuridicoOption {
  id: string
  nombre: string
}

export interface EscrituraFormValues {
  instrumento: number
  volumen: number
  actoJuridicoId: string
  objeto: string
  paginaInicial: number | null
  paginaFinal: number | null
  fechaCelebracion: string | null
  montoOperacion: number | null
  observaciones: string | null
}

const props = defineProps<{
  actosJuridicos: ActoJuridicoOption[]
  instrumento?: number
  volumen?: number
  actoJuridicoId?: string
  objeto?: string
  paginaInicial?: number | null
  paginaFinal?: number | null
  fechaCelebracion?: string | null
  montoOperacion?: number | null
  observaciones?: string | null
}>()

const emit = defineEmits<{
  submit: [values: EscrituraFormValues]
}>()

const schema = toTypedSchema(
  yup.object({
    instrumento: yup
      .number()
      .typeError('El número de escritura debe ser un número')
      .required('El número de escritura es obligatorio')
      .integer('Debe ser un número entero')
      .min(1, 'El número de escritura debe ser mayor a 0'),
    volumen: yup
      .number()
      .typeError('El volumen debe ser un número')
      .required('El volumen es obligatorio')
      .integer('El volumen debe ser un número entero')
      .min(1, 'El volumen debe ser mayor a 0'),
    actoJuridicoId: yup.string().required('El acto jurídico es obligatorio'),
    objeto: yup.string().required('El objeto es obligatorio'),
    paginaInicial: yup.number().typeError('Debe ser un número').nullable().optional(),
    paginaFinal: yup.number().typeError('Debe ser un número').nullable().optional(),
    fechaCelebracion: yup.string().nullable().optional(),
    montoOperacion: yup.number().typeError('Debe ser un número').nullable().optional(),
    observaciones: yup.string().nullable().optional(),
  }),
)

function initialValues(): EscrituraFormValues {
  return {
    instrumento: props.instrumento ?? (undefined as unknown as number),
    volumen: props.volumen ?? (undefined as unknown as number),
    actoJuridicoId: props.actoJuridicoId ?? '',
    objeto: props.objeto ?? '',
    paginaInicial: props.paginaInicial ?? null,
    paginaFinal: props.paginaFinal ?? null,
    fechaCelebracion: props.fechaCelebracion ?? null,
    montoOperacion: props.montoOperacion ?? null,
    observaciones: props.observaciones ?? null,
  }
}

const { handleSubmit, defineField, errors, setValues } = useForm({
  validationSchema: schema,
  initialValues: initialValues(),
})

const [instrumento, instrumentoAttrs] = defineField('instrumento')
const [volumen, volumenAttrs] = defineField('volumen')
const [actoJuridicoId, actoJuridicoIdAttrs] = defineField('actoJuridicoId')
const [objeto, objetoAttrs] = defineField('objeto')
const [paginaInicial, paginaInicialAttrs] = defineField('paginaInicial')
const [paginaFinal, paginaFinalAttrs] = defineField('paginaFinal')
const [fechaCelebracion, fechaCelebracionAttrs] = defineField('fechaCelebracion')
const [montoOperacion, montoOperacionAttrs] = defineField('montoOperacion')
const [observaciones, observacionesAttrs] = defineField('observaciones')

watch(
  () => [
    props.instrumento,
    props.volumen,
    props.actoJuridicoId,
    props.objeto,
    props.paginaInicial,
    props.paginaFinal,
    props.fechaCelebracion,
    props.montoOperacion,
    props.observaciones,
  ],
  () => {
    setValues(initialValues())
  },
)

const onSubmit = handleSubmit((values) => {
  emit('submit', values as EscrituraFormValues)
})

defineExpose({ onSubmit })
</script>

<template>
  <v-form @submit.prevent="onSubmit">
    <div class="d-flex ga-2 mb-2">
      <v-text-field
        v-model.number="instrumento"
        v-bind="instrumentoAttrs"
        label="Número de escritura / Instrumento"
        type="number"
        :error-messages="errors.instrumento ? [errors.instrumento] : []"
        variant="outlined"
        density="comfortable"
        min="1"
      />
      <v-text-field
        v-model.number="volumen"
        v-bind="volumenAttrs"
        label="Volumen"
        type="number"
        :error-messages="errors.volumen ? [errors.volumen] : []"
        variant="outlined"
        density="comfortable"
        min="1"
      />
    </div>
    <v-select
      v-model="actoJuridicoId"
      v-bind="actoJuridicoIdAttrs"
      label="Acto jurídico"
      :items="actosJuridicos"
      item-title="nombre"
      item-value="id"
      :error-messages="errors.actoJuridicoId ? [errors.actoJuridicoId] : []"
      variant="outlined"
      density="comfortable"
      class="mb-2"
    />
    <v-text-field
      v-model="objeto"
      v-bind="objetoAttrs"
      label="Objeto"
      :error-messages="errors.objeto ? [errors.objeto] : []"
      variant="outlined"
      density="comfortable"
      class="mb-2"
    />
    <div class="d-flex ga-2 mb-2">
      <v-text-field
        v-model.number="paginaInicial"
        v-bind="paginaInicialAttrs"
        label="Página inicial (opcional)"
        type="number"
        :error-messages="errors.paginaInicial ? [errors.paginaInicial] : []"
        variant="outlined"
        density="comfortable"
      />
      <v-text-field
        v-model.number="paginaFinal"
        v-bind="paginaFinalAttrs"
        label="Página final (opcional)"
        type="number"
        :error-messages="errors.paginaFinal ? [errors.paginaFinal] : []"
        variant="outlined"
        density="comfortable"
      />
    </div>
    <div class="d-flex ga-2 mb-2">
      <v-text-field
        v-model="fechaCelebracion"
        v-bind="fechaCelebracionAttrs"
        label="Fecha de celebración (opcional)"
        type="date"
        :error-messages="errors.fechaCelebracion ? [errors.fechaCelebracion] : []"
        variant="outlined"
        density="comfortable"
      />
      <v-text-field
        v-model.number="montoOperacion"
        v-bind="montoOperacionAttrs"
        label="Monto de la operación, MXN (opcional)"
        type="number"
        :error-messages="errors.montoOperacion ? [errors.montoOperacion] : []"
        variant="outlined"
        density="comfortable"
      />
    </div>
    <v-textarea
      v-model="observaciones"
      v-bind="observacionesAttrs"
      label="Observaciones (opcional)"
      :error-messages="errors.observaciones ? [errors.observaciones] : []"
      variant="outlined"
      density="comfortable"
      rows="2"
      class="mb-2"
    />
    <slot name="actions" />
  </v-form>
</template>
