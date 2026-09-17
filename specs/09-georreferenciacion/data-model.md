# Modelo de Datos: Feature 09 — Georreferenciación de Predios e Inmuebles Notariales

## 1. Entidad Principal: `public.predios`

```sql
create table if not exists public.predios (
  id uuid primary key default gen_random_uuid(),
  escritura_id uuid not null references public.escrituras(id) on delete cascade,
  etiqueta varchar(100) not null default 'Predio Principal',
  descripcion text,
  superficie_terreno_m2 numeric(14, 2), -- Calculada automáticamente a partir del polígono
  superficie_declarada_m2 numeric(14, 2), -- Superficie legal asentada en título (opcional)
  geometria jsonb not null, -- GeoJSON: { "type": "Polygon", "coordinates": [...] }
  centroide jsonb, -- GeoJSON: { "type": "Point", "coordinates": [lng, lat] }
  colindancias jsonb not null default '[]'::jsonb, -- Arreglo de { orientacion, distancia_m, colinda_con }
  foto_fachada_url text,
  foto_fachada_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_predios_escritura_id on public.predios(escritura_id);
create index if not exists idx_predios_created_at on public.predios(created_at);
```

### Estructura de `colindancias` (JSONB)
```json
[
  {
    "orientacion": "Norte",
    "distancia_m": 12.50,
    "colinda_con": "Con Lote número 14"
  },
  {
    "orientacion": "Sur",
    "distancia_m": 12.50,
    "colinda_con": "Con Calle José María Morelos"
  },
  {
    "orientacion": "Oriente",
    "distancia_m": 25.00,
    "colinda_con": "Con Lote número 12"
  },
  {
    "orientacion": "Poniente",
    "distancia_m": 25.00,
    "colinda_con": "Con Lote número 16"
  }
]
```

### Estructura de `geometria` (GeoJSON Polygon)
```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [-99.133209, 19.432608],
      [-99.132800, 19.432608],
      [-99.132800, 19.432200],
      [-99.133209, 19.432200],
      [-99.133209, 19.432608]
    ]
  ]
}
```

---

## 2. Triggers y Políticas RLS

### Trigger `set_updated_at`
```sql
create trigger trg_predios_updated_at
  before update on public.predios
  for each row execute function public.fn_set_updated_at();
```

### RLS Policies
```sql
alter table public.predios enable row level security;

create policy "predios_select_auth" on public.predios
  for select to authenticated using (true);

create policy "predios_insert_auth" on public.predios
  for insert to authenticated with check (true);

create policy "predios_update_auth" on public.predios
  for update to authenticated using (true) with check (true);

create policy "predios_delete_auth" on public.predios
  for delete to authenticated using (true);
```
