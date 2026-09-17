# Quickstart: Validar el layout shell

Guía para validar manualmente los escenarios de aceptación del spec una vez
implementado. No sustituye los tests de Vitest — es la verificación
end-to-end "a ojo" del shell corriendo en el navegador.

## Prerrequisitos

Dependencias nuevas que este feature agrega (aún no están en
`package.json`):

```bash
yarn add vuetify pinia @pinia/nuxt vuetify-nuxt-module @mdi/font
yarn add -D vitest @vue/test-utils happy-dom
```

Registrar en `nuxt.config.ts`: módulos `vuetify-nuxt-module` y
`@pinia/nuxt`, y las fuentes de `design-system.md` §3 (Google Fonts link).

## Levantar el entorno

```bash
yarn dev
```

Abrir `http://localhost:3000`.

## Escenarios a validar (referencia: spec.md → Acceptance Scenarios)

1. **Shell consistente entre rutas (US1)**
   - Navegar entre al menos 2 rutas distintas (aunque sean placeholders).
   - Verificar: mismo navbar/drawer en ambas, sin parpadeo ni recarga del layout.
   - Verificar: el grupo del drawer correspondiente a la ruta activa aparece expandido y el ítem activo resaltado en `primary`, no en bronce.

2. **Placeholder de branding**
   - Sin datos de Administración General (aún no existe ese módulo), confirmar que el navbar muestra el placeholder de logo/nombre sin errores en consola ni bloqueo de render.

3. **Cambio de tema (US2)**
   - Clic en el ícono sol/luna → toda la UI cambia de inmediato (sin reload).
   - Recargar el navegador → se conserva el último tema elegido.
   - Borrar `localStorage` y recargar → el tema inicial respeta `prefers-color-scheme` del sistema.

4. **Responsive / rail (US3)**
   - Con DevTools, probar viewport <1280px: el drawer debe abrir como overlay y cerrarse al tocar fuera.
   - Con viewport ≥1280px: colapsar el drawer → debe pasar a modo rail (72px, solo íconos), no ocultarse del todo.
   - Recargar en el mismo tamaño → el estado del drawer elegido se conserva.

5. **Accesibilidad por teclado**
   - Con `Tab`, recorrer navbar → drawer → menú de usuario sin usar mouse.
   - Confirmar foco visible en cada elemento interactivo.

## Correr las pruebas automatizadas

```bash
yarn vitest run
```

Debe cubrir, como mínimo (ver `plan.md` → Project Structure):
- `tests/unit/stores/layoutPreferences.store.spec.ts`
- `tests/unit/composables/useNavItems.spec.ts`
- `tests/unit/components/layout/AppNavbar.spec.ts`
- `tests/unit/components/layout/AppDrawer.spec.ts`

## Criterio de "hecho" para este feature

Todos los escenarios de arriba pasan, `yarn vitest run` está en verde, y una
revisión visual rápida del código de `app/components/layout/**` no muestra
ningún color hex/rgb hardcodeado fuera de las clases/props de tema de
Vuetify (SC-005).
