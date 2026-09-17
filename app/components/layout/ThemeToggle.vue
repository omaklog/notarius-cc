<script setup lang="ts">
import { computed } from 'vue'
import { useLayoutPreferencesStore } from '~/stores/layoutPreferences.store'

const layoutPreferences = useLayoutPreferencesStore()

const isDark = computed(() => layoutPreferences.theme === 'notariaDark')
const icon = computed(() =>
  isDark.value ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent',
)
const label = computed(() =>
  isDark.value ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
)
</script>

<template>
  <v-btn icon :aria-label="label" @click="layoutPreferences.toggleTheme()">
    <v-icon :icon="icon" />
  </v-btn>
</template>
