import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, computed } from 'vue'
import { createTestVuetify } from '../../test-utils'

;(globalThis as any).definePageMeta = vi.fn()

const mockConfiguracion = ref<any>({
  id: '00000000-0000-0000-0000-000000000001',
  numero_notaria: 44,
  entidad_federativa: 'Estado de México',
  municipio: 'Toluca',
  distrito_judicial: 'Distrito de Toluca',
  notario_titular_nombre: 'Fernando Notario Titular',
  notario_titular_titulo: 'Lic.',
  patente_fiat_numero: 'PAT-44-2020',
  patente_fiat_fecha: '2020-01-15',
  notario_suplente_nombre: 'Lic. Suplente Asociado',
  regimen_asociacion: 'Titular Único',
  domicilio_calle: 'Av. Hidalgo',
  domicilio_num_ext: '102',
  domicilio_num_int: 'Piso 3',
  domicilio_colonia: 'Centro',
  domicilio_codigo_postal: '50000',
  telefono_principal: '7221234567',
  telefono_secundario: '7227654321',
  correo_contacto: 'notaria44@edomex.gob.mx',
  sitio_web: 'https://notaria44.mx',
  logotipo_url: 'https://storage.supabase.co/notaria-identidad/logos/logo.png',
  sello_notarial_url: 'https://storage.supabase.co/notaria-identidad/sellos/sello.png',
  leyenda_encabezado: 'ESTADOS UNIDOS MEXICANOS - NOTARÍA PÚBLICA 44',
  leyenda_lema: 'En testimonio de verdad',
  leyenda_cierre_volumen: 'En la ciudad de Toluca, se cierra el volumen {numero_volumen} con {escrituras_validas} escrituras.',
})

const mockCargarConfiguracion = vi.fn().mockImplementation(async () => mockConfiguracion.value)
const mockGuardarConfiguracion = vi.fn().mockResolvedValue(true)
const mockSubirActivoGrafico = vi.fn().mockResolvedValue('https://storage.supabase.co/notaria-identidad/logos/nuevo.png')
const mockEliminarActivoGrafico = vi.fn().mockResolvedValue(true)
const mockInterpoladorLeyenda = vi.fn().mockImplementation((plantilla: string, vars: any) => {
  return plantilla.replace(/{([a-zA-Z0-9_]+)}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''))
})

vi.mock('~/composables/useConfiguracionNotarial', () => ({
  useConfiguracionNotarial: () => ({
    configuracion: computed(() => mockConfiguracion.value),
    cargando: ref(false),
    guardando: ref(false),
    subiendoActivo: ref(false),
    error: ref(null),
    nombreNotariaCompleto: computed(() => `Notaría Pública No. ${mockConfiguracion.value.numero_notaria} del ${mockConfiguracion.value.entidad_federativa}`),
    titularCompleto: computed(() => `${mockConfiguracion.value.notario_titular_titulo} ${mockConfiguracion.value.notario_titular_nombre}`),
    domicilioCompleto: computed(() => `${mockConfiguracion.value.domicilio_calle} No. ${mockConfiguracion.value.domicilio_num_ext}, Col. ${mockConfiguracion.value.domicilio_colonia}`),
    logotipoUrl: computed(() => mockConfiguracion.value.logotipo_url),
    selloNotarialUrl: computed(() => mockConfiguracion.value.sello_notarial_url),
    cargarConfiguracion: mockCargarConfiguracion,
    guardarConfiguracion: mockGuardarConfiguracion,
    subirActivoGrafico: mockSubirActivoGrafico,
    eliminarActivoGrafico: mockEliminarActivoGrafico,
    interpoladorLeyenda: mockInterpoladorLeyenda,
  }),
}))

const IdentidadPageModule = await import('@/pages/administracion-general/identidad-notarial.vue')
const IdentidadPage = IdentidadPageModule.default

describe('pages/administracion-general/identidad-notarial.vue', () => {
  const vuetify = createTestVuetify()

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url')
  })

  function mountPage() {
    return mount(IdentidadPage, {
      global: {
        plugins: [vuetify],
      },
      attachTo: document.body,
    })
  }

  it('renderiza encabezado institucional, banner y pestañas', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Identidad Notarial y Fe Pública')
    expect(wrapper.text()).toContain('Notaría Pública No. 44 del Estado de México')
    expect(wrapper.text()).toContain('Lic. Fernando Notario Titular')
    expect(wrapper.text()).toContain('Ficha Notarial y Fe Pública')
    expect(wrapper.text()).toContain('Domicilio y Contacto')
    expect(wrapper.text()).toContain('Identidad Visual y Sellos')
    expect(wrapper.text()).toContain('Leyendas y Fórmulas')
  })

  it('inicializa y sincroniza los campos del formulario desde la configuración', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.form.numero_notaria).toBe(44)
    expect(vm.form.entidad_federativa).toBe('Estado de México')
    expect(vm.form.municipio).toBe('Toluca')
    expect(vm.form.notario_titular_nombre).toBe('Fernando Notario Titular')
    expect(vm.form.domicilio_calle).toBe('Av. Hidalgo')
  })

  it('valida que el número de notaría sea mayor a cero antes de guardar', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.form.numero_notaria = 0
    await vm.handleGuardar()

    expect(vm.formError).toContain('El número de notaría debe ser un entero positivo mayor a cero.')
    expect(mockGuardarConfiguracion).not.toHaveBeenCalled()
  })

  it('valida campos obligatorios (entidad, municipio, titular)', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.form.entidad_federativa = ''
    await vm.handleGuardar()
    expect(vm.formError).toContain('La entidad federativa es obligatoria.')

    vm.form.entidad_federativa = 'Jalisco'
    vm.form.municipio = '  '
    await vm.handleGuardar()
    expect(vm.formError).toContain('El municipio es obligatorio.')

    vm.form.municipio = 'Guadalajara'
    vm.form.notario_titular_nombre = ''
    await vm.handleGuardar()
    expect(vm.formError).toContain('El nombre del notario titular es obligatorio.')
  })

  it('guarda exitosamente los datos de la notaría cuando el formulario es válido', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.form.municipio = 'Metepec'
    vm.form.numero_notaria = 128
    await vm.handleGuardar()
    await flushPromises()

    expect(mockGuardarConfiguracion).toHaveBeenCalledWith(
      expect.objectContaining({
        numero_notaria: 128,
        municipio: 'Metepec',
      })
    )
    expect(vm.snackbar).toBe(true)
    expect(vm.snackbarText).toContain('actualizada exitosamente')
  })

  it('permite seleccionar y subir un logotipo institucional', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    const file = new File(['mock content'], 'logo.png', { type: 'image/png' })
    const event = { target: { files: [file] } } as unknown as Event

    vm.onLogoSelected(event)
    expect(vm.selectedLogoFile).toEqual(file)
    expect(vm.logoPreviewUrl).toBe('blob:mock-preview-url')

    await vm.handleSubirLogo()
    await flushPromises()

    expect(mockSubirActivoGrafico).toHaveBeenCalledWith(file, 'logotipo')
    expect(vm.selectedLogoFile).toBeNull()
    expect(vm.snackbarText).toContain('Logotipo institucional cargado correctamente')
  })

  it('permite seleccionar y subir el facsímil del sello notarial', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    const file = new File(['sello content'], 'sello.svg', { type: 'image/svg+xml' })
    const event = { target: { files: [file] } } as unknown as Event

    vm.onSelloSelected(event)
    expect(vm.selectedSelloFile).toEqual(file)
    expect(vm.selloPreviewUrl).toBe('blob:mock-preview-url')

    await vm.handleSubirSello()
    await flushPromises()

    expect(mockSubirActivoGrafico).toHaveBeenCalledWith(file, 'sello')
    expect(vm.selectedSelloFile).toBeNull()
    expect(vm.snackbarText).toContain('Facsímil del sello notarial cargado correctamente')
  })

  it('ejecuta la eliminación de logotipo y sello tras confirmación', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.confirmarEliminarActivo('logotipo')
    expect(vm.confirmDeleteDialog).toBe(true)
    expect(vm.deleteTipo).toBe('logotipo')

    await vm.ejecutarEliminarActivo()
    await flushPromises()

    expect(mockEliminarActivoGrafico).toHaveBeenCalledWith('logotipo')
    expect(vm.confirmDeleteDialog).toBe(false)
  })

  it('inserta tags interactivos en la plantilla de cierre de volumen', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.form.leyenda_cierre_volumen = 'Cierre de volumen'
    vm.insertarTag('{numero_volumen}')

    expect(vm.form.leyenda_cierre_volumen).toBe('Cierre de volumen {numero_volumen}')
  })

  it('computa la previsualización interpolada de la leyenda', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.form.leyenda_cierre_volumen = 'Volumen {numero_volumen} con {escrituras_validas} escrituras.'
    expect(vm.vistaPreviaInterpolada).toBe('Volumen 42 con 15 escrituras.')
  })
})
