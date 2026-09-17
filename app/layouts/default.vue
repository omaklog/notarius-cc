<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useTheme } from 'vuetify'
import AppNavbar from '~/components/layout/AppNavbar.vue'
import AppDrawer from '~/components/layout/AppDrawer.vue'
import AppBreadcrumbs from '~/components/layout/AppBreadcrumbs.vue'
import { useLayoutPreferencesStore } from '~/stores/layoutPreferences.store'

const layoutPreferences = useLayoutPreferencesStore()
const vuetifyTheme = useTheme()

vuetifyTheme.change(layoutPreferences.theme)
watch(
  () => layoutPreferences.theme,
  (value) => vuetifyTheme.change(value),
)

// Nuxt/Pinia SSR-hydrate this store with the server's window-less defaults
// before client code runs; reconcile with the real browser preferences once mounted.
onMounted(() => {
  layoutPreferences.initFromBrowser()
})
</script>

<template>
  <v-app>
    <AppNavbar />

    <AppDrawer />

    <v-main>
      <AppBreadcrumbs />
      <div class="pa-4 pa-md-6">
        <slot />
      </div>
    </v-main>
  </v-app>
</template>
