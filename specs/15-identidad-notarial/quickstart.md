# Quickstart: 15-identidad-notarial (Identidad Notarial, Fe Pública y Configuración Institucional)

Guía paso a paso para validar la configuración de identidad notarial y su inyección institucional en la plataforma.

---

## 1. Validación de Ficha Notarial y Titularidad (User Story 1 - MVP)
1. Iniciar sesión como usuario con rol **Administrador** o **Notario Titular**.
2. Navegar a `/administracion-general` y hacer clic en la tarjeta **"Identidad Notarial y Fe Pública"** (o directamente a `/administracion-general/identidad-notarial`).
3. En la pestaña **"Ficha Notarial"**:
   - Modificar el Número de Notaría a `128`.
   - Entidad Federativa: `Estado de México`.
   - Municipio: `Metepec`.
   - Distrito Judicial: `Distrito Judicial de Toluca`.
   - Notario Titular: `Lic. Carlos Alberto Salinas Notario`.
   - Número de Patente/Fíat: `PAT-2021-0128`.
4. En la pestaña **"Domicilio y Contacto"**:
   - Capturar calle, números, colonia, C.P. y teléfonos oficiales.
5. Hacer clic en **"Guardar Configuración"**.
6. **Verificación**:
   - Aparece la notificación de éxito en verde.
   - El título superior y los campos reflejan los nuevos valores persistidos en PostgreSQL.

---

## 2. Validación de Carga de Logotipo y Sello Notarial (User Story 2)
1. Cambiar a la pestaña **"Identidad Visual y Sellos"**.
2. En la sección **Logotipo Oficial**:
   - Seleccionar un archivo de imagen PNG o SVG.
   - Verificar que aparece la previsualización inmediata.
   - Pulsar "Subir Logotipo".
3. En la sección **Sello Notarial de Autorizar**:
   - Seleccionar el facsímil gráfico del sello notarial.
   - Verificar la previsualización con fondo contrastado.
   - Pulsar "Subir Sello".
4. **Verificación**:
   - Ambas imágenes se guardan en el bucket `notaria-identidad` de Supabase Storage.
   - Sus URLs quedan vinculadas a la configuración institucional.

---

## 3. Validación de Leyendas y Fórmulas Reglamentarias (User Story 3)
1. En la pestaña **"Leyendas y Formatos Oficiales"**:
   - Revisar la fórmula predeterminada de *Certificación de Cierre de Volumen*.
   - Añadir al final: *"Doy Fe y Certifico."*.
   - Guardar cambios.
2. **Verificación**:
   - El texto se conserva íntegro con soporte para tags variables (`{numero_volumen}`, `{escrituras_validas}`, etc.).

---

## 4. Validación de Consumo e Inyección Dinámica (User Story 4)
1. Observar la barra superior de navegación (`AppNavbar.vue`):
   - Constatar que el nombre muestra dinámicamente *"Notaría Pública No. 128 del Estado de México"* (o el nombre configurado) y el logotipo si fue cargado.
2. Navegar a `/reportes`, pestaña **"Índices por Volumen"**.
3. Seleccionar cualquier volumen y abrir la vista previa imprimible:
   - Constatar que el membrete superior exhibe el logotipo y datos oficiales de la notaría configurada.
   - Constatar que la certificación de cierre al calce exhibe la fórmula actualizada sin texto residual fijo.
