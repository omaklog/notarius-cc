import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import ReporteIndiceVolumenImprimible from '@/components/reportes/indices/ReporteIndiceVolumenImprimible.vue'
import { createTestVuetify } from '../../../test-utils'
import type { EscrituraIndiceItem } from '~/types/reportes'

const mockConfig = ref<any>({
  id: '00000000-0000-0000-0000-000000000001',
  numero_notaria: 44,
  entidad_federativa: 'Estado de México',
  municipio: 'Toluca',
  notario_titular_nombre: 'Fernando Notario Titular',
  notario_titular_titulo: 'Lic.',
  logotipo_url: 'https://storage.supabase.co/notaria-identidad/logos/logo44.png',
  sello_notarial_url: 'https://storage.supabase.co/notaria-identidad/sellos/sello44.png',
  leyenda_encabezado: 'ESTADOS UNIDOS MEXICANOS — NOTARÍA 44 ESTADO DE MÉXICO',
  leyenda_lema: 'En testimonio de verdad y buena fe',
  leyenda_cierre_volumen: 'EN TOLUCA, SE CIERRA EL VOLUMEN {numero_volumen} CON {escrituras_validas} INSTRUMENTOS VÁLIDOS Y {escrituras_canceladas} CANCELADOS. TOTAL FOLIOS: {folios_totales}.',
})

const mockCargarConfiguracion = vi.fn().mockImplementation(async () => mockConfig.value)
const mockInterpoladorLeyenda = vi.fn().mockImplementation((plantilla: string, vars: any) => {
  return plantilla.replace(/{([a-zA-Z0-9_]+)}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''))
})

vi.mock('~/composables/useConfiguracionNotarial', () => ({
  useConfiguracionNotarial: () => ({
    configuracion: computed(() => mockConfig.value),
    nombreNotariaCompleto: computed(() => `Notaría Pública No. ${mockConfig.value?.numero_notaria} del ${mockConfig.value?.entidad_federativa}`),
    titularCompleto: computed(() => `${mockConfig.value?.notario_titular_titulo} ${mockConfig.value?.notario_titular_nombre}`),
    logotipoUrl: computed(() => mockConfig.value?.logotipo_url || null),
    selloNotarialUrl: computed(() => mockConfig.value?.sello_notarial_url || null),
    interpoladorLeyenda: mockInterpoladorLeyenda,
    cargarConfiguracion: mockCargarConfiguracion,
  }),
}))

describe('ReporteIndiceVolumenImprimible con Identidad Notarial Dinámica', () => {
  const vuetify = createTestVuetify()

  beforeEach(() => {
    vi.clearAllMocks()
    if (!window.print) {
      window.print = vi.fn()
    }
  })

  const mockEscrituras: EscrituraIndiceItem[] = [
    {
      id: 'esc-1',
      instrumento: 501,
      volumen: 12,
      fecha_celebracion: '2026-09-01',
      acto_nombre: 'Compraventa',
      comparecientes_resumen: [{ rol: 'Comprador', nombre: 'Juan' }],
      pagina_inicial: 1,
      pagina_final: 20,
      estatus: 'protocolizada',
    },
    {
      id: 'esc-2',
      instrumento: 502,
      volumen: 12,
      fecha_celebracion: '2026-09-02',
      acto_nombre: 'Donación',
      comparecientes_resumen: [{ rol: 'Donante', nombre: 'Pedro' }],
      pagina_inicial: 21,
      pagina_final: 30,
      estatus: 'anulada',
    },
  ]

  it('inyecta membrete dinámico, logotipo, lema y titular de la notaría configurada', async () => {
    const wrapper = mount(ReporteIndiceVolumenImprimible, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: true,
        volumen: 12,
        anio: 2026,
        escrituras: mockEscrituras,
      },
      attachTo: document.body,
    })

    const vm = wrapper.vm as any
    expect(vm.nombreNotariaOficial).toBe('Notaría Pública No. 44 del Estado de México')
    expect(vm.titularOficial).toBe('Lic. Fernando Notario Titular')
    expect(vm.logotipoUrl).toBe('https://storage.supabase.co/notaria-identidad/logos/logo44.png')
    expect(vm.selloNotarialUrl).toBe('https://storage.supabase.co/notaria-identidad/sellos/sello44.png')

    expect(document.body.textContent).toContain('ESTADOS UNIDOS MEXICANOS — NOTARÍA 44 ESTADO DE MÉXICO')
    expect(document.body.textContent).toContain('NOTARÍA PÚBLICA NO. 44 DEL ESTADO DE MÉXICO')
    expect(document.body.textContent).toContain('LIC. FERNANDO NOTARIO TITULAR')
    expect(document.body.textContent).toContain('«En testimonio de verdad y buena fe»')

    const logoImg = document.body.querySelector('img[alt="Logotipo Notaría"]')
    expect(logoImg).not.toBeNull()
    expect(logoImg?.getAttribute('src')).toBe('https://storage.supabase.co/notaria-identidad/logos/logo44.png')
  })

  it('inyecta facsímil del sello notarial y fórmula de certificación interpolada', async () => {
    const wrapper = mount(ReporteIndiceVolumenImprimible, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: true,
        volumen: 12,
        anio: 2026,
        escrituras: mockEscrituras,
      },
      attachTo: document.body,
    })

    const vm = wrapper.vm as any
    // Verificamos el texto interpolado con los datos calculados (volumen 12, 1 válida, 1 cancelada, 30 folios)
    expect(vm.textoCertificacion).toBe('EN TOLUCA, SE CIERRA EL VOLUMEN 12 CON 1 INSTRUMENTOS VÁLIDOS Y 1 CANCELADOS. TOTAL FOLIOS: 30.')

    const selloImg = document.body.querySelector('img[alt="Sello Notarial"]')
    expect(selloImg).not.toBeNull()
    expect(selloImg?.getAttribute('src')).toBe('https://storage.supabase.co/notaria-identidad/sellos/sello44.png')

    expect(document.body.textContent).toContain('EN TOLUCA, SE CIERRA EL VOLUMEN 12 CON 1 INSTRUMENTOS VÁLIDOS Y 1 CANCELADOS. TOTAL FOLIOS: 30.')
  })
})
