import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import RedactarNotificacionModal from '../../../../app/components/notificaciones/modal/RedactarNotificacionModal.vue'
import { createTestVuetify } from '../../test-utils'
import type { PlantillaNotificacion } from '~/types/notificaciones'

const mockEnviar = vi.fn().mockResolvedValue({ ok: true, notificacion_id: 'n-new-123' })
const mockSubir = vi.fn().mockResolvedValue({
  nombre: 'adjunto.pdf',
  url: 'https://storage.local/adjunto.pdf',
  tamano_bytes: 5000,
  tipo_mime: 'application/pdf',
})

vi.mock('~/composables/useNotificaciones', () => ({
  useNotificaciones: () => ({
    enviarNotificacion: mockEnviar,
    subirArchivoAdjunto: mockSubir,
    enviando: ref(false),
    error: ref(null),
  }),
}))

describe('RedactarNotificacionModal', () => {
  const vuetify = createTestVuetify()

  const mockPlantillas: PlantillaNotificacion[] = [
    {
      id: 'p-1',
      codigo: 'CITA_FIRMA_WHATSAPP',
      nombre: 'Citatorio de Firma en Protocolo (WhatsApp)',
      canal: 'whatsapp',
      asunto: null,
      cuerpo: 'Estimado {{nombre_cliente}}, cita para instrumento {{numero_instrumento}} el {{fecha_cita}}.',
      variables_disponibles: ['nombre_cliente', 'numero_instrumento', 'fecha_cita'],
      requiere_confirmacion: true,
      activo: true,
    },
  ]

  it('interpola la plantilla seleccionada en los campos del formulario', async () => {
    const wrapper = mount(RedactarNotificacionModal, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: true,
        plantillas: mockPlantillas,
      },
      attachTo: document.body,
    })

    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('Redactar Notificación Notarial')
    expect(bodyText).toContain('Canal de Transmisión')
    expect(bodyText).toContain('Destinatario')

    wrapper.unmount()
  })

  it('despacha la notificación al pulsar el botón principal', async () => {
    const wrapper = mount(RedactarNotificacionModal, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: true,
        plantillas: mockPlantillas,
      },
      attachTo: document.body,
    })

    // Llenar campos requeridos
    wrapper.vm.form.destinatario_nombre = 'Lic. Roberto Gómez'
    wrapper.vm.form.destinatario_contacto = '5512345678'
    wrapper.vm.form.cuerpo = 'Mensaje para el cliente'
    wrapper.vm.form.canal = 'whatsapp'

    await wrapper.vm.enviar()

    expect(mockEnviar).toHaveBeenCalledWith(expect.objectContaining({
      destinatario_nombre: 'Lic. Roberto Gómez',
      destinatario_contacto: '5512345678',
      cuerpo: 'Mensaje para el cliente',
      canal: 'whatsapp',
    }))
    expect(wrapper.emitted('enviado')).toBeTruthy()

    wrapper.unmount()
  })

  it('autocompleta los datos del compareciente seleccionado', async () => {
    const wrapper = mount(RedactarNotificacionModal, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: true,
        plantillas: mockPlantillas,
      },
      attachTo: document.body,
    })

    const clienteMock = {
      id: 'comp-456',
      nombre: 'Sofía Valenzuela Mendoza',
      telefono: '5598765432',
      email: 'sofia@example.com',
      tipo_persona: 'fisica',
    }

    wrapper.vm.onSeleccionarCompareciente(clienteMock)

    expect(wrapper.vm.form.compareciente_id).toBe('comp-456')
    expect(wrapper.vm.form.destinatario_nombre).toBe('Sofía Valenzuela Mendoza')
    expect(wrapper.vm.form.destinatario_contacto).toBe('5598765432')

    // Si el canal cambia a correo, se actualiza a email
    wrapper.vm.form.canal = 'correo'
    wrapper.vm.onSeleccionarCompareciente(clienteMock)
    expect(wrapper.vm.form.destinatario_contacto).toBe('sofia@example.com')

    wrapper.unmount()
  })

  it('aplica plantilla preseleccionada por código y variables precalculadas', async () => {
    const wrapper = mount(RedactarNotificacionModal, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: true,
        plantillas: mockPlantillas,
        plantillaPreseleccionadaCodigo: 'CITA_FIRMA_WHATSAPP',
        variablesPrecalculadas: {
          nombre_cliente: 'Don Carlos Slim',
          numero_instrumento: 50123,
          fecha_cita: '28 de Septiembre a las 10:00 hrs',
        },
      },
      attachTo: document.body,
    })

    expect(wrapper.vm.form.plantilla_id).toBe('p-1')
    expect(wrapper.vm.form.canal).toBe('whatsapp')
    expect(wrapper.vm.form.cuerpo).toContain('Don Carlos Slim')
    expect(wrapper.vm.form.cuerpo).toContain('50123')
    expect(wrapper.vm.form.cuerpo).toContain('28 de Septiembre')

    wrapper.unmount()
  })
})

