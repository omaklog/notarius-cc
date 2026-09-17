# Quickstart: 04-comparecientes (Validación Manual de Escenarios)

Esta guía describe los escenarios de prueba manual paso a paso para verificar el funcionamiento integral del catálogo global de comparecientes y su fiscalización notarial.

---

## Prerrequisitos

- Stack de Supabase corriendo localmente: `npm run db:start` o migraciones aplicadas (`npm run db:reset`).
- Servidor de desarrollo Nuxt activo: `npm run dev` en `http://localhost:3000`.
- Sesión iniciada con credenciales de Administrador: `admin@notaria.local` / `Password123!`.

---

## Escenario 1: Alta y Validación de Persona Física con Régimen Matrimonial

1. Navegar a `/comparecientes` desde el menú lateral.
2. Hacer clic en **"Registrar compareciente"**.
3. Seleccionar tipo **"Persona Física"**.
4. Capturar:
   - Nombres: `Roberto Carlos`
   - Primer apellido: `Mendoza`
   - Segundo apellido: `Sánchez`
   - RFC: `MESR800101AB1` (13 dígitos)
   - CURP: `MESR800101HDFNRB02` (18 caracteres)
   - Estado Civil: `Casado`
   - Régimen Patrimonial: Seleccionar `Sociedad Conyugal`
   - Identificación: `Credencial para Votar (INE/IFE)`, Folio: `0123456789012`
   - Domicilio: Calle `Av. Hidalgo 100`, Col. `Centro`, CP `06000`, Ciudad de México.
5. Guardar el registro.
6. **Resultado Esperado**: El registro se guarda exitosamente y aparece en el directorio de comparecientes con su badge de Persona Física y su RFC visible. Si se intenta registrar de nuevo el mismo RFC o CURP, el sistema alerta sobre la duplicidad.

---

## Escenario 2: Alta de Persona Moral con Representante y Beneficiario Controlador

1. En `/comparecientes`, hacer clic en **"Registrar compareciente"**.
2. Seleccionar tipo **"Persona Moral"**.
3. Capturar:
   - Razón Social: `Desarrollos Urbanos del Bajío SA de CV`
   - RFC: `DUB150320AB2` (12 caracteres)
   - Fecha de constitución: `2015-03-20`
   - Folio Mercantil: `FME-987654`
   - Instrumento constitutivo: Escritura `45,210` ante Notario `12` de Querétaro.
4. En la sección **"Representantes y Apoderados"**:
   - Buscar y seleccionar a `Roberto Carlos Mendoza Sánchez`.
   - Tipo de poder: `Actos de Dominio y Administración`.
   - Instrumento: Escritura `45,210`.
5. En la sección **"Beneficiarios Controladores (CFF 32-B Quater)"**:
   - Vincular a `Roberto Carlos Mendoza Sánchez`.
   - Criterio: `Titularidad de acciones`.
   - Porcentaje: `60%`.
6. Guardar el registro.
7. **Resultado Esperado**: La persona moral se crea vinculando correctamente sus relaciones corporativas y fiscales.

---

## Escenario 3: Búsqueda Predictiva y Asociación a Escritura con Roles Filtrados

1. Navegar a `/escrituras` y abrir una escritura con acto `COMPRAVENTA` en estado `borrador`.
2. Ir a la pestaña **"Comparecientes"**.
3. En el buscador predictivo, teclear `MESR80` o `Roberto`.
4. Seleccionar a `Roberto Carlos Mendoza Sánchez` de la lista desplegable.
5. Verificar el selector de roles:
   - **Comprobar**: Solo aparecen los roles autorizados para Compraventa (`ADQUIRIENTE`, `ENAJENANTE`, etc.). No aparecen roles ajenos como `ALBACEA` o `TESTADOR`.
6. Seleccionar `ADQUIRIENTE`, porcentaje `100%`, y hacer clic en **"Asociar a escritura"**.
7. **Resultado Esperado**: El compareciente se asocia a la escritura mostrando su nombre completo y su rol asignado.

---

## Escenario 4: Ficha 360° del Compareciente

1. Navegar a `/comparecientes`.
2. Hacer clic sobre `Roberto Carlos Mendoza Sánchez` para abrir `/comparecientes/:id`.
3. **Resultado Esperado**:
   - Se despliega la ficha completa con todos sus datos civiles, fiscales y de contacto.
   - En la sección **"Historial de Instrumentos Notariales"**, aparece la escritura asociada en el Escenario 3 con su número de instrumento, acto jurídico y rol (`ADQUIRIENTE`).

---

## Escenario 5: Gestión del Catálogo de Identificaciones Oficiales

1. Iniciar sesión como Administrador y navegar a `/administracion-general/tipos-identificacion`.
2. **Resultado Esperado**:
   - Se listan los documentos por defecto precargados por el seeder:
     - `INE`: `permite_ocr: true`, `requiere_reverso: true`.
     - `Pasaporte`: `permite_ocr: true`, `requiere_reverso: false`.
     - `Cédula Profesional`, `Cartilla Militar`, `Forma Migratoria`: `permite_ocr: false`, `requiere_reverso: false`.
3. Hacer clic en "Editar" o "Nuevo Tipo":
   - Modificar o agregar un documento y guardar.
   - Verificar que los switches de `permite_ocr` y `requiere_reverso` actualizan correctamente la base de datos.

---

## Escenario 6: Flujo "OCR-First" y Vinculación Dinámica al Expediente de la Escritura

1. En `/comparecientes`, hacer clic en **"Registrar compareciente"** y seleccionar **Persona Física**.
2. **Resultado Esperado**: Se abre el asistente "OCR-First" mostrando la zona de carga de credencial oficial:
   - Para INE, muestra dos zonas: *Anverso (frontal)* y *Reverso*.
   - Muestra el enlace alternativo *"Omitir y capturar manualmente"*.
3. Subir imágenes de prueba de credencial de elector y pulsar **"Escanear con OCR"**.
4. **Resultado Esperado**:
   - El endpoint `/api/ocr/identificacion` procesa las imágenes y pre-llena los campos: Nombres, Apellidos, CURP, RFC, Clave de Elector, Vigencia y Domicilio desagregado.
   - El usuario valida los datos, completa el estado civil y guarda.
   - Las imágenes quedan registradas en `expediente_documentos` bajo el compareciente.
5. Asociar este nuevo compareciente a una escritura de prueba.
6. Consultar la vista `v_expediente_escritura` o pestaña de expediente de dicha escritura:
   - **Resultado Esperado**: Las fotos de la credencial aparecen listadas en el expediente de la escritura con la etiqueta *"Aportado por Compareciente: [Nombre]"*.
7. Desvincular al compareciente de la escritura:
   - **Resultado Esperado**: Las identificaciones desaparecen inmediatamente del expediente de la escritura, pero permanecen intactas en el perfil del compareciente.

