/**
 * Validador algorítmico de CURP (Clave Única de Registro de Población) para México.
 * Aplica validación estructural oficial de RENAPO y verificación de dígito módulo 10.
 */

export interface CurpValidationResult {
  isValid: boolean
  error?: string
  fechaNacimiento?: string // YYYY-MM-DD
  genero?: 'M' | 'F'
  entidad?: string
}

const CURP_REGEX = /^[A-Z]{4}(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([HM])(AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/i

const DICCIONARIO = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'

export function validarCurp(curpRaw: string): CurpValidationResult {
  if (!curpRaw) {
    return { isValid: false, error: 'La CURP es obligatoria' }
  }

  const curp = curpRaw.trim().toUpperCase()

  if (curp.length !== 18) {
    return { isValid: false, error: 'La CURP debe tener exactamente 18 caracteres' }
  }

  const match = curp.match(CURP_REGEX)
  if (!match) {
    return { isValid: false, error: 'Formato estructural de CURP inválido' }
  }

  // Validación de dígito verificador RENAPO
  let suma = 0
  for (let i = 0; i < 17; i++) {
    const char = curp[i]
    const valor = DICCIONARIO.indexOf(char)
    if (valor === -1) {
      return { isValid: false, error: `Carácter no permitido en posición ${i + 1}` }
    }
    suma += valor * (18 - i)
  }

  const digitoEsperado = (10 - (suma % 10)) % 10
  const digitoReal = parseInt(curp[17], 10)

  if (digitoEsperado !== digitoReal) {
    return { isValid: false, error: 'Dígito verificador de CURP inválido' }
  }

  const [, anio, mes, dia, genero, entidad] = match
  const siglo = parseInt(curp[16], 10) >= 0 && parseInt(curp[16], 10) <= 9 ? '19' : '20'
  const fechaNacimiento = `${siglo}${anio}-${mes}-${dia}`

  return {
    isValid: true,
    fechaNacimiento,
    genero: genero as 'M' | 'F',
    entidad,
  }
}

export function useCurpValidator() {
  return {
    validarCurp,
  }
}
