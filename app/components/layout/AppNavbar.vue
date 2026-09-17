<script setup lang="ts">
import { useDisplay } from 'vuetify'
import { useAppShell } from '~/composables/useAppShell'
import { useLayoutPreferencesStore } from '~/stores/layoutPreferences.store'
import UserMenu from '~/components/layout/UserMenu.vue'
import ThemeToggle from '~/components/layout/ThemeToggle.vue'

const { branding } = useAppShell()
const layoutPreferences = useLayoutPreferencesStore()
const display = useDisplay()

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

    <v-avatar v-if="branding.logoUrl" :image="branding.logoUrl" size="32" class="mr-2" />
    <v-icon v-else icon="mdi-domain" class="mr-2" aria-hidden="true" />

    <v-toolbar-title class="text-truncate">
      {{ branding.shortName ?? 'Sistema Notarial' }}
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
