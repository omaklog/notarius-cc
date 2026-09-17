<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
/* Asegura que las tarjetas en diálogos y tarjetas con borde tengan fondo opaco de superficie */
.v-dialog .v-card {
  background-color: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

.v-card--variant-outlined {
  background-color: rgb(var(--v-theme-surface)) !important;
}
</style>
