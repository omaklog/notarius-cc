# Especificación: Feature 09 — Georreferenciación de Predios e Inmuebles Notariales

## 1. Contexto y Justificación de Negocio

En el ejercicio de la función notarial mexicana, los actos jurídicos traslativos de dominio (compraventas, donaciones, adjudicaciones por herencia, permutas, daciones en pago, fideicomisos traslativos) versan sobre bienes inmuebles.
Para dar certeza jurídica sobre la identidad material del inmueble y cumplir con la Regla G de protocolización, el sistema notarial debe permitir:
1. Localizar y delimitar espacialmente el predio o terreno mediante un polígono trazado interactivamente sobre mapas de calles y satelitales.
2. Estimar de forma inmediata y automática la superficie del terreno en metros cuadrados ($m^2$), rotulándola explícitamente como aproximada.
3. Asistir en la formulación de las medidas y colindancias notariales (longitudes de cada segmento y orientación: Norte, Sur, Este, Oeste, etc.).
4. Capturar el testigo fotográfico de la fachada del inmueble e integrarlo en el Expediente Digital.
5. Soportar múltiples predios por instrumento notarial en actos de subdivisión, fusión o venta de lotes múltiples.
6. Levantar la causal de bloqueo de protocolización para escrituras traslativas una vez cumplida la georreferenciación.

---

## 2. Historias de Usuario

### US-GEO-01: Visualización y Búsqueda en Mapa Interactivo (Leaflet)
* **Como** abogado o notario encargado de la escritura,
* **Quiero** contar con un mapa interactivo con buscador de direcciones/colonias y capas cartográficas (OpenStreetMap y Satelital),
* **Para** situar rápidamente el área geográfica donde se ubica el inmueble sin navegar manualmente desde la vista general del país.

### US-GEO-02: Delimitación Poligonal y Cálculo Automático de Superficie
* **Como** proyectista notarial,
* **Quiero** trazar los vértices del polígono del predio con clics en el mapa y ajustar sus esquinas,
* **Para** que el sistema calcule automáticamente el área en metros cuadrados ($m^2$), mostrando claramente que se trata de una superficie aproximada estimada.

### US-GEO-03: Cuadro de Medidas y Colindancias Orientadas
* **Como** notario,
* **Quiero** que el sistema sugiera las medidas en metros de cada tramo del polígono y me permita seleccionar su orientación (Norte, Sur, Este, Oeste, etc.) con texto libre de colindancia,
* **Para** redactar con precisión los linderos en el instrumento notarial o editarlos libremente.

### US-GEO-04: Testigo Fotográfico de Fachada para el Expediente Digital
* **Como** oficial de cumplimiento o notario,
* **Quiero** subir la fotografía de la fachada del inmueble,
* **Para** anexarla como testigo de ubicación y vincularla automáticamente al expediente digital de la escritura.

### US-GEO-05: Gestión de Múltiples Predios (Subdivisiones y Lotes Múltiples)
* **Como** notario gestionando una escritura de subdivisión,
* **Quiero** agregar múltiples lotes o predios en la misma escritura y ver sus polígonos diferenciados en el mapa,
* **Para** asociar la georreferenciación de cada fracción resultante del acto notarial.

### US-GEO-06: Gate de Protocolización Condicional (Regla G)
* **Como** sistema de control de calidad notarial,
* **Quiero** verificar si la escritura es de acto traslativo y tiene al menos un predio georreferenciado con geometría válida,
* **Para** levantar el bloqueo normativo en el botón de protocolización.

---

## 3. Requerimientos Funcionales (FR)

* **FR-GEO-01**: Proveer la tabla `public.predios` vinculada a `escrituras.id` con campos para etiqueta, descripción, superficie aproximada, superficie declarada, geometría GeoJSON, centroide, colindancias JSON y foto de fachada.
* **FR-GEO-02**: En el cliente (Vue 3/Nuxt), inicializar Leaflet bajo `<ClientOnly>` con control de capas OSM estándar y ESRI World Imagery (satélite).
* **FR-GEO-03**: Proveer buscador de geocodificación mediante Nominatim / OpenStreetMap con `countrycodes=mx`.
* **FR-GEO-04**: Permitir trazar polígonos cerrados mediante clics sucesivos, con soporte para editar o mover vértices existentes.
* **FR-GEO-05**: Implementar algoritmo geodésico para cálculo de superficie en $m^2$ y cálculo de distancias por segmento en metros.
* **FR-GEO-06**: Proveer componente de colindancias con selector de orientación (`Norte`, `Sur`, `Este`, `Oeste`, `Noreste`, `Noroeste`, `Sureste`, `Suroeste`), longitud en metros y texto descriptivo libre.
* **FR-GEO-07**: Subir la fotografía de fachada a Supabase Storage en el bucket `expedientes`, guardando su referencia en el predio y creando el registro en `expediente_documentos`.
* **FR-GEO-08**: Soportar selector de lotes múltiples con botón `+ Agregar Lote/Predio` y visualización de todos los polígonos de la escritura en el mapa.
* **FR-GEO-09**: Actualizar `fn_validar_protocolizacion` para confirmar que en actos traslativos exista al menos un predio con geometría válida, emitiendo el cambio al Hub para refrescar el gate.

---

## 4. Requerimientos No Funcionales (NFR)

* **NFR-GEO-01**: Cero errores de hidratación SSR en Nuxt (Leaflet cargado estrictamente del lado del cliente).
* **NFR-GEO-02**: Tiempos de cálculo de área y distancias menores a 50ms en cliente.
* **NFR-GEO-03**: Cobertura de pruebas unitarias para utilidades geométricas, composables y componentes.
