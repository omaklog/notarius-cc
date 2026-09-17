# Design System — Sistema de Administración Notarial

Este documento fija los lineamientos visuales del proyecto (color, tipografía,
espaciado, componentes) **antes** de construir interfaces. Ninguna pantalla
debe desviarse de estos tokens sin actualizar primero este documento.

## 1. Dirección de diseño

La identidad se basa en el lenguaje real de la fe pública: tinta azul de
sello notarial, papel oficial, precisión tipográfica de documentos legales.
Se evita deliberadamente el "café + terracota" u otros defaults genéricos de
diseño asistido por IA.

## 2. Paleta de color

| Token CSS | Hex | Uso |
|---|---|---|
| `--color-ink` | `#1B3A5F` | Primario: navbar, botones primarios, encabezados de marca |
| `--color-ink-dark` | `#12283F` | Hover/active del primario |
| `--color-bronze` | `#A9762E` | Acento — **uso exclusivo** para el elemento "sello" (verificación/protocolización). No usar como color decorativo general |
| `--color-paper` | `#F0F2F4` | Fondo general de la aplicación |
| `--color-surface` | `#FFFFFF` | Tarjetas, formularios, tablas |
| `--color-ink-text` | `#1C222B` | Texto principal |
| `--color-text-muted` | `#5B6472` | Texto secundario / metadatos |
| `--color-success` | `#2F6F4E` | Verificado, al corriente, bajo riesgo PLD |
| `--color-warning` | `#C98A2C` | Alto riesgo, PEP, pendiente de revisión |
| `--color-danger` | `#B23A34` | Bloqueado (match LPB), vencido, error |
| `--color-info` | `#2F6690` | Notificaciones informativas |

**Regla de uso del bronce:** solo aparece en el badge/insignia de "sello"
(estatus oficial validado). Si se usa en más lugares pierde su significado
distintivo.

### 2.1 Tema oscuro

El tono azul-tinta del tema claro pierde contraste sobre fondo oscuro, así
que en modo oscuro se aclara para uso interactivo; el bronce se calienta
ligeramente para mantener visibilidad.

| Token CSS | Hex | Uso |
|---|---|---|
| `--color-ink` (dark) | `#5B8DC9` | Primario en modo oscuro: botones, links, elementos interactivos |
| `--color-ink-dark` (dark) | `#7BA5D6` | Hover/active del primario |
| `--color-bronze` (dark) | `#C99A4A` | Acento — mismo uso exclusivo que en modo claro (sello) |
| `--color-paper` (dark) | `#10161F` | Fondo general |
| `--color-surface` (dark) | `#1A2230` | Tarjetas, formularios, tablas |
| `--color-ink-text` (dark) | `#E7E9EC` | Texto principal |
| `--color-text-muted` (dark) | `#9AA3AF` | Texto secundario / metadatos |
| `--color-success` (dark) | `#4F9C74` | Verificado, al corriente, bajo riesgo PLD |
| `--color-warning` (dark) | `#D9A44B` | Alto riesgo, PEP, pendiente de revisión |
| `--color-danger` (dark) | `#D9615B` | Bloqueado, vencido, error |
| `--color-info` (dark) | `#5B94BE` | Notificaciones informativas |
| `--color-border` (dark) | `#2A3444` | Bordes y divisores |

**Regla:** el modo oscuro no es "invertir colores" — cada rol se reevalúa
para mantener contraste AA mínimo contra su fondo. El bronce y los colores
de estado se aclaran/calientan; el primario cambia de rol (de superficie
sólida oscura a color interactivo claro).

## 3. Tipografía

| Rol | Fuente | Peso | Uso |
|---|---|---|---|
| Display / documento | Libre Caslon Display | 400 | Nombre del sistema, títulos de escritura, encabezados de reportes formales |
| Interfaz (UI) | IBM Plex Sans | 400 / 500 | Navegación, botones, labels, formularios, cuerpo de texto |
| Datos / identificadores | IBM Plex Mono | 400 / 500 | Folios, RFC, CURP, montos, fechas en tablas — alineación tabular |

Escala tipográfica (base 16px, ratio ~1.25):
`12 · 14 · 16 · 20 · 25 · 31 · 39 px`

Google Fonts (link para `nuxt.config` / `<head>`):
```
https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap
```

## 4. Layout, espaciado y componentes

- **Grid de espaciado:** base 8px → `4 / 8 / 16 / 24 / 32 / 48 px`.
- **Radio de bordes:** `6px` en botones, inputs, tarjetas. Deliberadamente
  moderado — transmite seriedad, no "app lúdica".
- **Elevación:** mínima. Preferir `border: 1px solid` sobre sombras
  marcadas. En Vuetify, priorizar variante `outlined` sobre `elevated`.
- **Densidad:** `compact` en tablas/listados (alto volumen de datos),
  `comfortable` en formularios de captura.
- **Iconografía:** Material Design Icons (nativo de Vuetify), estilo
  *outline*; relleno (*filled*) reservado para estado activo/seleccionado.

## 5. Estados semánticos (reutilizados en todo el sistema)

Estos colores deben ser consistentes en cualquier módulo que muestre estatus
— especialmente en Cumplimiento PLD, Trámites y Órdenes de pago/Honorarios:

| Estado | Color | Ejemplos de uso |
|---|---|---|
| Éxito / verificado | `--color-success` | PLD verificado, honorarios liquidados, trámite concluido |
| Atención / riesgo medio | `--color-warning` | PEP identificado, pago parcial, trámite por vencer |
| Crítico / bloqueo | `--color-danger` | Match en Lista de Personas Bloqueadas, aviso vencido sin presentar |
| Informativo | `--color-info` | Notificación enviada, recordatorio |

## 6. Elemento distintivo: el "sello"

Insignia circular (28px), anillo de 2px en `--color-bronze`, ícono al
centro. Único uso: marcar validación oficial (compareciente con PLD
verificado, escritura protocolizada, aviso presentado ante SAT/SPPLD).

## 7. Configuración de tema Vuetify (punto de partida)

```js
// nuxt.config.ts / vuetify plugin
export default {
  theme: {
    defaultTheme: 'notariaLight',
    themes: {
      notariaLight: {
        dark: false,
        colors: {
          primary: '#1B3A5F',
          'primary-darken-1': '#12283F',
          secondary: '#A9762E',
          background: '#F0F2F4',
          surface: '#FFFFFF',
          success: '#2F6F4E',
          warning: '#C98A2C',
          error: '#B23A34',
          info: '#2F6690',
        },
      },
      notariaDark: {
        dark: true,
        colors: {
          primary: '#5B8DC9',
          'primary-darken-1': '#7BA5D6',
          secondary: '#C99A4A',
          background: '#10161F',
          surface: '#1A2230',
          success: '#4F9C74',
          warning: '#D9A44B',
          error: '#D9615B',
          info: '#5B94BE',
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'md' },
    VCard: { variant: 'outlined', rounded: 'md' },
    VTextField: { variant: 'outlined', density: 'comfortable' },
    VDataTable: { density: 'compact' },
  },
}
```

## 8. Pendiente de definir en avance del proyecto

- Iconografía específica por módulo (mapa de íconos MDI por tipo de acto,
  estatus de trámite, etc.).
- Tokens de impresión (para generación de reportes/PDF con el mismo
  lenguaje visual — probablemente requiera su propia hoja de estilos).
