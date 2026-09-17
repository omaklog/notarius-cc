import { createError, defineEventHandler, readBody } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import { useRuntimeConfig } from '#imports'

export interface OcrIdentificacionRequest {
  tipo_identificacion?: string
  anverso_base64: string
  reverso_base64?: string
}

export interface OcrDomicilioData {
  calle: string | null
  numero_exterior: string | null
  numero_interior: string | null
  colonia: string | null
  codigo_postal: string | null
  municipio: string | null
  entidad_federativa: string | null
}

export interface OcrComparecienteData {
  nombres: string | null
  primer_apellido: string | null
  segundo_apellido: string | null
  curp: string | null
  rfc: string | null
  clave_elector: string | null
  vigencia: string | null
  fecha_nacimiento: string | null
  genero: 'M' | 'F' | 'X' | null
  domicilio: OcrDomicilioData
}

export interface OcrIdentificacionResponse {
  exito: boolean
  tipo_identificacion: string
  datos: OcrComparecienteData
  error?: string
}

function parseBase64Part(dataUrlOrBase64: string): { mimeType: string; data: string } {
  const match = dataUrlOrBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
  if (match && match[1] && match[2]) {
    return { mimeType: match[1], data: match[2] }
  }
  return { mimeType: 'image/jpeg', data: dataUrlOrBase64 }
}

export default defineEventHandler(async (event): Promise<OcrIdentificacionResponse> => {
  const body = await readBody<OcrIdentificacionRequest>(event)

  if (!body?.anverso_base64) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La imagen frontal o anverso de la identificación es obligatoria.',
    })
  }

  // 1. Verificar sesión autenticada en Supabase
  const client = await serverSupabaseClient(event)
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()

  if (userError || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesión no autorizada para escaneo OCR.',
    })
  }

  const config = useRuntimeConfig()
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY

  const tipoIdentificacion = body.tipo_identificacion || 'ine'

  // Si no hay API key configurada o estamos en entorno de prueba / dev sin token,
  // permitimos devolver un mock controlado si la imagen contiene el indicador de test
  if (!apiKey) {
    if (process.env.NODE_ENV === 'test' || body.anverso_base64.includes('mock_test')) {
      return {
        exito: true,
        tipo_identificacion: tipoIdentificacion,
        datos: {
          nombres: 'JUAN CARLOS',
          primer_apellido: 'RODRIGUEZ',
          segundo_apellido: 'PEREZ',
          curp: 'ROPJ850101HDFRRN09',
          rfc: 'ROPJ850101XXX',
          clave_elector: 'ROPJ85010109H100',
          vigencia: '2030',
          fecha_nacimiento: '1985-01-01',
          genero: 'M',
          domicilio: {
            calle: 'AVENIDA REFORMA',
            numero_exterior: '123',
            numero_interior: '4B',
            colonia: 'JUAREZ',
            codigo_postal: '06600',
            municipio: 'CUAUHTEMOC',
            entidad_federativa: 'CIUDAD DE MEXICO',
          },
        },
      }
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'El servicio de OCR (Gemini Vision API) no está configurado (GEMINI_API_KEY ausente).',
    })
  }

  // 2. Preparar el prompt y las imágenes para Gemini Multimodal
  const promptSistema = `
Eres un asistente de digitalización y cotejo notarial en México de máxima precisión.
Analiza la imagen o imágenes de la identificación oficial (tipo: ${tipoIdentificacion}).
Extrae con estricta fidelidad todos los datos visibles del titular en un objeto JSON con esta estructura exacta:
{
  "nombres": "cadena o null",
  "primer_apellido": "cadena o null",
  "segundo_apellido": "cadena o null",
  "curp": "cadena de 18 caracteres o null",
  "rfc": "cadena de 13 o 12 caracteres o null (si no viene explícito, calcúlalo del CURP si es persona física)",
  "clave_elector": "cadena de 18 caracteres (solo si es INE/IFE) o null",
  "vigencia": "año de 4 dígitos o fecha YYYY-MM-DD o null",
  "fecha_nacimiento": "fecha en formato YYYY-MM-DD o null",
  "genero": "M, F, o X según corresponda o null",
  "domicilio": {
    "calle": "nombre de la calle o null",
    "numero_exterior": "número exterior o null",
    "numero_interior": "número interior o null",
    "colonia": "colonia o fraccionamiento o null",
    "codigo_postal": "código postal de 5 dígitos o null",
    "municipio": "municipio o alcaldía o null",
    "entidad_federativa": "estado o CDMX o null"
  }
}
IMPORTANTE:
- Para el INE/IFE: si se envía el reverso, usa el reverso para verificar el código CIC y código OCR lateral si ayuda a corroborar la clave de elector.
- Normaliza los nombres y apellidos en MAYÚSCULAS sin títulos profesionales.
- No agregues texto explicativo, solo el JSON puro.
`

  const contentsParts: any[] = [{ text: promptSistema }]

  // Agregar imagen frontal / anverso
  const anversoParsed = parseBase64Part(body.anverso_base64)
  contentsParts.push({
    inlineData: {
      mimeType: anversoParsed.mimeType,
      data: anversoParsed.data,
    },
  })

  // Agregar imagen reverso si viene presente
  if (body.reverso_base64) {
    const reversoParsed = parseBase64Part(body.reverso_base64)
    contentsParts.push({
      inlineData: {
        mimeType: reversoParsed.mimeType,
        data: reversoParsed.data,
      },
    })
  }

  try {
    const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

    const geminiResponse: any = await $fetch(endpointUrl, {
      method: 'POST',
      body: {
        contents: [{ parts: contentsParts }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      },
    })

    const rawText = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) {
      throw new Error('La respuesta del motor OCR no contiene texto interpretable.')
    }

    const datosParseados = JSON.parse(rawText) as OcrComparecienteData

    return {
      exito: true,
      tipo_identificacion: tipoIdentificacion,
      datos: {
        nombres: datosParseados.nombres ?? null,
        primer_apellido: datosParseados.primer_apellido ?? null,
        segundo_apellido: datosParseados.segundo_apellido ?? null,
        curp: datosParseados.curp ?? null,
        rfc: datosParseados.rfc ?? null,
        clave_elector: datosParseados.clave_elector ?? null,
        vigencia: datosParseados.vigencia ?? null,
        fecha_nacimiento: datosParseados.fecha_nacimiento ?? null,
        genero: datosParseados.genero ?? null,
        domicilio: {
          calle: datosParseados.domicilio?.calle ?? null,
          numero_exterior: datosParseados.domicilio?.numero_exterior ?? null,
          numero_interior: datosParseados.domicilio?.numero_interior ?? null,
          colonia: datosParseados.domicilio?.colonia ?? null,
          codigo_postal: datosParseados.domicilio?.codigo_postal ?? null,
          municipio: datosParseados.domicilio?.municipio ?? null,
          entidad_federativa: datosParseados.domicilio?.entidad_federativa ?? null,
        },
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: 502,
      statusMessage: `Error al procesar reconocimiento OCR con Gemini Vision: ${error.message || 'Error desconocido'}`,
    })
  }
})
