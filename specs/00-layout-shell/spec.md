# Feature Specification: Layout principal (shell de la aplicación)

**Feature Branch**: N/A — sin hook de creación de rama configurado (`.specify/extensions.yml` no existe); esta feature se gestiona únicamente por directorio (`specs/00-layout-shell`).

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Módulo 00-layout-shell — infraestructura transversal usada por todos los demás módulos. Define el armazón visual de la aplicación (navbar, drawer lateral, área de contenido) que envuelve todas las pantallas de negocio y aplica el tema de design-system.md. No define pantallas de negocio, solo el contenedor y su comportamiento."

**Depende de**: `design-system.md` (tokens de color, tipografía, tema Vuetify — ya definido), `constitution.md` §8 (diseño previo obligatorio de pantallas con Stitch vía MCP).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegar entre módulos con un shell consistente (Priority: P1)

Como usuario autenticado del sistema (notario, abogado, asistente, administrador
u oficial de cumplimiento), quiero ver la misma barra superior y el mismo menú
lateral sin importar en qué módulo estoy (Escrituras, Comparecientes,
Cumplimiento PLD, etc.), para poder ubicarme y cambiar de sección sin perder el
contexto visual ni tener que reaprender la navegación en cada pantalla.

**Why this priority**: Es la razón de ser del módulo — sin un shell compartido,
cada uno de los ~12 módulos tendría que reimplementar navegación, y no habría
forma de garantizar consistencia visual ni de agregar módulos futuros sin
duplicar código.

**Independent Test**: Se puede probar de forma aislada visitando dos o más
rutas de distintos módulos (ya sea con contenido real o una pantalla vacía de
prueba) y verificando que ambas cargan dentro del mismo navbar/drawer, sin
duplicar el layout ni perder el estado de navegación.

**Acceptance Scenarios**:

1. **Given** el usuario está autenticado y navega a cualquier ruta de la
   aplicación, **When** la página carga, **Then** ve el mismo navbar superior,
   el mismo drawer lateral y el contenido de esa ruta dentro del área
   `v-main`, sin que el layout se recargue o parpadee entre rutas.
2. **Given** el usuario está en un módulo cuya ruta pertenece a uno de los
   grupos del menú (p. ej. "Operación"), **When** el drawer se renderiza,
   **Then** ese grupo aparece expandido por defecto y el ítem correspondiente
   a la ruta activa está resaltado.
3. **Given** el logo/nombre de la notaría aún no fue configurado en
   Administración General, **When** el shell se renderiza, **Then** se
   muestra un placeholder en su lugar, sin bloquear ni retrasar el resto del
   render.

---

### User Story 2 - Cambiar entre tema claro y oscuro (Priority: P2)

Como usuario, quiero alternar entre el tema claro (`notariaLight`) y el oscuro
(`notariaDark`) desde el navbar, y que mi preferencia se recuerde la próxima
vez que entre, para poder trabajar cómodamente según el ambiente (oficina de
día, revisión nocturna, etc.).

**Why this priority**: Es una funcionalidad visible e independiente del resto
del shell (se puede construir y probar sin depender del contenido de los
módulos de negocio), pero no es indispensable para que el sistema sea
utilizable — por eso va después de la navegación básica.

**Independent Test**: Se puede probar aislado abriendo la app, alternando el
ícono sol/luna del navbar y verificando que toda la interfaz cambia de tema
sin recargar la página, y que al recargar el navegador se conserva la última
preferencia elegida.

**Acceptance Scenarios**:

1. **Given** el usuario no tiene preferencia guardada (primera visita),
   **When** abre la aplicación, **Then** el tema inicial respeta
   `prefers-color-scheme` del sistema operativo/navegador.
2. **Given** el usuario hace clic en el selector de tema, **When** el tema
   cambia, **Then** toda la interfaz visible se actualiza al instante (sin
   recargar la página) y la elección queda guardada en `localStorage`.
3. **Given** el usuario ya eligió un tema en una visita anterior, **When**
   vuelve a abrir la aplicación, **Then** se aplica esa preferencia guardada,
   ignorando `prefers-color-scheme`.

---

### User Story 3 - Usar el shell en dispositivos móviles y en modo compacto (Priority: P3)

Como usuario que accede desde una tablet o celular (o que quiere ganar espacio
horizontal en desktop), quiero que el drawer se adapte — como overlay en
pantallas angostas, o en modo "rail" (solo íconos) en escritorio — para poder
seguir navegando sin que el menú ocupe toda la pantalla o estorbe al
contenido.

**Why this priority**: Mejora la usabilidad en escenarios secundarios de uso
(no es el flujo principal de trabajo, que se asume primariamente en
escritorio), y depende de que la navegación base (US1) ya exista.

**Independent Test**: Se puede probar de forma aislada redimensionando el
viewport (o usando las herramientas de desarrollo del navegador) por debajo y
por encima de 1280px, y alternando el modo rail en desktop, verificando en
cada caso que el contenido sigue siendo accesible y el drawer se comporta
según lo esperado para ese tamaño.

**Acceptance Scenarios**:

1. **Given** el viewport es menor a 1280px (mobile/tablet), **When** el
   usuario abre el drawer, **Then** este se muestra como overlay temporal
   sobre el contenido (no empuja el layout) y se puede cerrar tocando fuera
   de él o el botón de menú.
2. **Given** el viewport es ≥1280px (desktop), **When** el usuario colapsa el
   drawer desde el botón de menú, **Then** el drawer pasa a modo rail
   (72px, solo íconos) en lugar de ocultarse por completo.
3. **Given** el usuario colapsó el drawer o lo puso en un estado particular,
   **When** vuelve a abrir la aplicación, **Then** ese estado se conserva
   (persistido en `localStorage`).

---

### Edge Cases

- ¿Qué pasa si el nombre de la notaría es muy largo para el ancho disponible
  del navbar? → Se trunca con ellipsis (ver FR-003).
- ¿Qué pasa si el usuario redimensiona la ventana en vivo (cruza el breakpoint
  de 1280px) mientras el drawer está abierto? → El shell debe re-evaluar el
  modo del drawer (permanent/rail vs. temporary/overlay) sin requerir recargar
  la página.
- ¿Qué pasa si el usuario autenticado no tiene foto de perfil? → El avatar
  muestra las iniciales de su nombre en su lugar.
- ¿Qué pasa si en el futuro se agregan o quitan módulos del menú? → La
  agrupación por categorías (Operación, Cumplimiento, Finanzas, Ubicación,
  Sistema) debe soportar agregar/quitar ítems dentro de un grupo, o grupos
  completos, sin rediseñar el shell.
- ¿Qué pasa si el usuario intenta navegar por teclado (sin mouse)? → Tanto el
  drawer como el menú de usuario deben ser completamente operables por
  teclado, con foco visible (ver FR-017).

## Requirements *(mandatory)*

### Functional Requirements

**Navbar (barra superior)**

- **FR-001**: El sistema DEBE mostrar una barra superior fija presente en
  todas las rutas de la aplicación, conteniendo: botón de menú, logo, título,
  selector de tema, ícono de notificaciones y avatar de usuario.
- **FR-002**: El sistema DEBE mostrar el logo y el nombre de la notaría
  capturados en Administración General → Datos generales; si aún no existen,
  DEBE mostrar un placeholder por defecto sin bloquear el resto del render.
- **FR-003**: El título/nombre mostrado en el navbar DEBE truncarse con
  ellipsis cuando el ancho disponible sea insuficiente (pantallas angostas).
- **FR-004**: El sistema DEBE proveer un botón de menú (ícono hamburguesa)
  siempre visible que colapse/expanda el drawer: en desktop alterna entre
  expandido y modo rail; en mobile alterna entre oculto y overlay.
- **FR-005**: El sistema DEBE proveer un selector de tema (ícono sol/luna) que
  alterne entre tema claro y oscuro (ver User Story 2).
- **FR-006**: El sistema DEBE reservar un espacio/ícono de notificaciones en
  el navbar (campana con badge), sin implementar aún su lógica de contenido —
  esa lógica pertenece a un módulo/spec separado (Notificaciones).
- **FR-007**: El sistema DEBE mostrar un avatar circular del usuario
  autenticado (foto o iniciales); al hacer clic, DEBE abrir un menú con
  nombre, rol y la opción de cerrar sesión.

**Drawer lateral (menú de navegación)**

- **FR-008**: El sistema DEBE mostrar un menú lateral de navegación,
  organizado en grupos temáticos (no como lista plana), cubriendo los módulos
  definidos en `constitution.md`: Operación (Escrituras, Comparecientes,
  Expedientes, Trámites), Cumplimiento (PLD/UIF, Avisos SAT/UIF), Finanzas
  (Órdenes de pago, Honorarios), Ubicación (Georreferenciación) y Sistema
  (Notificaciones, Reportes, Administración general).
- **FR-009**: Cada grupo del menú DEBE poder expandirse/colapsarse de forma
  independiente; el grupo que contiene la ruta activa DEBE aparecer expandido
  por defecto al cargar.
- **FR-010**: El sistema DEBE resaltar visualmente el ítem del menú
  correspondiente a la ruta activa, usando el color primario del tema en un
  tono claro (nunca el color bronce, reservado exclusivamente al elemento
  "sello" según `design-system.md`).
- **FR-011**: En pantallas ≥1280px, el drawer DEBE comportarse como
  `permanent` (fijo, empuja el contenido); en pantallas <1280px DEBE
  comportarse como `temporary` (overlay sobre el contenido).
- **FR-012**: En desktop, el drawer DEBE soportar un modo compacto ("rail")
  de 72px de ancho que muestra solo íconos, como alternativa a ocultarse por
  completo.

**Área de contenido**

- **FR-013**: El sistema DEBE renderizar el contenido de cada ruta dentro de
  un área de contenido (`v-main`) con padding consistente: 24px en desktop,
  16px en mobile, siguiendo el grid de espaciado de `design-system.md`.
- **FR-014**: Cuando la ruta activa tenga más de un nivel de profundidad, el
  sistema DEBE mostrar un breadcrumb debajo del navbar reflejando esa
  jerarquía.

**Tema y consistencia visual**

- **FR-015**: El sistema DEBE aplicar únicamente los temas `notariaLight` y
  `notariaDark` definidos en `design-system.md` §7; ningún componente del
  shell o de los módulos de negocio DEBE fijar colores fuera de estos temas.
- **FR-016**: Los indicadores de estado (p. ej. badges de riesgo PLD) DEBEN
  usar los tokens semánticos del tema activo (`success`/`warning`/`error`),
  nunca valores de color fijos, para funcionar correctamente en ambos modos.

**Accesibilidad y persistencia**

- **FR-017**: El drawer y el menú de usuario DEBEN ser completamente
  operables por teclado, con estado de foco visible en todo momento.
- **FR-018**: El sistema DEBE cumplir contraste mínimo AA en ambos temas,
  según los tokens definidos en `design-system.md`.
- **FR-019**: El sistema DEBE persistir en `localStorage` (sin depender de
  backend) las preferencias de tema y de estado del drawer (expandido / rail
  / colapsado), y restaurarlas en visitas posteriores.
- **FR-020**: El render inicial del shell (navbar, drawer, estructura del
  contenido) NO DEBE bloquearse esperando datos de negocio; el logo/nombre de
  la notaría se cargan de forma asíncrona mostrando un placeholder mientras
  tanto.

**Diseño de interfaz con Stitch**

- **FR-021**: El diseño y disposición del shell (barra superior, drawer en modos expandido y rail, jerarquía de breadcrumbs y área principal) DEBE haber sido generado previamente a través de una solicitud con parámetros contextuales a Stitch (MCP) antes de su codificación en Vuetify, garantizando la optimización de visualización y ergonomía de navegación.

### Key Entities

- **Preferencia de shell del usuario**: tema elegido (claro/oscuro) y estado
  del drawer (expandido, rail, colapsado). Vive únicamente en `localStorage`
  del navegador — no se persiste en backend en esta versión.
- **Datos generales de la notaría**: logo y nombre corto mostrados en el
  navbar. Es dato de solo lectura para este módulo — se captura y gestiona en
  el módulo de Administración General (fuera de alcance de este spec).
- **Estructura de navegación**: la lista de grupos y módulos del menú lateral,
  derivada de la lista de módulos en `constitution.md` §4 — es configuración
  estática del shell, no una entidad persistida en base de datos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las rutas de la aplicación se renderizan dentro del
  mismo layout compartido, sin que ninguna pantalla implemente su propio
  navbar o drawer por separado.
- **SC-002**: Un usuario puede cambiar de tema claro a oscuro (o viceversa) y
  ver el cambio reflejado en toda la pantalla en menos de 1 segundo, sin
  ninguna recarga de página.
- **SC-003**: En cualquier tamaño de pantalla probado (mobile, tablet,
  desktop), el usuario puede acceder al menú de navegación y llegar a
  cualquier módulo en 2 clics o menos desde cualquier otra pantalla.
- **SC-004**: Las preferencias de tema y estado del drawer elegidas por el
  usuario se mantienen correctamente en el 100% de los casos al cerrar y
  volver a abrir la aplicación en el mismo navegador.
- **SC-005**: Una revisión de código/estilos no encuentra ningún color
  codificado directamente (hardcoded) fuera de los tokens del tema en los
  componentes del shell.
- **SC-006**: Usuarios que navegan exclusivamente con teclado pueden acceder a
  todas las opciones del drawer y del menú de usuario sin quedar atrapados o
  sin indicación visual de foco.
- **SC-007**: El layout y componentes del shell cuentan con una referencia visual generada por Stitch que valida la jerarquía visual y el contraste antes de su codificación en Vuetify.

## Assumptions

- El control de sesión y la pantalla de login son responsabilidad de un
  módulo de Autenticación separado (fuera de alcance); este spec asume que
  el shell solo se renderiza para un usuario ya autenticado.
- La lógica y el contenido real del ícono de notificaciones se definen en un
  spec propio del módulo de Notificaciones; aquí solo se reserva el espacio
  visual en el navbar.
- El mapa detallado de íconos MDI por módulo/tipo de acto (pendiente según
  `design-system.md` §8) no bloquea este spec: se usa un ícono representativo
  razonable por grupo/módulo como punto de partida, ajustable después sin
  cambiar la estructura del shell.
- Los ~12 módulos y su agrupación en categorías pueden evolucionar; el diseño
  del drawer (grupos expandibles) debe soportar ese crecimiento sin
  rediseño estructural.
- No se requiere sincronizar preferencias de tema/drawer entre dispositivos
  distintos del mismo usuario en esta versión (persistencia es solo local,
  por navegador).
