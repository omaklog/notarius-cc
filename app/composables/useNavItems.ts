export interface NavPermiso {
  modulo: string
  accion: string
}

export interface NavItem {
  label: string
  to: string
  icon: string
  permiso: NavPermiso
}

export interface NavGroup {
  label: string
  icon: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Operación',
    icon: 'mdi-briefcase-outline',
    items: [
      { label: 'Escrituras', to: '/escrituras', icon: 'mdi-file-certificate-outline', permiso: { modulo: 'escrituras', accion: 'ver' } },
      { label: 'Comparecientes', to: '/comparecientes', icon: 'mdi-account-group-outline', permiso: { modulo: 'comparecientes', accion: 'ver' } },
      { label: 'Expedientes', to: '/expedientes', icon: 'mdi-folder-outline', permiso: { modulo: 'expedientes', accion: 'ver' } },
      { label: 'Trámites', to: '/tramites', icon: 'mdi-clipboard-list-outline', permiso: { modulo: 'tramites', accion: 'ver' } },
    ],
  },
  {
    label: 'Cumplimiento',
    icon: 'mdi-shield-check-outline',
    items: [
      { label: 'Cumplimiento PLD/UIF', to: '/cumplimiento-pld', icon: 'mdi-shield-search', permiso: { modulo: 'pld', accion: 'ver' } },
      { label: 'Avisos SAT/UIF', to: '/avisos-sat', icon: 'mdi-file-alert-outline', permiso: { modulo: 'avisos_sat', accion: 'ver' } },
    ],
  },
  {
    label: 'Finanzas',
    icon: 'mdi-cash-multiple',
    items: [
      { label: 'Órdenes de pago', to: '/ordenes-pago', icon: 'mdi-bank-transfer', permiso: { modulo: 'ordenes_pago', accion: 'ver' } },
      { label: 'Honorarios', to: '/honorarios', icon: 'mdi-cash', permiso: { modulo: 'honorarios', accion: 'ver' } },
    ],
  },
  {
    label: 'Ubicación',
    icon: 'mdi-map-outline',
    items: [
      { label: 'Georreferenciación', to: '/georreferenciacion', icon: 'mdi-map-marker-outline', permiso: { modulo: 'georreferenciacion', accion: 'ver' } },
    ],
  },
  {
    label: 'Sistema',
    icon: 'mdi-cog-outline',
    items: [
      { label: 'Notificaciones', to: '/notificaciones', icon: 'mdi-bell-outline', permiso: { modulo: 'notificaciones', accion: 'ver' } },
      { label: 'Reportes', to: '/reportes', icon: 'mdi-chart-box-outline', permiso: { modulo: 'reportes', accion: 'ver_operativos' } },
      { label: 'Administración general', to: '/administracion-general', icon: 'mdi-tune-variant', permiso: { modulo: 'administracion', accion: 'acceso' } },
    ],
  },
]

export function useNavItems(): { groups: NavGroup[] } {
  return { groups: navGroups }
}

export function findActiveGroupLabel(groups: NavGroup[], path: string): string | null {
  const group = groups.find((g) => g.items.some((item) => item.to === path))
  return group?.label ?? null
}
