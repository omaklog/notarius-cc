<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
/* Tipografía base del Design System (§3) */
:root,
body,
.v-application {
  font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

.font-display {
  font-family: 'Libre Caslon Display', Georgia, serif !important;
}

.font-mono {
  font-family: 'IBM Plex Mono', monospace !important;
}

/* Asegura que las tarjetas en diálogos y tarjetas con borde tengan fondo opaco de superficie */
.v-dialog .v-card {
  background-color: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

.v-card--variant-outlined {
  background-color: rgb(var(--v-theme-surface)) !important;
}
</style>
