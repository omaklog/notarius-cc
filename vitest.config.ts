import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    css: true,
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
  },
  ssr: {
    noExternal: ['vuetify'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./app', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '#imports': fileURLToPath(new URL('./tests/unit/imports-shim.ts', import.meta.url)),
      '#supabase/server': fileURLToPath(new URL('./tests/unit/supabase-server-shim.ts', import.meta.url)),
    },
  },
})
