# Quickstart & Verification Guide: 06-expedientes

Esta guía describe los escenarios de verificación para comprobar el correcto funcionamiento del módulo de Expedientes Digitales Notariales, Requisitos por Acto y Cotejo Notarial.

## Prerrequisitos

- Supabase local activo (`npx supabase status` en `127.0.0.1:54321` / Postgres `54322`).
- Migraciones aplicadas hasta `20260730000000_cumplimiento_pld.sql`.
- Servidor de desarrollo Nuxt 3 o suite de pruebas Vitest.

---

## Escenarios de Verificación Rápida

### Escenario 1: Evaluación Dinámica de Requisitos por Acto (Compraventa)
1. **Acción**: Consultar los requisitos documentales de una escritura con acto de *Compraventa*.
2. **Resultado Esperado**:
   - `fn_evaluar_requisitos_expediente` retorna la lista consolidada de requisitos (Título antecedente, Boleta Predial, Constancia de Agua, Certificado de Libertad de Gravámenes, Avalúo Comercial, Cédula Catastral e Identificaciones KYC).
   - Semáforo en `rojo` si faltan documentos obligatorios, con `permite_protocolizar = false`.

### Escenario 2: Carga y Fe Notarial de Cotejo contra Original
1. **Acción**: Cargar el archivo PDF correspondiente al *Título de Propiedad Antecedente* e invocar `fn_asentar_cotejo_notarial(documento_id, "original", "Exhibido testimonio original con holograma")`.
2. **Resultado Esperado**:
   - El documento registra `cotejado_contra_original = true`, `tipo_documento_exhibido = "original"`, fecha de cotejo actual y usuario autenticado.
   - En la vista `v_expediente_escritura`, el documento proyecta la fe de cotejo notarial.

### Escenario 3: Dispensa Notarial por Notario Titular
1. **Acción**: Ante un documento obligatorio faltante (e.g. Constancia de Agua en trámite), un usuario con rol `notario_titular` invoca `fn_registrar_dispensa_documental`.
2. **Resultado Esperado**:
   - Se inserta la dispensa con justificación motivada.
   - La evaluación del expediente marca el requisito como `dispensado` y no bloquea la protocolización.

### Escenario 4: Descarga Selectiva en ZIP y Compilación en PDF con Auditoría
1. **Acción**: Seleccionar documentos del expediente y solicitar la descarga en ZIP o compilación en PDF único.
2. **Resultado Esperado**:
   - Se genera el archivo correspondiente para descarga en el navegador.
   - Se registra el evento en `public.expediente_descargas_log` con `tipo_descarga`, `usuario_id`, `documentos_ids` y `created_at`.

### Escenario 5: Validación del Gate de Protocolización
1. **Acción**: Ejecutar `fn_validar_protocolizacion(escritura_id)`.
2. **Resultado Esperado**:
   - Si faltan documentos obligatorios sin dispensa o el título de propiedad no está cotejado contra original/certificada, la función devuelve los mensajes de bloqueo correspondientes e impide protocolizar.
   - Con todos los requisitos satisfechos y cotejados, la validación documental pasa exitosamente.

---

## Comandos de Prueba

```bash
# Ejecutar pruebas unitarias del módulo de expedientes
npm test -- test/unit/expedientes.spec.ts

# Ejecutar suite de pruebas completa de regresión
npm test
```
