# Data Model: Layout principal (shell de la aplicación)

Este módulo no tiene entidades de base de datos — es infraestructura de
cliente. Las "entidades" son estado de UI y configuración estática.

## LayoutPreferences (estado de cliente, Pinia + `localStorage`)

Representa la preferencia de shell del usuario en *este navegador*
(spec: "Preferencia de shell del usuario").

| Campo | Tipo | Default | Persistencia | Reglas |
|---|---|---|---|---|
| `theme` | `'notariaLight' \| 'notariaDark'` | resultado de `prefers-color-scheme`, o `'notariaLight'` si no se puede detectar | `localStorage['layout.theme']` | Solo estos dos valores; cualquier otro se ignora y cae al default |
| `drawerMode` | `'expanded' \| 'rail' \| 'hidden'` | `'expanded'` en desktop (≥1280px), `'hidden'` en mobile/tablet | `localStorage['layout.drawerMode']` | En mobile, `'rail'` no es un estado válido (el drawer ahí es overlay: solo `'hidden'`/`'expanded'` temporal) |
| `activeGroupOverride` | `string \| null` | `null` (se infiere del route activo) | No persistido — se recalcula por ruta en cada carga | Permite que el usuario expanda manualmente un grupo distinto al de la ruta activa durante la sesión |

**Transiciones de estado**: no hay máquina de estados compleja — son toggles
independientes (FR-004, FR-005, FR-011, FR-012). No se valida combinación
alguna entre `theme` y `drawerMode` (son ortogonales).

## NavItem / NavGroup (configuración estática, no persistida)

Representa la "Estructura de navegación" del spec — array constante
retornado por `useNavItems()`, derivado de `constitution.md` §4.

```ts
interface NavItem {
  label: string          // p. ej. "Escrituras"
  to: string             // ruta Nuxt, p. ej. "/escrituras"
  icon: string           // nombre de ícono MDI (placeholder hasta design-system.md §8)
}

interface NavGroup {
  label: string          // p. ej. "Operación"
  icon: string
  items: NavItem[]
}
```

Grupos fijos (spec FR-008): `Operación`, `Cumplimiento`, `Finanzas`,
`Ubicación`, `Sistema`. Cada `NavItem.to` debe apuntar a una ruta que exista
o vaya a existir en un spec de módulo futuro — este feature no crea esas
páginas, solo los enlaces del menú (pueden apuntar a rutas placeholder
`/en-construccion` hasta que cada módulo tenga su propia página).

## NotariaBranding (dato externo, solo lectura)

Representa "Datos generales de la notaría" (logo, nombre corto) que este
módulo consume pero no gestiona (pertenece a Administración General, spec
futuro).

| Campo | Tipo | Fuente | Comportamiento si falta |
|---|---|---|---|
| `logoUrl` | `string \| null` | Módulo de Administración General (aún no implementado) | Placeholder de logo por defecto |
| `shortName` | `string \| null` | Módulo de Administración General (aún no implementado) | Placeholder de texto (p. ej. nombre genérico del sistema) |

**Nota de implementación para este feature**: como Administración General
todavía no existe, `useAppShell()` (ver `contracts/`) debe exponer estos dos
campos con un valor "stub" (constante o `ref` local) que un feature futuro
reemplace por la fuente real (Supabase), sin cambiar la interfaz pública.
