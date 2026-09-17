<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { PasoTramite, DependenciaOficial } from '~/types/tramites'
import { useTramites } from '~/composables/useTramites'

definePageMeta({ middleware: 'require-admin' })

const {
  pasosCatalogo,
  dependencias,
  cargando,
  cargarPasosCatalogo,
  cargarCatalogos,
  guardarPasoCatalogo,
  eliminarPasoCatalogo,
  guardarDependencia,
} = useTramites()

const tabActiva = ref('pasos')

// Filtros
const busquedaPasos = ref('')
const busquedaDeps = ref('')

// Modales
const modalPasoVisible = ref(false)
const modalDepVisible = ref(false)
const pasoEnEdicion = ref<Partial<PasoTramite> | null>(null)
const depEnEdicion = ref<Partial<DependenciaOficial> & { clave_numerica?: number } | null>(null)
const guardando = ref(false)
const errorForm = ref<string | null>(null)

// Notificaciones
const snackbar = ref(false)
const snackbarMsg = ref('')

function notificar(msg: string) {
  snackbarMsg.value = msg
  snackbar.value = true
}

onMounted(async () => {
  await Promise.all([cargarPasosCatalogo(), cargarCatalogos()])
})

// Opciones de dependencias para el selector de pasos
const opcionesDependenciaClave = [
  { title: '0 - Notaría / Gestión Interna', value: 0 },
  { title: '1 - Catastro Estatal', value: 1 },
  { title: '2 - Catastro Municipal', value: 2 },
  { title: '3 - Registro Público (R.P.P.)', value: 3 },
  { title: '4 - Control Interno y Entrega', value: 4 },
  { title: '5 - INFONAVIT', value: 5 },
]

function getDependenciaNombre(clave: number): string {
  const match = opcionesDependenciaClave.find((o) => o.value === clave)
  return match?.title || `Dependencia ${clave}`
}

function getDependenciaColor(clave: number): string {
  switch (clave) {
    case 0:
      return 'primary'
    case 1:
      return 'success'
    case 2:
      return 'teal'
    case 3:
      return 'deep-purple'
    case 4:
      return 'amber-darken-3'
    case 5:
      return 'blue-grey'
    default:
      return 'grey'
  }
}

// Lista filtrada de pasos
const pasosFiltrados = computed(() => {
  if (!busquedaPasos.value.trim()) return pasosCatalogo.value
  const term = busquedaPasos.value.toLowerCase().trim()
  return pasosCatalogo.value.filter(
    (p) =>
      p.nombre.toLowerCase().includes(term) ||
      getDependenciaNombre(p.dependencia_clave).toLowerCase().includes(term)
  )
})

// Lista filtrada de dependencias
const dependenciasFiltradas = computed(() => {
  if (!busquedaDeps.value.trim()) return dependencias.value
  const term = busquedaDeps.value.toLowerCase().trim()
  return dependencias.value.filter(
    (d) =>
      d.sigla.toLowerCase().includes(term) ||
      d.nombre.toLowerCase().includes(term)
  )
})

// Acciones para Pasos
function abrirNuevoPaso() {
  pasoEnEdicion.value = {
    nombre: '',
    orden: (pasosCatalogo.value.length + 1),
    dependencia_clave: 0,
    genera_orden_pago: false,
    activo: true,
  }
  errorForm.value = null
  modalPasoVisible.value = true
}

function abrirEditarPaso(paso: PasoTramite) {
  pasoEnEdicion.value = { ...paso }
  errorForm.value = null
  modalPasoVisible.value = true
}

async function guardarPaso() {
  if (!pasoEnEdicion.value?.nombre?.trim()) {
    errorForm.value = 'El nombre del paso es obligatorio'
    return
  }

  guardando.value = true
  errorForm.value = null
  try {
    await guardarPasoCatalogo(pasoEnEdicion.value)
    modalPasoVisible.value = false
    notificar('Paso de gestoría guardado correctamente')
  } catch (err: any) {
    errorForm.value = err.message || 'Error al guardar el paso'
  } finally {
    guardando.value = false
  }
}

async function borrarPaso(id: number) {
  if (confirm(`¿Está seguro de eliminar el paso #${id} del catálogo?`)) {
    try {
      await eliminarPasoCatalogo(id)
      notificar('Paso eliminado del catálogo')
    } catch (err: any) {
      alert(err.message || 'Error al eliminar')
    }
  }
}

// Acciones para Dependencias
function abrirNuevaDependencia() {
  depEnEdicion.value = {
    sigla: '',
    nombre: '',
    dias_habiles_compromiso: 10,
    portal_web: '',
    activo: true,
  }
  errorForm.value = null
  modalDepVisible.value = true
}

function abrirEditarDependencia(dep: DependenciaOficial) {
  depEnEdicion.value = { ...dep }
  errorForm.value = null
  modalDepVisible.value = true
}

async function guardarDep() {
  if (!depEnEdicion.value?.sigla?.trim() || !depEnEdicion.value?.nombre?.trim()) {
    errorForm.value = 'La sigla y el nombre oficial son obligatorios'
    return
  }

  guardando.value = true
  errorForm.value = null
  try {
    await guardarDependencia(depEnEdicion.value)
    modalDepVisible.value = false
    notificar('Dependencia oficial guardada correctamente')
  } catch (err: any) {
    errorForm.value = err.message || 'Error al guardar dependencia'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Encabezado -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-6">
      <div>
        <div class="text-caption text-medium-emphasis mb-1">
          <router-link to="/administracion-general" class="text-decoration-none text-medium-emphasis">
            Inicio &gt; Administración General
          </router-link>
          &gt; Dependencias y Pasos de Gestoría
        </div>
        <h1 class="text-h5 font-weight-bold" style="color: #1b3a5f">
          Catálogo de Dependencias y Pasos de Gestoría
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Configure los pasos del pipeline operativo de escrituración y el directorio de dependencias gubernamentales.
        </p>
      </div>

      <div class="d-flex align-center gap-2">
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-plus"
          @click="tabActiva === 'pasos' ? abrirNuevoPaso() : abrirNuevaDependencia()"
        >
          {{ tabActiva === 'pasos' ? 'Nuevo Paso' : 'Nueva Dependencia' }}
        </v-btn>
      </div>
    </div>

    <!-- Pestañas Principales -->
    <v-card variant="outlined" class="rounded-lg bg-surface">
      <v-tabs v-model="tabActiva" color="primary" class="border-b">
        <v-tab value="pasos" prepend-icon="mdi-format-list-checks">
          Pasos de Gestoría ({{ pasosCatalogo.length }})
        </v-tab>
        <v-tab value="dependencias" prepend-icon="mdi-office-building">
          Dependencias Oficiales ({{ dependencias.length }})
        </v-tab>
      </v-tabs>

      <v-card-text class="pa-4">
        <v-window v-model="tabActiva">
          <!-- Pestaña 1: Pasos de Gestoría -->
          <v-window-item value="pasos">
            <div class="d-flex align-center justify-space-between mb-4 gap-3">
              <v-text-field
                v-model="busquedaPasos"
                label="Buscar paso..."
                placeholder="Nombre del paso o dependencia..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
                style="max-width: 380px"
              />
            </div>

            <v-table hover density="comfortable" class="border rounded-lg">
              <thead class="bg-grey-lighten-4">
                <tr>
                  <th class="text-center font-weight-bold" style="width: 80px">Orden</th>
                  <th class="text-left font-weight-bold">Nombre del Paso</th>
                  <th class="text-left font-weight-bold">Dependencia Asignada</th>
                  <th class="text-center font-weight-bold" style="width: 170px">Genera Orden de Pago</th>
                  <th class="text-center font-weight-bold" style="width: 100px">Estado</th>
                  <th class="text-center font-weight-bold" style="width: 120px">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="cargando">
                  <td colspan="6" class="text-center pa-6 text-grey">
                    <v-progress-circular indeterminate color="primary" size="24" class="mr-2" />
                    Cargando catálogo de pasos...
                  </td>
                </tr>
                <tr v-else-if="pasosFiltrados.length === 0">
                  <td colspan="6" class="text-center pa-6 text-grey">
                    No se encontraron pasos registrados.
                  </td>
                </tr>
                <tr v-for="paso in pasosFiltrados" :key="paso.id">
                  <td class="text-center font-weight-bold">
                    #{{ paso.orden }}
                  </td>
                  <td>
                    <span class="font-weight-bold text-primary">{{ paso.nombre }}</span>
                  </td>
                  <td>
                    <v-chip
                      size="small"
                      :color="getDependenciaColor(paso.dependencia_clave)"
                      variant="tonal"
                      class="font-weight-medium"
                    >
                      {{ getDependenciaNombre(paso.dependencia_clave) }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <v-chip
                      v-if="paso.genera_orden_pago"
                      size="x-small"
                      color="warning"
                      variant="flat"
                      prepend-icon="mdi-cash"
                    >
                      Genera O.P.
                    </v-chip>
                    <span v-else class="text-caption text-grey">No</span>
                  </td>
                  <td class="text-center">
                    <v-chip
                      size="x-small"
                      :color="paso.activo ? 'success' : 'grey'"
                      variant="tonal"
                    >
                      {{ paso.activo ? 'Activo' : 'Inactivo' }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <div class="d-flex align-center justify-center gap-1">
                      <v-btn
                        icon="mdi-pencil-outline"
                        size="small"
                        variant="text"
                        color="primary"
                        @click="abrirEditarPaso(paso)"
                      />
                      <v-btn
                        icon="mdi-delete-outline"
                        size="small"
                        variant="text"
                        color="error"
                        @click="borrarPaso(paso.id)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>

          <!-- Pestaña 2: Dependencias Oficiales -->
          <v-window-item value="dependencias">
            <div class="d-flex align-center justify-space-between mb-4 gap-3">
              <v-text-field
                v-model="busquedaDeps"
                label="Buscar dependencia..."
                placeholder="Sigla o nombre de la dependencia..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
                style="max-width: 380px"
              />
            </div>

            <v-table hover density="comfortable" class="border rounded-lg">
              <thead class="bg-grey-lighten-4">
                <tr>
                  <th class="text-left font-weight-bold" style="width: 140px">Sigla</th>
                  <th class="text-left font-weight-bold">Nombre de la Dependencia</th>
                  <th class="text-center font-weight-bold" style="width: 140px">Días Compromiso</th>
                  <th class="text-left font-weight-bold">Portal Web</th>
                  <th class="text-center font-weight-bold" style="width: 100px">Estado</th>
                  <th class="text-center font-weight-bold" style="width: 100px">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dep in dependenciasFiltradas" :key="dep.id">
                  <td>
                    <span class="font-weight-bold text-primary">{{ dep.sigla }}</span>
                  </td>
                  <td>
                    <span class="font-weight-medium">{{ dep.nombre }}</span>
                  </td>
                  <td class="text-center font-weight-bold">
                    {{ dep.dias_habiles_compromiso }} días
                  </td>
                  <td>
                    <a
                      v-if="dep.portal_web"
                      :href="dep.portal_web"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-caption text-decoration-none text-primary"
                    >
                      {{ dep.portal_web }}
                    </a>
                    <span v-else class="text-caption text-grey">Sin portal registrado</span>
                  </td>
                  <td class="text-center">
                    <v-chip
                      size="x-small"
                      :color="dep.activo ? 'success' : 'grey'"
                      variant="tonal"
                    >
                      {{ dep.activo ? 'Activo' : 'Inactivo' }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <v-btn
                      icon="mdi-pencil-outline"
                      size="small"
                      variant="text"
                      color="primary"
                      @click="abrirEditarDependencia(dep)"
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>

    <!-- Modal Formulario de Paso -->
    <v-dialog v-model="modalPasoVisible" max-width="500px" persistent>
      <v-card v-if="pasoEnEdicion" class="rounded-lg">
        <v-card-title class="bg-primary text-white px-6 py-4 d-flex justify-space-between align-center">
          <span class="text-h6 font-weight-bold">
            {{ pasoEnEdicion.id ? `Modificar Paso #${pasoEnEdicion.orden}` : 'Nuevo Paso de Gestoría' }}
          </span>
          <v-btn icon variant="text" size="small" color="white" @click="modalPasoVisible = false">
            <v-icon icon="mdi-close" />
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-6">
          <v-alert v-if="errorForm" type="error" variant="tonal" density="compact" class="mb-4">
            {{ errorForm }}
          </v-alert>
          <v-row density="comfortable">
            <v-col cols="12">
              <v-text-field
                v-model="pasoEnEdicion.nombre"
                label="Nombre del Paso *"
                placeholder="Ej. ING. CAT. EST., CEDULA, ETC."
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="pasoEnEdicion.orden"
                label="Orden Secuencial *"
                type="number"
                min="1"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="pasoEnEdicion.dependencia_clave"
                :items="opcionesDependenciaClave"
                label="Dependencia *"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="pasoEnEdicion.genera_orden_pago"
                label="Genera Orden de Pago de Derechos (Módulo 08)"
                density="compact"
                hide-details
                color="primary"
              />
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="pasoEnEdicion.activo"
                label="Paso Activo en el Flujo Notarial"
                density="compact"
                hide-details
                color="success"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn variant="text" @click="modalPasoVisible = false">Cancelar</v-btn>
          <v-btn color="primary" variant="elevated" :loading="guardando" @click="guardarPaso">
            Guardar Paso
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Formulario de Dependencia -->
    <v-dialog v-model="modalDepVisible" max-width="500px" persistent>
      <v-card v-if="depEnEdicion" class="rounded-lg">
        <v-card-title class="bg-primary text-white px-6 py-4 d-flex justify-space-between align-center">
          <span class="text-h6 font-weight-bold">
            {{ depEnEdicion.id ? `Editar ${depEnEdicion.sigla}` : 'Nueva Dependencia Oficial' }}
          </span>
          <v-btn icon variant="text" size="small" color="white" @click="modalDepVisible = false">
            <v-icon icon="mdi-close" />
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-6">
          <v-alert v-if="errorForm" type="error" variant="tonal" density="compact" class="mb-4">
            {{ errorForm }}
          </v-alert>
          <v-row density="comfortable">
            <v-col cols="5">
              <v-text-field
                v-model="depEnEdicion.sigla"
                label="Sigla *"
                placeholder="Ej. RPP, INFONAVIT"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
            <v-col cols="7">
              <v-text-field
                v-model.number="depEnEdicion.dias_habiles_compromiso"
                label="Días Compromiso *"
                type="number"
                min="1"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="depEnEdicion.nombre"
                label="Nombre Oficial de la Dependencia *"
                placeholder="Ej. Registro Público de la Propiedad"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="depEnEdicion.portal_web"
                label="Portal Web Oficial"
                placeholder="https://..."
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="depEnEdicion.activo"
                label="Dependencia Activa"
                density="compact"
                hide-details
                color="success"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn variant="text" @click="modalDepVisible = false">Cancelar</v-btn>
          <v-btn color="primary" variant="elevated" :loading="guardando" @click="guardarDep">
            Guardar Dependencia
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" timeout="3000" color="success">
      {{ snackbarMsg }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
</style>
