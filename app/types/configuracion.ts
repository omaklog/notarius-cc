export interface ConfiguracionNotarial {
  id: string
  numero_notaria: number
  entidad_federativa: string
  municipio: string
  distrito_judicial?: string | null

  notario_titular_nombre: string
  notario_titular_titulo?: string | null
  patente_fiat_numero?: string | null
  patente_fiat_fecha?: string | null
  notario_suplente_nombre?: string | null
  regimen_asociacion?: string | null

  domicilio_calle?: string | null
  domicilio_num_ext?: string | null
  domicilio_num_int?: string | null
  domicilio_colonia?: string | null
  domicilio_codigo_postal?: string | null

  telefono_principal?: string | null
  telefono_secundario?: string | null
  correo_contacto?: string | null
  sitio_web?: string | null

  logotipo_url?: string | null
  sello_notarial_url?: string | null

  leyenda_encabezado?: string | null
  leyenda_lema?: string | null
  leyenda_cierre_volumen?: string | null

  updated_at?: string
  updated_by?: string | null
}

export type ActualizarConfiguracionPayload = Partial<Omit<ConfiguracionNotarial, 'id' | 'updated_at' | 'updated_by'>>
