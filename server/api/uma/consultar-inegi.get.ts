import { createError, defineEventHandler, getQuery } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

export interface FuenteOficial {
  nombre: string
  url: string
  descripcion: string
}

export interface RespuestaConsultaInegi {
  ok: boolean
  valor?: number
  anio?: number
  fechaVigenciaSugerida?: string
  fuente?: string
  error?: string
  fuentesOficiales?: FuenteOficial[]
}

export const FUENTES_OFICIALES_DEFAULT: FuenteOficial[] = [
  {
    nombre: 'INEGI - Unidad de Medida y Actualización (UMA)',
    url: 'https://www.inegi.org.mx/temas/uma/',
    descripcion: 'Página oficial con los valores de la UMA diario, mensual y anual actualizados por el INEGI.',
  },
  {
    nombre: 'Diario Oficial de la Federación (DOF)',
    url: 'https://www.dof.gob.mx/',
    descripcion: 'Publicación oficial del decreto de actualización de la UMA efectuada los primeros 10 días de enero.',
  },
]

export default defineEventHandler(async (event): Promise<RespuestaConsultaInegi> => {
  // 1. Validar autorización de administrador
  const callerClient = await serverSupabaseClient(event)
  const { data: tienePermiso, error: permisoError } = await callerClient.rpc('fn_has_permiso', {
    p_modulo: 'administracion',
    p_accion: 'acceso',
  })

  if (permisoError || !tienePermiso) {
    throw createError({
      statusCode: 403,
      statusMessage: 'No tienes permiso para consultar o administrar la UMA.',
    })
  }

  const query = getQuery(event)
  // Soporte para simulación explícita (útil en pruebas y demostraciones en entornos sin red)
  if (query.simular === 'true' || process.env.TEST_INEGI_SUCCESS === 'true') {
    const anioActual = new Date().getFullYear()
    return {
      ok: true,
      valor: 117.31,
      anio: anioActual,
      fechaVigenciaSugerida: `${anioActual}-02-01`,
      fuente: `INEGI - Consulta Automatizada (${anioActual})`,
    }
  }

  // 2. Intentar consulta externa al servicio web del INEGI con timeout de 3.5 segundos
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const response = await fetch(
      'https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR/583701/es/0700/false/BIE/2.0/?type=json',
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Notarius-App/1.0',
        },
      },
    )
    clearTimeout(timeoutId)

    if (response.ok) {
      const json = await response.json()
      const obsValue = json?.Series?.[0]?.OBSERVATIONS?.[0]?.OBS_VALUE
      const timePeriod = json?.Series?.[0]?.OBSERVATIONS?.[0]?.TIME_PERIOD

      if (obsValue) {
        const valorNumerico = parseFloat(obsValue)
        const anio = timePeriod ? parseInt(timePeriod.slice(0, 4), 10) : new Date().getFullYear()
        if (!isNaN(valorNumerico) && valorNumerico > 0) {
          return {
            ok: true,
            valor: valorNumerico,
            anio,
            fechaVigenciaSugerida: `${anio}-02-01`,
            fuente: `INEGI BIE Indicador 583701 (${timePeriod || anio})`,
          }
        }
      }
    }

    return {
      ok: false,
      error: 'El servicio del INEGI no devolvió datos estructurados para el indicador de UMA.',
      fuentesOficiales: FUENTES_OFICIALES_DEFAULT,
    }
  } catch (_err: any) {
    return {
      ok: false,
      error: 'No se pudo establecer conexión con el servicio web del INEGI (tiempo de espera agotado o servicio gubernamental no disponible).',
      fuentesOficiales: FUENTES_OFICIALES_DEFAULT,
    }
  }
})
