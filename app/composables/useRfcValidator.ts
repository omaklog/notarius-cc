/**
 * Validador algorítmico de RFC (Registro Federal de Contribuyentes) para México.
 * Soporta Personas Físicas (13 caracteres), Personas Morales (12 caracteres)
 * y RFCs genéricos oficiales del SAT (XAXX010101000, XEXX010101000).
 */

export interface RfcValidationResult {
  isValid: boolean
  tipoPersona: 'fisica' | 'moral' | null
  isGenerico: boolean
  error?: string
}

const RFC_FISICA_REGEX = /^[A-ZÑ&]{4}(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/i
const RFC_MORAL_REGEX = /^[A-ZÑ&]{3}(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/i

export function validarRfc(rfcRaw: string): RfcValidationResult {
  if (!rfcRaw) {
    return { isValid: false, tipoPersona: null, isGenerico: false, error: 'El RFC es obligatorio' }
  }

  const rfc = rfcRaw.trim().toUpperCase()

  // RFCs genéricos del SAT
  if (rfc === 'XAXX010101000' || rfc === 'XEXX010101000') {
    return { isValid: true, tipoPersona: 'fisica', isGenerico: true }
  }

  if (rfc.length === 13) {
    if (!RFC_FISICA_REGEX.test(rfc)) {
      return { isValid: false, tipoPersona: 'fisica', isGenerico: false, error: 'Formato de RFC de Persona Física no válido' }
    }
    return { isValid: true, tipoPersona: 'fisica', isGenerico: false }
  }

  if (rfc.length === 12) {
    if (!RFC_MORAL_REGEX.test(rfc)) {
      return { isValid: false, tipoPersona: 'moral', isGenerico: false, error: 'Formato de RFC de Persona Moral no válido' }
    }
    return { isValid: true, tipoPersona: 'moral', isGenerico: false }
  }

  return {
    isValid: false,
    tipoPersona: null,
    isGenerico: false,
    error: 'El RFC debe tener 12 (moral) o 13 (física) caracteres',
  }
}

export function useRfcValidator() {
  return {
    validarRfc,
  }
}
