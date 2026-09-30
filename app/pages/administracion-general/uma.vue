<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  calcularValorAnualUma,
  calcularValorMensualUma,
  useUmaHistorico,
  type UmaRegistro,
} from '~/composables/useUmaHistorico'
import type { FuenteOficial, RespuestaConsultaInegi } from '~~/server/api/uma/consultar-inegi.get'

definePageMeta({ middleware: 'require-admin' })

const {
  umas,
  cargando,
  guardando,
  consultandoInegi,
  error,
  anioActual,
  umaVigente,
  requiereActualizacionAnioActual,
  cargarHistorialUmas,
  guardarUma,
  confirmarValorActualParaAnio,
  consultarInegi,
} = useUmaHistorico()

// Modales y estados de UI
const showFormDialog = ref(false)
const showInegiDialog = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Formulario manual
const editingId = ref<string | null>(null)
const formValor = ref<number | null>(null)
const formFechaInicio = ref('')
const formFechaFin = ref('')
const formFuente = ref('DOF / INEGI')
const formNotas = ref('')
const formError = ref<string | null>(null)

// Datos resultado INEGI
const inegiResultado = ref<RespuestaConsultaInegi | null>(null)

onMounted(async () => {
  await cargarHistorialUmas()
})

function notificar(texto: string, color = 'success') {
  snackbarText.value = texto
  snackbarColor.value = color
  snackbar.value = true
}

function formatearMoneda(val?: number | null): string {
  if (val === null || val === undefined) return '$0.00'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val)
}

function esRegistroVigente(u: UmaRegistro): boolean {
  if (!umaVigente.value) return false
  return (umaVigente.value.id && u.id === umaVigente.value.id) ||
    (!umaVigente.value.id && u.fecha_inicio_vigencia === umaVigente.value.fecha_inicio_vigencia)
}

function abrirModalNuevo(valorSugerido?: number, fechaSugerida?: string, fuenteSugerida?: string) {
  editingId.value = null
  const anio = anioActual.value
  formValor.value = valorSugerido ?? (umaVigente.value ? Number(umaVigente.value.valor) : 117.31)
  formFechaInicio.value = fechaSugerida ?? `${anio}-02-01`
  formFechaFin.value = ''
  formFuente.value = fuenteSugerida ?? 'DOF / INEGI'
  formNotas.value = ''
  formError.value = null
  showFormDialog.value = true
}

function abrirModalEditar(u: UmaRegistro) {
  editingId.value = u.id || null
  formValor.value = Number(u.valor)
  formFechaInicio.value = u.fecha_inicio_vigencia
  formFechaFin.value = u.fecha_fin_vigencia || ''
  formFuente.value = u.fuente || 'DOF / INEGI'
  formNotas.value = u.notas || ''
  formError.value = null
  showFormDialog.value = true
}

async function handleGuardarManual() {
  if (!formValor.value || formValor.value <= 0) {
    formError.value = 'El valor diario de la UMA debe ser mayor a 0.'
    return
  }
  if (!formFechaInicio.value) {
    formError.value = 'La fecha de inicio de vigencia es requerida (formato AAAA-MM-DD).'
    return
  }

  const res = await guardarUma({
    id: editingId.value || undefined,
    valor: Number(formValor.value),
    fecha_inicio_vigencia: formFechaInicio.value,
    fecha_fin_vigencia: formFechaFin.value.trim() ? formFechaFin.value.trim() : null,
    fuente: formFuente.value.trim() || 'DOF / INEGI',
    notas: formNotas.value.trim() || null,
  })

  if (!res.ok) {
    formError.value = res.error || 'Error al guardar el registro'
    return
  }

  showFormDialog.value = false
  notificar(editingId.value ? 'Valor de UMA actualizado exitosamente.' : 'Nuevo valor de UMA registrado con éxito.')
}

async function handleConfirmarSinCambios() {
  const res = await confirmarValorActualParaAnio(anioActual.value)
  if (res.ok) {
    notificar(`Se ha ratificado el valor de la UMA para el ejercicio ${anioActual.value}.`)
  } else {
    notificar(res.error || 'No se pudo confirmar el valor de la UMA.', 'error')
  }
}

async function handleConsultarInegi(simular = false) {
  showInegiDialog.value = true
  inegiResultado.value = null
  const res = await consultarInegi(simular)
  inegiResultado.value = res
}

async function aplicarDatoInegi() {
  if (!inegiResultado.value || !inegiResultado.value.ok || !inegiResultado.value.valor) return

  const res = await guardarUma({
    valor: inegiResultado.value.valor,
    fecha_inicio_vigencia: inegiResultado.value.fechaVigenciaSugerida || `${anioActual.value}-02-01`,
    fuente: inegiResultado.value.fuente || 'INEGI Oficial',
    notas: `Actualización automática obtenida de consulta al INEGI (${inegiResultado.value.anio || anioActual.value}).`,
  })

  if (res.ok) {
    showInegiDialog.value = false
    notificar(`UMA actualizada exitosamente a ${formatearMoneda(inegiResultado.value.valor)} según INEGI.`)
  } else {
    notificar(res.error || 'Error al aplicar el valor de UMA.', 'error')
  }
}

function transferirAFallbackManual() {
  showInegiDialog.value = false
  abrirModalNuevo(undefined, `${anioActual.value}-02-01`, 'INEGI / DOF (Consulta asistida)')
}
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Breadcrumbs & Header -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-6 gap-4">
      <div>
        <div class="d-flex align-center text-caption text-medium-emphasis mb-1">
          <NuxtLink to="/administracion-general" class="text-decoration-none text-medium-emphasis">
            Administración General
          </NuxtLink>
          <v-icon size="14" class="mx-1">mdi-chevron-right</v-icon>
          <span>Valores de la UMA</span>
        </div>
        <h1 class="text-h5 font-weight-bold" style="color: #1b3a5f">
          Valores y Vigencias de la UMA
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Catálogo histórico de la Unidad de Medida y Actualización conforme a la Constitución Notarial (§6) y LFPIORPI.
        </p>
      </div>

      <!-- Header Actions -->
      <div class="d-flex align-center gap-2">
        <v-btn
          variant="outlined"
          color="#1B3A5F"
          prepend-icon="mdi-web"
          :loading="consultandoInegi"
          @click="handleConsultarInegi(false)"
        >
          Consultar INEGI
        </v-btn>
        <v-btn
          color="#1B3A5F"
          class="text-white"
          prepend-icon="mdi-plus"
          @click="abrirModalNuevo()"
        >
          Nueva UMA
        </v-btn>
      </div>
    </div>

    <!-- Opción B: Banner Preventivo de Desactualización -->
    <v-alert
      v-if="requiereActualizacionAnioActual && !cargando"
      type="warning"
      variant="tonal"
      prominent
      border="start"
      class="mb-6 bg-amber-lighten-5"
    >
      <template #title>
        <div class="d-flex align-center justify-space-between">
          <span class="font-weight-bold text-subtitle-1">
            ¡Atención! Valor de la UMA para el ejercicio {{ anioActual }} pendiente de confirmación
          </span>
          <v-chip color="warning" size="small" variant="flat" class="font-weight-bold">
            Ejercicio {{ anioActual }}
          </v-chip>
        </div>
      </template>
      <p class="text-body-2 mb-3">
        No se ha detectado un registro de UMA para el año en curso ({{ anioActual }}).
        Para garantizar la precisión jurídica en el cálculo de actividades vulnerables, topes de efectivo y avisos SAT conforme a los Arts. 17 y 32 de la LFPIORPI, verifique el valor oficial publicado por el INEGI en el DOF.
      </p>
      <div class="d-flex flex-wrap align-center gap-2">
        <v-btn
          size="small"
          color="#1B3A5F"
          class="text-white"
          prepend-icon="mdi-cloud-search-outline"
          :loading="consultandoInegi"
          @click="handleConsultarInegi(false)"
        >
          Consultar INEGI en línea
        </v-btn>
        <v-btn
          size="small"
          variant="outlined"
          color="#1B3A5F"
          prepend-icon="mdi-check-circle-outline"
          :loading="guardando"
          @click="handleConfirmarSinCambios"
        >
          Confirmar que no cambió para {{ anioActual }}
        </v-btn>
        <v-btn
          size="small"
          variant="text"
          color="#1B3A5F"
          prepend-icon="mdi-pencil-outline"
          @click="abrirModalNuevo()"
        >
          Capturar manualmente
        </v-btn>
      </div>
    </v-alert>

    <!-- Tarjetas Informativas / Valores Vigentes de Referencia -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="pa-4 bg-white h-100" rounded="lg">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-medium-emphasis font-weight-medium">UMA DIARIA VIGENTE</span>
            <v-chip color="success" size="x-small" variant="flat" class="font-weight-bold">
              ACTIVA
            </v-chip>
          </div>
          <div class="text-h4 font-weight-bold mb-1" style="color: #1b3a5f">
            {{ umaVigente ? formatearMoneda(umaVigente.valor) : 'Sin datos' }}
          </div>
          <div class="text-caption text-medium-emphasis">
            Vigente desde: {{ umaVigente?.fecha_inicio_vigencia || 'N/A' }}
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="pa-4 bg-white h-100" rounded="lg">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-medium-emphasis font-weight-medium">UMA MENSUAL (30.4)</span>
            <v-icon size="18" color="medium-emphasis">mdi-calendar-month-outline</v-icon>
          </div>
          <div class="text-h4 font-weight-bold mb-1" style="color: #1b3a5f">
            {{ umaVigente ? formatearMoneda(calcularValorMensualUma(umaVigente.valor)) : 'Sin datos' }}
          </div>
          <div class="text-caption text-medium-emphasis">
            Base legal: valor diario × 30.4
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="pa-4 bg-white h-100" rounded="lg">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-medium-emphasis font-weight-medium">UMA ANUAL (365)</span>
            <v-icon size="18" color="medium-emphasis">mdi-calendar-sync-outline</v-icon>
          </div>
          <div class="text-h4 font-weight-bold mb-1" style="color: #1b3a5f">
            {{ umaVigente ? formatearMoneda(calcularValorAnualUma(umaVigente.valor)) : 'Sin datos' }}
          </div>
          <div class="text-caption text-medium-emphasis">
            Base legal: valor mensual × 12
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="pa-4 bg-white h-100" rounded="lg">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-medium-emphasis font-weight-medium">UMBRAL AVISO SAT (16,050 UMA)</span>
            <v-icon size="18" color="#A9762E">mdi-shield-alert-outline</v-icon>
          </div>
          <div class="text-h4 font-weight-bold mb-1" style="color: #a9762e">
            {{ umaVigente ? formatearMoneda(Number(umaVigente.valor) * 16050) : 'Sin datos' }}
          </div>
          <div class="text-caption text-medium-emphasis">
            Art. 17 Fracc. XII LFPIORPI
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Opción A: Tabla Histórica de Valores UMA -->
    <v-card variant="outlined" class="bg-white" rounded="lg">
      <v-card-title class="d-flex align-center justify-space-between pa-4 border-b">
        <div class="d-flex align-center gap-2">
          <v-icon color="#1B3A5F">mdi-history</v-icon>
          <span class="text-subtitle-1 font-weight-bold" style="color: #1b3a5f">
            Catálogo Histórico de Vigencias
          </span>
        </div>
        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-refresh"
          :loading="cargando"
          @click="cargarHistorialUmas"
        >
          Actualizar tabla
        </v-btn>
      </v-card-title>

      <v-progress-linear v-if="cargando" indeterminate color="#1B3A5F" />

      <v-table hover class="text-body-2">
        <thead>
          <tr class="bg-grey-lighten-4 text-caption font-weight-bold text-uppercase">
            <th class="text-left">Estado</th>
            <th class="text-left">Valor Diario</th>
            <th class="text-left">Valor Mensual</th>
            <th class="text-left">Valor Anual</th>
            <th class="text-left">Inicio Vigencia</th>
            <th class="text-left">Fin Vigencia</th>
            <th class="text-left">Fuente Oficial</th>
            <th class="text-left">Notas / Referencia</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="umas.length === 0 && !cargando">
            <td colspan="9" class="text-center py-6 text-medium-emphasis">
              No hay registros de UMA en la base de datos. Haga clic en "Nueva UMA" o "Consultar INEGI".
            </td>
          </tr>
          <tr
            v-for="u in umas"
            :key="u.id || u.fecha_inicio_vigencia"
            :class="{ 'bg-blue-lighten-5 font-weight-medium': esRegistroVigente(u) }"
          >
            <td>
              <v-chip
                v-if="esRegistroVigente(u)"
                color="success"
                size="small"
                variant="flat"
                class="font-weight-bold"
              >
                Vigente
              </v-chip>
              <v-chip
                v-else
                size="small"
                variant="outlined"
                color="medium-emphasis"
              >
                Histórico
              </v-chip>
            </td>
            <td class="font-weight-bold" style="color: #1b3a5f">
              {{ formatearMoneda(u.valor) }}
            </td>
            <td>
              {{ formatearMoneda(calcularValorMensualUma(u.valor)) }}
            </td>
            <td>
              {{ formatearMoneda(calcularValorAnualUma(u.valor)) }}
            </td>
            <td>
              {{ u.fecha_inicio_vigencia }}
            </td>
            <td>
              {{ u.fecha_fin_vigencia || 'A la fecha (Indefinida)' }}
            </td>
            <td>
              <span class="text-caption font-weight-medium">{{ u.fuente || 'DOF / INEGI' }}</span>
            </td>
            <td>
              <span class="text-caption text-medium-emphasis">{{ u.notas || '—' }}</span>
            </td>
            <td class="text-right">
              <v-btn
                icon="mdi-pencil-outline"
                size="small"
                variant="text"
                color="#1B3A5F"
                title="Editar este registro"
                @click="abrirModalEditar(u)"
              />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Modal Formulario Alta / Edición Manual (Opción A) -->
    <v-dialog v-model="showFormDialog" max-width="540px" persistent>
      <v-card rounded="lg">
        <v-card-title class="pa-4 border-b bg-grey-lighten-4 d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-2">
            <v-icon color="#1B3A5F">mdi-currency-usd</v-icon>
            <span class="text-subtitle-1 font-weight-bold" style="color: #1b3a5f">
              {{ editingId ? 'Modificar Registro de UMA' : 'Registrar Nuevo Valor de UMA' }}
            </span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showFormDialog = false" />
        </v-card-title>

        <v-card-text class="pa-5">
          <v-alert v-if="formError" type="error" variant="tonal" density="compact" class="mb-4">
            {{ formError }}
          </v-alert>

          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model.number="formValor"
                label="Valor Diario de la UMA (MXN) *"
                prefix="$"
                type="number"
                step="0.01"
                min="0.01"
                variant="outlined"
                density="comfortable"
                hint="Ejemplo: 117.31 para el ejercicio 2026"
                persistent-hint
                required
              />
            </v-col>

            <!-- Previsualización de cálculos auxiliares -->
            <v-col cols="12" v-if="formValor && formValor > 0" class="my-1">
              <div class="pa-3 bg-grey-lighten-4 rounded text-caption d-flex justify-space-around">
                <div>
                  <span class="text-medium-emphasis">Mensual (x30.4):</span>
                  <strong> {{ formatearMoneda(calcularValorMensualUma(formValor)) }}</strong>
                </div>
                <div>
                  <span class="text-medium-emphasis">Anual (x12):</span>
                  <strong> {{ formatearMoneda(calcularValorAnualUma(formValor)) }}</strong>
                </div>
              </div>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formFechaInicio"
                label="Fecha Inicio Vigencia *"
                type="date"
                variant="outlined"
                density="comfortable"
                hint="Por ley: 1 de febrero (AAAA-02-01)"
                persistent-hint
                required
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formFechaFin"
                label="Fecha Fin Vigencia"
                type="date"
                variant="outlined"
                density="comfortable"
                hint="Dejar vacío si es la vigente"
                persistent-hint
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="formFuente"
                label="Fuente Oficial"
                variant="outlined"
                density="comfortable"
                hint="Ej. Publicación DOF 10/01/2026 o INEGI"
                persistent-hint
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formNotas"
                label="Notas Notariales / Observaciones"
                variant="outlined"
                rows="2"
                density="comfortable"
                hint="Anotación sobre ratificación o acuerdo de colegio notarial"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="pa-4 border-t d-flex justify-end gap-2">
          <v-btn variant="text" :disabled="guardando" @click="showFormDialog = false">
            Cancelar
          </v-btn>
          <v-btn
            color="#1B3A5F"
            class="text-white"
            :loading="guardando"
            @click="handleGuardarManual"
          >
            Guardar Registro
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal / Diálogo Consulta INEGI y Fallback Oficial (Opción C) -->
    <v-dialog v-model="showInegiDialog" max-width="600px">
      <v-card rounded="lg">
        <v-card-title class="pa-4 border-b bg-grey-lighten-4 d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-2">
            <v-icon color="#1B3A5F">mdi-web</v-icon>
            <span class="text-subtitle-1 font-weight-bold" style="color: #1b3a5f">
              Consulta de UMA al INEGI
            </span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showInegiDialog = false" />
        </v-card-title>

        <v-card-text class="pa-5">
          <!-- Cargando consulta -->
          <div v-if="consultandoInegi" class="text-center py-8">
            <v-progress-circular indeterminate color="#1B3A5F" size="48" class="mb-4" />
            <div class="text-subtitle-2 font-weight-bold" style="color: #1b3a5f">
              Conectando con el servicio del INEGI...
            </div>
            <div class="text-caption text-medium-emphasis">
              Consultando el indicador oficial de la Unidad de Medida y Actualización.
            </div>
          </div>

          <!-- Caso 1: Consulta Exitosa con datos -->
          <div v-else-if="inegiResultado && inegiResultado.ok">
            <v-alert type="success" variant="tonal" class="mb-4" prominent>
              <div class="font-weight-bold text-subtitle-2">
                ¡Dato oficial localizado exitosamente!
              </div>
              <div class="text-body-2">
                El servicio ha devuelto el valor oficial de la UMA para el ejercicio correspondiente.
              </div>
            </v-alert>

            <v-card variant="outlined" class="pa-4 bg-grey-lighten-5 mb-4" rounded="md">
              <v-row dense>
                <v-col cols="6">
                  <div class="text-caption text-medium-emphasis">VALOR DIARIO DETECTADO</div>
                  <div class="text-h5 font-weight-bold" style="color: #1b3a5f">
                    {{ formatearMoneda(inegiResultado.valor) }}
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption text-medium-emphasis">EJERCICIO</div>
                  <div class="text-h6 font-weight-bold">
                    {{ inegiResultado.anio || anioActual }}
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption text-medium-emphasis">INICIO DE VIGENCIA SUGERIDO</div>
                  <div class="text-body-2 font-weight-medium">
                    {{ inegiResultado.fechaVigenciaSugerida || `${anioActual}-02-01` }}
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption text-medium-emphasis">FUENTE</div>
                  <div class="text-body-2 text-medium-emphasis">
                    {{ inegiResultado.fuente || 'INEGI Oficial' }}
                  </div>
                </v-col>
              </v-row>
            </v-card>

            <div class="d-flex justify-end gap-2">
              <v-btn variant="text" @click="showInegiDialog = false">
                Cerrar
              </v-btn>
              <v-btn
                color="#1B3A5F"
                class="text-white"
                prepend-icon="mdi-check"
                :loading="guardando"
                @click="aplicarDatoInegi"
              >
                Aplicar y Actualizar Catálogo
              </v-btn>
            </div>
          </div>

          <!-- Caso 2: Consulta Fallida con Fallback Oficial Guiado -->
          <div v-else-if="inegiResultado && !inegiResultado.ok">
            <v-alert type="warning" variant="tonal" class="mb-4" border="start">
              <div class="font-weight-bold text-subtitle-2 mb-1">
                No se pudo obtener el dato automáticamente
              </div>
              <div class="text-body-2">
                {{ inegiResultado.error || 'El servicio del INEGI no se encuentra accesible en este momento.' }}
              </div>
            </v-alert>

            <p class="text-body-2 text-medium-emphasis mb-3">
              Le sugerimos consultar directamente las fuentes oficiales del gobierno federal para conocer el valor decretado para este ejercicio y registrarlo manualmente:
            </p>

            <div class="d-flex flex-column gap-2 mb-5">
              <v-card
                v-for="fuente in (inegiResultado.fuentesOficiales || [])"
                :key="fuente.url"
                variant="outlined"
                class="pa-3 bg-white"
                rounded="md"
              >
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="text-subtitle-2 font-weight-bold" style="color: #1b3a5f">
                      {{ fuente.nombre }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ fuente.descripcion }}
                    </div>
                  </div>
                  <v-btn
                    :href="fuente.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="text"
                    color="#1B3A5F"
                    icon="mdi-open-in-new"
                    size="small"
                    title="Abrir enlace oficial"
                  />
                </div>
              </v-card>
            </div>

            <div class="d-flex align-center justify-space-between">
              <v-btn
                variant="text"
                size="small"
                color="medium-emphasis"
                @click="handleConsultarInegi(true)"
              >
                Probar simulación
              </v-btn>

              <div class="d-flex gap-2">
                <v-btn variant="text" @click="showInegiDialog = false">
                  Cerrar
                </v-btn>
                <v-btn
                  color="#1B3A5F"
                  class="text-white"
                  prepend-icon="mdi-pencil"
                  @click="transferirAFallbackManual"
                >
                  Capturar Manualmente
                </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Snackbar de Retroalimentación -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000" location="bottom right">
      {{ snackbarText }}
      <template #actions>
        <v-btn variant="text" @click="snackbar = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}
.gap-4 {
  gap: 16px;
}
</style>
