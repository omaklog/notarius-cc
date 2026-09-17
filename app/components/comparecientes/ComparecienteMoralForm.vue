<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/yup'
import { useForm } from 'vee-validate'
import { computed, ref, watch } from 'vue'
import * as yup from 'yup'
import BeneficiariosControladoresSection from './BeneficiariosControladoresSection.vue'
import type { BeneficiarioControladorItem } from './BeneficiariosControladoresSection.vue'
import RepresentantesSection from './RepresentantesSection.vue'
import type { PersonaFisicaOption, RepresentanteItem } from './RepresentantesSection.vue'
import { validarRfc } from '~/composables/useRfcValidator'

export interface ComparecienteMoralFormValues {
  id?: string
  razonSocial: string
  rfc: string
  fechaConstitucion: string | null
  nacionalidad: string
  folioMercantil: string | null
  instrumentoConstitutivo: string | null
  fechaInstrumento: string | null
  notarioConstitucion: string | null
  plazaConstitucion: string | null
  objetoSocial: string | null
  calle: string | null
  numeroExterior: string | null
  numeroInterior: string | null
  colonia: string | null
  codigoPostal: string | null
  municipio: string | null
  entidadFederativa: string | null
  email: string | null
  telefono: string | null
  representantes?: RepresentanteItem[]
  beneficiariosControladores?: BeneficiarioControladorItem[]
}

const props = withDefaults(
  defineProps<{
    initialValues?: Partial<ComparecienteMoralFormValues>
    personasFisicas?: PersonaFisicaOption[]
    loading?: boolean
  }>(),
  {
    initialValues: () => ({}),
    personasFisicas: () => [],
    loading: false,
  },
)

const emit = defineEmits<{
  submit: [values: ComparecienteMoralFormValues]
  cancel: []
}>()

const schema = toTypedSchema(
  yup.object({
    razonSocial: yup.string().trim().required('La razón o denominación social es obligatoria'),
    rfc: yup
      .string()
      .trim()
      .required('El RFC es obligatorio')
      .test('rfc-moral', 'RFC de Persona Moral inválido (debe tener 12 caracteres)', (val) => {
        if (!val) return false
        const res = validarRfc(val)
        return res.isValid && res.tipoPersona === 'moral'
      }),
    fechaConstitucion: yup.string().nullable().optional(),
    nacionalidad: yup.string().trim().required('La nacionalidad es obligatoria'),
    folioMercantil: yup.string().trim().nullable().optional(),
    instrumentoConstitutivo: yup.string().trim().nullable().optional(),
    fechaInstrumento: yup.string().nullable().optional(),
    notarioConstitucion: yup.string().trim().nullable().optional(),
    plazaConstitucion: yup.string().trim().nullable().optional(),
    objetoSocial: yup.string().trim().nullable().optional(),
    calle: yup.string().trim().nullable().optional(),
    numeroExterior: yup.string().trim().nullable().optional(),
    numeroInterior: yup.string().trim().nullable().optional(),
    colonia: yup.string().trim().nullable().optional(),
    codigoPostal: yup.string().trim().nullable().optional(),
    municipio: yup.string().trim().nullable().optional(),
    entidadFederativa: yup.string().trim().nullable().optional(),
    email: yup.string().trim().email('Correo electrónico no válido').nullable().optional(),
    telefono: yup.string().trim().nullable().optional(),
  }),
)

function getDefaults(): ComparecienteMoralFormValues {
  return {
    id: props.initialValues?.id,
    razonSocial: props.initialValues?.razonSocial ?? '',
    rfc: props.initialValues?.rfc ?? '',
    fechaConstitucion: props.initialValues?.fechaConstitucion ?? null,
    nacionalidad: props.initialValues?.nacionalidad ?? 'Mexicana',
    folioMercantil: props.initialValues?.folioMercantil ?? null,
    instrumentoConstitutivo: props.initialValues?.instrumentoConstitutivo ?? null,
    fechaInstrumento: props.initialValues?.fechaInstrumento ?? null,
    notarioConstitucion: props.initialValues?.notarioConstitucion ?? null,
    plazaConstitucion: props.initialValues?.plazaConstitucion ?? null,
    objetoSocial: props.initialValues?.objetoSocial ?? null,
    calle: props.initialValues?.calle ?? null,
    numeroExterior: props.initialValues?.numeroExterior ?? null,
    numeroInterior: props.initialValues?.numeroInterior ?? null,
    colonia: props.initialValues?.colonia ?? null,
    codigoPostal: props.initialValues?.codigoPostal ?? null,
    municipio: props.initialValues?.municipio ?? null,
    entidadFederativa: props.initialValues?.entidadFederativa ?? null,
    email: props.initialValues?.email ?? null,
    telefono: props.initialValues?.telefono ?? null,
  }
}

const { handleSubmit, defineField, errors, setValues } = useForm({
  validationSchema: schema,
  initialValues: getDefaults(),
})

const [razonSocial, razonSocialAttrs] = defineField('razonSocial')
const [rfc, rfcAttrs] = defineField('rfc')
const [fechaConstitucion, fechaConstitucionAttrs] = defineField('fechaConstitucion')
const [nacionalidad, nacionalidadAttrs] = defineField('nacionalidad')
const [folioMercantil, folioMercantilAttrs] = defineField('folioMercantil')
const [instrumentoConstitutivo, instrumentoConstitutivoAttrs] = defineField('instrumentoConstitutivo')
const [fechaInstrumento, fechaInstrumentoAttrs] = defineField('fechaInstrumento')
const [notarioConstitucion, notarioConstitucionAttrs] = defineField('notarioConstitucion')
const [plazaConstitucion, plazaConstitucionAttrs] = defineField('plazaConstitucion')
const [objetoSocial, objetoSocialAttrs] = defineField('objetoSocial')
const [calle, calleAttrs] = defineField('calle')
const [numeroExterior, numeroExteriorAttrs] = defineField('numeroExterior')
const [numeroInterior, numeroInteriorAttrs] = defineField('numeroInterior')
const [colonia, coloniaAttrs] = defineField('colonia')
const [codigoPostal, codigoPostalAttrs] = defineField('codigoPostal')
const [municipio, municipioAttrs] = defineField('municipio')
const [entidadFederativa, entidadFederativaAttrs] = defineField('entidadFederativa')
const [email, emailAttrs] = defineField('email')
const [telefono, telefonoAttrs] = defineField('telefono')

// Sub-entidades relacionales
const representantes = ref<RepresentanteItem[]>(props.initialValues?.representantes ?? [])
const beneficiariosControladores = ref<BeneficiarioControladorItem[]>(
  props.initialValues?.beneficiariosControladores ?? [],
)

const rfcStatus = computed(() => {
  if (!rfc.value) return null
  return validarRfc(rfc.value)
})

watch(
  () => props.initialValues,
  (newVal) => {
    setValues(getDefaults())
    representantes.value = newVal?.representantes ?? []
    beneficiariosControladores.value = newVal?.beneficiariosControladores ?? []
  },
  { deep: true },
)

const onSubmit = handleSubmit((values) => {
  emit('submit', {
    ...values,
    id: props.initialValues?.id,
    rfc: values.rfc ? values.rfc.trim().toUpperCase() : '',
    representantes: representantes.value,
    beneficiariosControladores: beneficiariosControladores.value,
  } as ComparecienteMoralFormValues)
})

defineExpose({ onSubmit })
</script>

<template>
  <v-form @submit.prevent="onSubmit">
    <!-- Sección 1: Datos Constitutivos y Mercantiles -->
    <div class="mb-4">
      <div class="d-flex align-center mb-2">
        <v-icon icon="mdi-domain" color="primary" class="mr-2" size="small" />
        <span class="text-subtitle-2 font-weight-bold text-primary">
          1. Datos Constitutivos y Mercantiles
        </span>
      </div>
      <v-divider class="mb-3" />

      <v-row>
        <v-col cols="12">
          <v-text-field
            v-model="razonSocial"
            v-bind="razonSocialAttrs"
            label="Denominación o Razón Social *"
            placeholder="Ej. Desarrollos Inmobiliarios del Centro, S.A. de C.V."
            variant="outlined"
            density="compact"
            :error-messages="errors.razonSocial ? [errors.razonSocial] : []"
          />
        </v-col>

        <v-col cols="12" md="6">
          <v-text-field
            v-model="rfc"
            v-bind="rfcAttrs"
            label="RFC (12 caracteres con homoclave) *"
            variant="outlined"
            density="compact"
            maxlength="12"
            style="font-family: monospace;"
            :error-messages="errors.rfc ? [errors.rfc] : []"
            @update:model-value="rfc = $event?.toUpperCase()"
          >
            <template #append-inner>
              <v-chip
                v-if="rfcStatus?.isValid && rfcStatus.tipoPersona === 'moral'"
                color="success"
                size="x-small"
                variant="flat"
                class="font-weight-bold"
              >
                SAT Válido
              </v-chip>
            </template>
          </v-text-field>
        </v-col>

        <v-col cols="12" md="6">
          <v-text-field
            v-model="fechaConstitucion"
            v-bind="fechaConstitucionAttrs"
            label="Fecha de Constitución"
            type="date"
            variant="outlined"
            density="compact"
            :error-messages="errors.fechaConstitucion ? [errors.fechaConstitucion] : []"
          />
        </v-col>

        <v-col cols="12" md="6">
          <v-text-field
            v-model="folioMercantil"
            v-bind="folioMercantilAttrs"
            label="Folio Mercantil Electrónico / Folio Real (RPC)"
            placeholder="Ej. FME-2021-99882"
            variant="outlined"
            density="compact"
            :error-messages="errors.folioMercantil ? [errors.folioMercantil] : []"
          />
        </v-col>

        <v-col cols="12" md="6">
          <v-text-field
            v-model="nacionalidad"
            v-bind="nacionalidadAttrs"
            label="Nacionalidad *"
            variant="outlined"
            density="compact"
            :error-messages="errors.nacionalidad ? [errors.nacionalidad] : []"
          />
        </v-col>

        <v-col cols="12" md="4">
          <v-text-field
            v-model="instrumentoConstitutivo"
            v-bind="instrumentoConstitutivoAttrs"
            label="Instrumento Constitutivo (Escritura / Póliza)"
            placeholder="Ej. Escritura No. 45,821"
            variant="outlined"
            density="compact"
            :error-messages="errors.instrumentoConstitutivo ? [errors.instrumentoConstitutivo] : []"
          />
        </v-col>

        <v-col cols="12" md="4">
          <v-text-field
            v-model="fechaInstrumento"
            v-bind="fechaInstrumentoAttrs"
            label="Fecha del Instrumento"
            type="date"
            variant="outlined"
            density="compact"
            :error-messages="errors.fechaInstrumento ? [errors.fechaInstrumento] : []"
          />
        </v-col>

        <v-col cols="12" md="4">
          <v-text-field
            v-model="plazaConstitucion"
            v-bind="plazaConstitucionAttrs"
            label="Plaza / Entidad de Formalización"
            placeholder="Ej. Ciudad de México"
            variant="outlined"
            density="compact"
            :error-messages="errors.plazaConstitucion ? [errors.plazaConstitucion] : []"
          />
        </v-col>

        <v-col cols="12">
          <v-text-field
            v-model="notarioConstitucion"
            v-bind="notarioConstitucionAttrs"
            label="Fedatario Público Formalizador"
            placeholder="Ej. Lic. Fernando Ortiz, Notaría 18 CDMX"
            variant="outlined"
            density="compact"
            :error-messages="errors.notarioConstitucion ? [errors.notarioConstitucion] : []"
          />
        </v-col>

        <v-col cols="12">
          <v-textarea
            v-model="objetoSocial"
            v-bind="objetoSocialAttrs"
            label="Objeto Social Principal (Extracto Notarial)"
            placeholder="Compra, venta, arrendamiento y administración de bienes inmuebles..."
            rows="2"
            variant="outlined"
            density="compact"
            :error-messages="errors.objetoSocial ? [errors.objetoSocial] : []"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Sección 2: Domicilio Fiscal -->
    <div class="mb-4">
      <div class="d-flex align-center mb-2">
        <v-icon icon="mdi-map-marker-outline" color="primary" class="mr-2" size="small" />
        <span class="text-subtitle-2 font-weight-bold text-primary">2. Domicilio Fiscal</span>
      </div>
      <v-divider class="mb-3" />

      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="calle"
            v-bind="calleAttrs"
            label="Calle"
            variant="outlined"
            density="compact"
            :error-messages="errors.calle ? [errors.calle] : []"
          />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field
            v-model="numeroExterior"
            v-bind="numeroExteriorAttrs"
            label="No. Exterior"
            variant="outlined"
            density="compact"
            :error-messages="errors.numeroExterior ? [errors.numeroExterior] : []"
          />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field
            v-model="numeroInterior"
            v-bind="numeroInteriorAttrs"
            label="No. Interior"
            variant="outlined"
            density="compact"
            :error-messages="errors.numeroInterior ? [errors.numeroInterior] : []"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="codigoPostal"
            v-bind="codigoPostalAttrs"
            label="Código Postal"
            variant="outlined"
            density="compact"
            maxlength="5"
            :error-messages="errors.codigoPostal ? [errors.codigoPostal] : []"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="colonia"
            v-bind="coloniaAttrs"
            label="Colonia"
            variant="outlined"
            density="compact"
            :error-messages="errors.colonia ? [errors.colonia] : []"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="municipio"
            v-bind="municipioAttrs"
            label="Municipio o Alcaldía"
            variant="outlined"
            density="compact"
            :error-messages="errors.municipio ? [errors.municipio] : []"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="entidadFederativa"
            v-bind="entidadFederativaAttrs"
            label="Entidad Federativa / Estado"
            variant="outlined"
            density="compact"
            :error-messages="errors.entidadFederativa ? [errors.entidadFederativa] : []"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Sección 3: Contacto -->
    <div class="mb-4">
      <div class="d-flex align-center mb-2">
        <v-icon icon="mdi-phone-outline" color="primary" class="mr-2" size="small" />
        <span class="text-subtitle-2 font-weight-bold text-primary">3. Canales de Contacto</span>
      </div>
      <v-divider class="mb-3" />

      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="email"
            v-bind="emailAttrs"
            label="Correo Electrónico Corporativo"
            type="email"
            variant="outlined"
            density="compact"
            :error-messages="errors.email ? [errors.email] : []"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="telefono"
            v-bind="telefonoAttrs"
            label="Teléfono de Contacto"
            variant="outlined"
            density="compact"
            :error-messages="errors.telefono ? [errors.telefono] : []"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Sección 4: Representantes Legales y Apoderados -->
    <RepresentantesSection
      v-model="representantes"
      :personas-fisicas="personasFisicas"
      :disabled="loading"
    />

    <!-- Sección 5: Beneficiarios Controladores (CFF Art. 32-B Quáter) -->
    <BeneficiariosControladoresSection
      v-model="beneficiariosControladores"
      :personas-fisicas="personasFisicas"
      :disabled="loading"
    />

    <!-- Acciones del Formulario -->
    <v-divider class="my-4" />
    <div class="d-flex justify-end ga-3">
      <v-btn
        variant="text"
        color="secondary"
        :disabled="loading"
        @click="emit('cancel')"
      >
        Cancelar
      </v-btn>
      <v-btn
        type="submit"
        color="primary"
        variant="elevated"
        :loading="loading"
        prepend-icon="mdi-content-save"
      >
        Guardar Persona Moral
      </v-btn>
    </div>
  </v-form>
</template>
