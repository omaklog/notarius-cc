<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useAppShell } from '~/composables/useAppShell'
import { useLayoutPreferencesStore } from '~/stores/layoutPreferences.store'
import { useConfiguracionNotarial } from '~/composables/useConfiguracionNotarial'
import UserMenu from '~/components/layout/UserMenu.vue'
import ThemeToggle from '~/components/layout/ThemeToggle.vue'

const { branding } = useAppShell()
const { configuracion, nombreNotariaCompleto, logotipoUrl, cargarConfiguracion } = useConfiguracionNotarial()
const layoutPreferences = useLayoutPreferencesStore()
const display = useDisplay()

onMounted(() => {
  cargarConfiguracion()
})

const displayLogo = computed(() => logotipoUrl.value || branding.value.logoUrl)
const displayTitle = computed(() => {
  if (configuracion.value) {
    return nombreNotariaCompleto.value
  }
  return branding.value.shortName ?? 'Sistema Notarial'
})

const emit = defineEmits<{
  'toggle-menu': []
}>()

function handleToggleMenu(): void {
  layoutPreferences.toggleDrawer(display.lgAndUp.value)
  emit('toggle-menu')
}
</script>

<template>
  <v-app-bar>
    <v-app-bar-nav-icon aria-label="Abrir/cerrar menú" @click="handleToggleMenu" />

    <v-avatar v-if="displayLogo" :image="displayLogo" size="32" class="mr-2" />
    <v-icon v-else icon="mdi-domain" class="mr-2" aria-hidden="true" />

    <v-toolbar-title class="text-truncate font-display">
      {{ displayTitle }}
    </v-toolbar-title>

    <v-spacer />

    <slot name="actions" />

    <ThemeToggle />

    <!-- Notificaciones: solo reserva el slot visual (FR-006); la lógica vive en un módulo aparte -->
    <v-btn icon aria-label="Notificaciones" class="mr-2">
      <v-badge dot color="error">
        <v-icon icon="mdi-bell-outline" />
      </v-badge>
    </v-btn>

    <UserMenu />
  </v-app-bar>
</template>
