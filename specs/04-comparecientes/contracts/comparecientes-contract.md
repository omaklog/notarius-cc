# Contract: Comparecientes API & RPC Contracts

Este documento fija la firma y los esquemas de datos expuestos para el catálogo global de comparecientes y su integración con escrituras.

---

## 1. Búsqueda Predictiva de Comparecientes

### `fn_buscar_comparecientes(p_query text, p_limite integer default 10)`

Busca en el catálogo global por coincidencia de RFC, CURP o Nombre/Razón Social.

**Input**:
- `p_query text`: Término de búsqueda (mínimo 3 caracteres).
- `p_limite integer`: Máximo de resultados retornados (default 10).

**Output (Array de Objetos)**:
```json
[
  {
    "id": "uuid",
    "tipo_persona": "fisica | moral",
    "rfc": "RFC123456789",
    "identificador_secundario": "CURP987654321 | Folio Mercantil",
    "nombre_completo": "Juan Pérez López | Inmobiliaria del Norte SA de CV",
    "activo": true
  }
]
```

---

## 2. Guardado Integral de Compareciente

### `fn_guardar_compareciente_fisica(...)`

Crea o actualiza de manera atómica la tupla en `comparecientes` y `compareciente_personas_fisicas`.

**Parámetros**:
- `p_id uuid` (nullable para nuevo registro)
- `p_nombres text`
- `p_primer_apellido text`
- `p_segundo_apellido text`
- `p_rfc text`
- `p_curp text`
- `p_fecha_nacimiento date`
- `p_genero text`
- `p_nacionalidad text`
- `p_estado_civil text`
- `p_regimen_patrimonial_id uuid`
- `p_ocupacion text`
- `p_tipo_identificacion_id uuid`
- `p_folio_identificacion text`
- `p_vigencia_identificacion date`
- `p_domicilio jsonb`
- `p_contacto jsonb` (`email`, `telefono`)

**Retorno**: `uuid` del compareciente creado o actualizado.

---

### `fn_guardar_compareciente_moral(...)`

Crea o actualiza de manera atómica la tupla en `comparecientes` y `compareciente_personas_morales`.

**Parámetros**:
- `p_id uuid` (nullable)
- `p_razon_social text`
- `p_rfc text`
- `p_fecha_constitucion date`
- `p_nacionalidad text`
- `p_folio_mercantil text`
- `p_instrumento_constitutivo text`
- `p_fecha_instrumento date`
- `p_notario_constitucion text`
- `p_plaza_constitucion text`
- `p_objeto_social text`
- `p_domicilio jsonb`
- `p_contacto jsonb`

**Retorno**: `uuid` del compareciente moral creado o actualizado.

---

## 3. Contrato de Integración con `ComparecientesTab.vue`

El componente `ComparecientesTab.vue` consume:
1. `GET /rest/v1/acto_juridico_roles?select=rol_compareciente_id,roles_compareciente(id,nombre,activo)&acto_juridico_id=eq.{id}`
2. RPC `fn_buscar_comparecientes` para autocompletar clientes existentes.
3. RPC `fn_asociar_compareciente` enviando:
   - `p_escritura_id`: UUID de la escritura.
   - `p_compareciente_id`: UUID del cliente seleccionado o recién guardado.
   - `p_rol_id`: UUID del rol seleccionado (estrictamente filtrado).
   - `p_porcentaje`: Numérico opcional entre 0.01 y 100.

---

## 4. Endpoint de Reconocimiento OCR: `POST /api/ocr/identificacion`

Ruta interna de servidor Nuxt que procesa imágenes con visión multimodal (Gemini Vision API) y retorna un JSON fuertemente tipado.

**Headers**:
- `Content-Type: application/json`
- Requiere sesión activa / JWT autenticado del sistema notarial.

**Request Body**:
```json
{
  "tipo_identificacion": "ine | pasaporte",
  "anverso_base64": "data:image/jpeg;base64,...",
  "reverso_base64": "data:image/jpeg;base64,..."
}
```

**Response Body (200 OK)**:
```json
{
  "exito": true,
  "tipo_identificacion": "ine",
  "datos": {
    "nombres": "JUAN",
    "primer_apellido": "PEREZ",
    "segundo_apellido": "LOPEZ",
    "curp": "PELJ850615HDFRPR01",
    "rfc": "PELJ850615XXX",
    "clave_elector": "PELJ85061509H100",
    "vigencia": "2030",
    "fecha_nacimiento": "1985-06-15",
    "genero": "M",
    "domicilio": {
      "calle": "AV INSURGENTES SUR",
      "numero_exterior": "123",
      "numero_interior": "4B",
      "colonia": "JUAREZ",
      "codigo_postal": "06600",
      "municipio": "CUAUHTEMOC",
      "entidad_federativa": "CIUDAD DE MEXICO"
    }
  }
}
```

---

## 5. Contrato de Consulta Dinámica de Expediente de Escritura

Consumo directo en Supabase de la vista `v_expediente_escritura`:

```http
GET /rest/v1/v_expediente_escritura?escritura_id=eq.{id}&order=created_at.asc
```

**Response (Array de Documentos Unificados)**:
```json
[
  {
    "documento_id": "uuid",
    "origen_documento": "escritura",
    "categoria": "avaluo",
    "archivo_nombre": "avaluo_comercial.pdf",
    "archivo_path": "escrituras/123/avaluo.pdf",
    "compareciente_id": null,
    "compareciente_nombre": null
  },
  {
    "documento_id": "uuid",
    "origen_documento": "compareciente",
    "categoria": "identificacion_oficial",
    "lado": "anverso",
    "archivo_nombre": "ine_anverso.jpg",
    "archivo_path": "comparecientes/456/identificaciones/ine_anverso.jpg",
    "compareciente_id": "uuid-compareciente",
    "compareciente_nombre": "JUAN PEREZ LOPEZ"
  }
]
```

