<script setup lang="ts">
definePageMeta({ middleware: 'require-admin' })

const modulos = [
  {
    titulo: 'Tipos de Identificación Oficial',
    descripcion: 'Configuración paramétrica de documentos de identidad, reglas de escaneo OCR y obligatoriedad de reverso.',
    icono: 'mdi-card-account-details-outline',
    ruta: '/administracion-general/tipos-identificacion',
    color: '#1B3A5F',
  },
  {
    titulo: 'Actos Jurídicos y Roles',
    descripcion: 'Catálogo de actos traslativos y no traslativos, actividades vulnerables y asignación de roles de compareciente permitidos.',
    icono: 'mdi-file-document-edit-outline',
    ruta: '/administracion-general/actos-juridicos',
    color: '#1B3A5F',
  },
  {
    titulo: 'Roles y Permisos del Sistema',
    descripcion: 'Gestión granular de roles de usuario y permisos dinámicos por módulo y alcance en la notaría.',
    icono: 'mdi-shield-account-outline',
    ruta: '/administracion-general/roles',
    color: '#1B3A5F',
  },
  {
    titulo: 'Directorio de Usuarios',
    descripcion: 'Administración de cuentas notariales, asignación de roles y activación/desactivación de accesos.',
    icono: 'mdi-account-multiple-outline',
    ruta: '/administracion-general/usuarios',
    color: '#1B3A5F',
  },
  {
    titulo: 'Dependencias y Pasos de Gestoría',
    descripcion: 'Configuración paramétrica del pipeline de 17 pasos de gestoría, catálogo de dependencias oficiales y vinculación con órdenes de pago.',
    icono: 'mdi-format-list-checks',
    ruta: '/administracion-general/tramites-pasos',
    color: '#1B3A5F',
  },
]
</script>

<template>
  <v-container fluid class="pa-6">
    <div class="mb-6">
      <div class="text-caption text-medium-emphasis mb-1">
        Inicio &gt; Administración General
      </div>
      <h1 class="text-h5 font-weight-bold" style="color: #1b3a5f">
        Panel de Administración General
      </h1>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Gestión centralizada de catálogos notariales, configuración de seguridad y parámetros operativos.
      </p>
    </div>

    <v-row>
      <v-col
        v-for="mod in modulos"
        :key="mod.ruta"
        cols="12"
        sm="6"
        lg="3"
      >
        <v-card
          variant="outlined"
          class="h-100 bg-white d-flex flex-column transition-swing"
          hover
          rounded="lg"
          :to="mod.ruta"
        >
          <v-card-text class="d-flex flex-column flex-grow-1 pa-5">
            <div class="d-flex align-center mb-3">
              <v-avatar :color="mod.color" size="44" rounded="md" class="mr-3">
                <v-icon color="white" size="24">{{ mod.icono }}</v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-bold" style="color: #1b3a5f">
                {{ mod.titulo }}
              </div>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-4 flex-grow-1">
              {{ mod.descripcion }}
            </p>
            <div class="d-flex align-center text-caption font-weight-bold" style="color: #a9762e">
              <span>Configurar catálogo</span>
              <v-icon size="16" class="ml-1">mdi-arrow-right</v-icon>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
