// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['vuetify-nuxt-module', '@pinia/nuxt', '@nuxtjs/supabase'],

  runtimeConfig: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
  },

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: [],
    },
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
    },
    types: false,
  },

  // @supabase/ssr imports named exports (`parse`/`serialize`) from `cookie`
  // that esbuild's CJS→ESM named-export detection fails to pick up in this
  // toolchain, breaking client-side hydration entirely (SyntaxError: does
  // not provide an export named 'parse'). optimizeDeps.include/needsInterop
  // (Vite's usual escape hatches) did not fix it — the import never reached
  // Vite's dependency pre-bundler at all. Aliased to a minimal genuine-ESM
  // reimplementation instead (see app/shims/cookie-esm-shim.mjs).
  vite: {
    resolve: {
      alias: {
        cookie: fileURLToPath(new URL('./app/shims/cookie-esm-shim.mjs', import.meta.url)),
      },
    },
  },

  app: {
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },

  vuetify: {
    moduleOptions: {},
    vuetifyOptions: {
      theme: {
        defaultTheme: 'notariaLight',
        themes: {
          notariaLight: {
            dark: false,
            colors: {
              primary: '#1B3A5F',
              'primary-darken-1': '#12283F',
              secondary: '#A9762E',
              background: '#F0F2F4',
              surface: '#FFFFFF',
              success: '#2F6F4E',
              warning: '#C98A2C',
              error: '#B23A34',
              info: '#2F6690',
            },
          },
          notariaDark: {
            dark: true,
            colors: {
              primary: '#5B8DC9',
              'primary-darken-1': '#7BA5D6',
              secondary: '#C99A4A',
              background: '#10161F',
              surface: '#1A2230',
              success: '#4F9C74',
              warning: '#D9A44B',
              error: '#D9615B',
              info: '#5B94BE',
            },
          },
        },
      },
      defaults: {
        VBtn: { rounded: 'md' },
        VCard: { variant: 'outlined', rounded: 'md' },
        VDialog: {
          VCard: { color: 'surface', elevation: 8, rounded: 'lg' },
        },
        VTextField: { variant: 'outlined', density: 'comfortable' },
        VSelect: { variant: 'outlined', density: 'comfortable' },
        VTextarea: { variant: 'outlined', density: 'comfortable' },
        VDataTable: { density: 'compact' },
      },
    },
  },
})
