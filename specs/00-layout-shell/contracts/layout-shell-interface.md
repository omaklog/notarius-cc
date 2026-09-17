# Contract: Interfaz del shell hacia otros módulos

Este módulo es infraestructura transversal (constitution.md, todos los demás
módulos "viven dentro" de él). El contrato aquí no es una API HTTP — es la
**interfaz de composables** que cualquier módulo de negocio (Escrituras,
Comparecientes, etc.) puede usar para integrarse con el shell sin conocer su
implementación interna. Cambios incompatibles a esta interfaz requieren
avisar a todos los módulos consumidores.

## `useAppShell()`

Composable expuesto por este feature. Es el único punto de contacto que
otros módulos deben usar para tocar el shell — **no deben** importar
`layoutPreferences.store` directamente ni manipular el DOM del layout.

```ts
interface AppShellApi {
  // Breadcrumb (spec FR-014): un módulo declara su propia jerarquía de ruta.
  // Se limpia automáticamente al desmontar el componente que lo llamó.
  setBreadcrumb(items: { label: string; to?: string }[]): void

  // Branding de solo lectura (ver data-model.md → NotariaBranding).
  // Reactivo: cuando Administración General exista, actualizar el valor
  // subyacente refleja el cambio en el navbar sin que este módulo cambie.
  readonly branding: Readonly<Ref<{ logoUrl: string | null; shortName: string | null }>>

  // Tema activo, expuesto en modo solo-lectura para módulos que necesiten
  // renderizar algo condicionado al tema (p. ej. un mapa con estilo dark).
  // Para CAMBIAR el tema, usar el store interno vía ThemeToggle — no expuesto
  // aquí a propósito (evita que un módulo de negocio fuerce el tema global).
  readonly activeTheme: Readonly<Ref<'notariaLight' | 'notariaDark'>>
}

function useAppShell(): AppShellApi
```

### Reglas del contrato

- **Estabilidad**: `setBreadcrumb`, `branding` y `activeTheme` son la
  superficie mínima que este feature garantiza. Cualquier módulo futuro
  puede depender de que existan con esta forma.
- **Lo que NO expone intencionalmente**: forma de cambiar el tema o el modo
  del drawer desde fuera del shell — eso vive solo en `AppNavbar`/`AppDrawer`
  para mantener una única fuente de verdad de esas preferencias (spec FR-019).
- **Extensión futura**: cuando se implemente el módulo de Notificaciones,
  se espera que agregue su propio composable (`useNotifications()`) en vez
  de crecer este contrato — el ícono de campana en el navbar (FR-006) solo
  reserva el slot visual, no expone lógica de notificaciones aquí.

## Ejemplo de uso (para un módulo futuro, ilustrativo — no se implementa aquí)

```ts
// dentro de una página de un módulo futuro, p. ej. pages/escrituras/[id].vue
const { setBreadcrumb } = useAppShell()

onMounted(() => {
  setBreadcrumb([
    { label: 'Escrituras', to: '/escrituras' },
    { label: `Escritura ${escritura.value.folio}` },
  ])
})
```
