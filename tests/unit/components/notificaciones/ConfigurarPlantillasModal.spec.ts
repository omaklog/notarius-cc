import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import ConfigurarPlantillasModal from '../../../../app/components/notificaciones/modal/ConfigurarPlantillasModal.vue'
import { createTestVuetify } from '../../test-utils'
import type { PlantillaNotificacion } from '~/types/notificaciones'

const mockGuardar = vi.fn().mockResolvedValue({ ok: true })

vi.mock('~/composables/useNotificaciones', () => ({
  useNotificaciones: () => ({
    guardarPlantilla: mockGuardar,
    cargando: ref(false),
    error: ref(null),
  }),
}))

describe('ConfigurarPlantillasModal', () => {
  const vuetify = createTestVuetify()

  const mockPlantillas: PlantillaNotificacion[] = [
    {
      id: 'p-1',
      codigo: 'CITA_FIRMA_WHATSAPP',
      nombre: 'Citatorio de Firma en Protocolo (WhatsApp)',
      canal: 'whatsapp',
      asunto: null,
      cuerpo: 'Estimado(a) {{nombre_cliente}}, confirmamos su cita para el {{fecha_cita}}.',
      variables_disponibles: ['nombre_cliente', 'fecha_cita'],
      requiere_confirmacion: true,
      activo: true,
    },
    {
      id: 'p-2',
      codigo: 'TRAMITE_RPP_INGRESADO_CORREO',
      nombre: 'Aviso de Ingreso a RPP (Correo)',
      canal: 'correo',
      asunto: 'Actualización RPP',
      cuerpo: 'Su trámite {{folio_tramite}} ha ingresado.',
      variables_disponibles: ['folio_tramite'],
      requiere_confirmacion: false,
      activo: true,
    },
  ]

  it('permite seleccionar una plantilla y edita su contenido', async () => {
    const wrapper = mount(ConfigurarPlantillasModal, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: true,
        plantillas: mockPlantillas,
      },
      attachTo: document.body,
    })

    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('Administración de Plantillas Notariales')
    expect(bodyText).toContain('Citatorio de Firma en Protocolo (WhatsApp)')

    wrapper.unmount()
  })

  it('guarda los cambios de la plantilla seleccionada', async () => {
    const wrapper = mount(ConfigurarPlantillasModal, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: true,
        plantillas: mockPlantillas,
      },
      attachTo: document.body,
    })

    await wrapper.vm.seleccionarPlantilla(mockPlantillas[0])
    wrapper.vm.formEdicion.cuerpo = 'Texto modificado con {{nombre_cliente}}'

    await wrapper.vm.guardar()

    expect(mockGuardar).toHaveBeenCalledWith(expect.objectContaining({
      id: 'p-1',
      cuerpo: 'Texto modificado con {{nombre_cliente}}',
    }))
    expect(wrapper.emitted('actualizado')).toBeTruthy()

    wrapper.unmount()
  })
})
