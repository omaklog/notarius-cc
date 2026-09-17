import { createPinia } from 'pinia'
import * as directives from 'vuetify/directives'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import { createMemoryHistory, createRouter } from 'vue-router'

export function setViewportWidth(width: number) {
  window.innerWidth = width
  window.dispatchEvent(new Event('resize'))
}

export function createTestVuetify() {
  if (typeof window !== 'undefined' && !window.visualViewport) {
    window.visualViewport = {
      width: 1024,
      height: 768,
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      scale: 1,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as unknown as VisualViewport
  }
  return createVuetify({ components, directives })
}

export function createTestPinia() {
  return createPinia()
}

export async function createTestRouter(initialPath = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', name: 'catch-all', component: { template: '<div />' } }],
  })
  await router.push(initialPath)
  await router.isReady()
  return router
}
