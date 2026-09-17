import { describe, expect, it } from 'vitest'
import { validarRfc } from '@/composables/useRfcValidator'
import { validarCurp } from '@/composables/useCurpValidator'

describe('Validador de RFC (useRfcValidator)', () => {
  it('valida un RFC de Persona Física correcto (13 caracteres)', () => {
    const res = validarRfc('MESR800101AB1')
    expect(res.isValid).toBe(true)
    expect(res.tipoPersona).toBe('fisica')
    expect(res.isGenerico).toBe(false)
  })

  it('valida un RFC de Persona Moral correcto (12 caracteres)', () => {
    const res = validarRfc('DUB150320AB2')
    expect(res.isValid).toBe(true)
    expect(res.tipoPersona).toBe('moral')
    expect(res.isGenerico).toBe(false)
  })

  it('reconoce RFC genéricos del SAT', () => {
    const resNacional = validarRfc('XAXX010101000')
    expect(resNacional.isValid).toBe(true)
    expect(resNacional.isGenerico).toBe(true)

    const resExtranjero = validarRfc('XEXX010101000')
    expect(resExtranjero.isValid).toBe(true)
    expect(resExtranjero.isGenerico).toBe(true)
  })

  it('rechaza RFC con formato o longitud incorrecta', () => {
    expect(validarRfc('INVALIDO').isValid).toBe(false)
    expect(validarRfc('MESR800101').isValid).toBe(false)
    expect(validarRfc('MESR801332AB1').isValid).toBe(false) // Mes 13
  })
})

describe('Validador de CURP (useCurpValidator)', () => {
  it('rechaza CURP con longitud incorrecta', () => {
    const res = validarCurp('CURP_CORTA')
    expect(res.isValid).toBe(false)
    expect(res.error).toContain('18 caracteres')
  })

  it('rechaza CURP con entidad federativa inválida', () => {
    // XX no es una entidad federativa mexicana
    const res = validarCurp('MESR800101HXXNRB02')
    expect(res.isValid).toBe(false)
  })

  it('rechaza CURP con dígito verificador erróneo', () => {
    // Si cambiamos el último dígito de una CURP válida
    const res = validarCurp('MESR800101HDFNRB99')
    expect(res.isValid).toBe(false)
    expect(res.error).toContain('verificador')
  })
})
