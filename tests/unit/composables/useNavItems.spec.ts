import { describe, expect, it } from 'vitest'
import { findActiveGroupLabel, useNavItems } from '@/composables/useNavItems'

describe('useNavItems', () => {
  it('exposes the 5 fixed groups from constitution.md §4', () => {
    const { groups } = useNavItems()

    expect(groups.map((g) => g.label)).toEqual([
      'Operación',
      'Cumplimiento',
      'Finanzas',
      'Ubicación',
      'Sistema',
    ])
  })

  it('covers the 12 business modules across all groups', () => {
    const { groups } = useNavItems()
    const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0)

    expect(totalItems).toBe(12)
  })

  it('gives every group and item an icon and a route', () => {
    const { groups } = useNavItems()

    for (const group of groups) {
      expect(group.icon).toBeTruthy()
      for (const item of group.items) {
        expect(item.icon).toBeTruthy()
        expect(item.to.startsWith('/')).toBe(true)
      }
    }
  })

  it('groups Operación with Escrituras, Comparecientes, Expedientes and Trámites', () => {
    const { groups } = useNavItems()
    const operacion = groups.find((g) => g.label === 'Operación')

    expect(operacion?.items.map((i) => i.label)).toEqual([
      'Escrituras',
      'Comparecientes',
      'Expedientes',
      'Trámites',
    ])
  })

  it('gives every item a permiso with modulo and accion', () => {
    const { groups } = useNavItems()

    for (const group of groups) {
      for (const item of group.items) {
        expect(item.permiso.modulo).toBeTruthy()
        expect(item.permiso.accion).toBeTruthy()
      }
    }
  })

  it('finds the active group label for a given route path', () => {
    const { groups } = useNavItems()

    expect(findActiveGroupLabel(groups, '/escrituras')).toBe('Operación')
    expect(findActiveGroupLabel(groups, '/honorarios')).toBe('Finanzas')
    expect(findActiveGroupLabel(groups, '/no-existe')).toBeNull()
  })
})
