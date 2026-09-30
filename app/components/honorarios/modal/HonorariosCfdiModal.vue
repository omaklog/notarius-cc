<script setup lang="ts">
import { ref, watch } from 'vue'
import type { HonorariosCuenta, EstatusFacturacion, MetodoPagoSAT } from '~/types/honorarios'

const props = defineProps<{
  modelValue: boolean
  cuenta: HonorariosCuenta | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'guardar', datos: Partial<HonorariosCuenta>): void
}>()

const rfcReceptor = ref('')
const razonSocialReceptor = ref('')
const regimenFiscalReceptor = ref('605')
const codigoPostalFiscal = ref('')
const usoCfdi = ref('G03')
const metodoPagoSat = ref<MetodoPagoSAT>('PUE')
const formaPagoSat = ref('03')
const estatusFacturacion = ref<EstatusFacturacion>('no_requerida')
const uuidFiscal = ref('')
const valid = ref(false)

const regimenesOptions = [
  { value: '601', title: '601 - General de Ley Personas Morales' },
  { value: '605', title: '605 - Sueldos y Salarios e Ingresos Asimilados' },
  { value: '612', title: '612 - Personas Físicas con Actividades Empresariales' },
  { value: '626', title: '626 - Régimen Simplificado de Confianza (RESICO)' },
  { value: '603', title: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '616', title: '616 - Sin obligaciones fiscales' },
]

const usoCfdiOptions = [
  { value: 'G03', title: 'G03 - Gastos en general' },
  { value: 'D01', title: 'D01 - Honorarios médicos, dentales y gastos hospitalarios' },
  { value: 'CP01', title: 'CP01 - Pagos' },
  { value: 'S01', title: 'S01 - Sin efectos fiscales' },
]

const metodoSatOptions = [
  { value: 'PUE', title: 'PUE - Pago en una sola exhibición' },
  { value: 'PPD', title: 'PPD - Pago en parcialidades o diferido' },
]

const formaSatOptions = [
  { value: '03', title: '03 - Transferencia electrónica de fondos' },
  { value: '01', title: '01 - Efectivo' },
  { value: '02', title: '02 - Cheque nominativo' },
  { value: '04', title: '04 - Tarjeta de crédito' },
  { value: '28', title: '28 - Tarjeta de débito' },
]

const estatusOptions = [
  { value: 'no_requerida', title: 'Sin Requerimiento Fiscal' },
  { value: 'pendiente', title: 'Factura Solicitada / Pendiente' },
  { value: 'facturada', title: 'Facturada / Timbrada ante el SAT' },
  { value: 'cancelada', title: 'Factura Cancelada' },
]

watch(
  () => props.cuenta,
  (c) => {
    if (c) {
      rfcReceptor.value = c.rfc_receptor || ''
      razonSocialReceptor.value = c.razon_social_receptor || ''
      regimenFiscalReceptor.value = c.regimen_fiscal_receptor || '605'
      codigoPostalFiscal.value = c.codigo_postal_fiscal || ''
      usoCfdi.value = c.uso_cfdi || 'G03'
      metodoPagoSat.value = c.metodo_pago_sat || 'PUE'
      formaPagoSat.value = c.forma_pago_sat || '03'
      estatusFacturacion.value = c.estatus_facturacion || 'no_requerida'
      uuidFiscal.value = c.uuid_fiscal || ''
    }
  },
  { immediate: true }
)

function cerrar() {
  emit('update:modelValue', false)
}

function onGuardar() {
  emit('guardar', {
    rfc_receptor: rfcReceptor.value.trim().toUpperCase() || null,
    razon_social_receptor: razonSocialReceptor.value.trim().toUpperCase() || null,
    regimen_fiscal_receptor: regimenFiscalReceptor.value,
    codigo_postal_fiscal: codigoPostalFiscal.value.trim() || null,
    uso_cfdi: usoCfdi.value,
    metodo_pago_sat: metodoPagoSat.value,
    forma_pago_sat: formaPagoSat.value,
    estatus_facturacion: estatusFacturacion.value,
    uuid_fiscal: uuidFiscal.value.trim() || null,
  })

  cerrar()
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="650" persistent @update:model-value="emit('update:modelValue', $event)">
    <v-card class="rounded-lg">
      <v-toolbar color="primary" density="compact" dark class="px-4">
        <v-icon icon="mdi-file-certificate-outline" class="mr-2" />
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Datos Fiscales y Comprobante CFDI 4.0
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="cerrar" />
      </v-toolbar>

      <v-card-text class="pa-5">
        <v-form v-model="valid" @submit.prevent="onGuardar">
          <v-select
            v-model="estatusFacturacion"
            :items="estatusOptions"
            item-title="title"
            item-value="value"
            label="Estatus de Facturación *"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-row dense>
            <v-col cols="12" sm="5">
              <v-text-field
                v-model="rfcReceptor"
                label="RFC Receptor"
                placeholder="XAXX010101000"
                variant="outlined"
                density="comfortable"
                maxlength="13"
              />
            </v-col>
            <v-col cols="12" sm="7">
              <v-text-field
                v-model="razonSocialReceptor"
                label="Nombre o Razón Social"
                placeholder="Nombre exacto según Constancia CSF"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>

          <v-row dense>
            <v-col cols="12" sm="8">
              <v-select
                v-model="regimenFiscalReceptor"
                :items="regimenesOptions"
                item-title="title"
                item-value="value"
                label="Régimen Fiscal"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="codigoPostalFiscal"
                label="C.P. Fiscal"
                placeholder="03100"
                maxlength="5"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>

          <v-row dense>
            <v-col cols="12" sm="6">
              <v-select
                v-model="usoCfdi"
                :items="usoCfdiOptions"
                item-title="title"
                item-value="value"
                label="Uso de CFDI"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="metodoPagoSat"
                :items="metodoSatOptions"
                item-title="title"
                item-value="value"
                label="Método de Pago SAT"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>

          <v-select
            v-model="formaPagoSat"
            :items="formaSatOptions"
            item-title="title"
            item-value="value"
            label="Forma de Pago SAT"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-text-field
            v-model="uuidFiscal"
            label="Folio Fiscal SAT (UUID 36 caracteres)"
            placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-shield-check"
            hint="Folio fiscal timbrado por el sistema o PAC externo"
            persistent-hint
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-surface">
        <v-spacer />
        <v-btn variant="text" class="text-capitalize" @click="cerrar">
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="text-capitalize px-4 font-weight-medium"
          @click="onGuardar"
        >
          Guardar Datos Fiscales
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
