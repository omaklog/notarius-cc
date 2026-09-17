<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useSupabaseClient } from '#imports'

const route = useRoute()
const supabase = useSupabaseClient()

const comparecienteId = route.params.id as string

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const activeTab = ref('escrituras')

interface ComparecienteDetail {
  id: string
  nombre: string
  tipo_persona: 'fisica' | 'moral'
  rfc: string | null
  email: string | null
  telefono: string | null
  activo: boolean
  created_at: string
  compareciente_personas_fisicas?: any
  compareciente_personas_morales?: any
}

interface EscrituraHistorialItem {
  id: string
  escritura_id: string
  instrumento: number
  anio: number
  estatus: string
  objeto: string
  fecha_celebracion: string | null
  acto_juridico: string
  rol: string
  porcentaje_participacion: number | null
}

interface RepresentacionMoralItem {
  id: string
  sociedad_id: string
  sociedad_nombre: string
  tipo_facultades: string
  instrumento_poder: string | null
  fecha_poder: string | null
  notario_poder: string | null
  vigente: boolean
}

interface BeneficiarioMoralItem {
  id: string
  sociedad_id: string
  sociedad_nombre: string
  porcentaje_participacion: number
  criterio_control: string
  observaciones: string | null
}

const compareciente = ref<ComparecienteDetail | null>(null)
const escrituras = ref<EscrituraHistorialItem[]>([])
const representaciones = ref<RepresentacionMoralItem[]>([])
const beneficiarios = ref<BeneficiarioMoralItem[]>([])

const pf = computed(() => {
  if (!compareciente.value || compareciente.value.tipo_persona !== 'fisica') return null
  const data = compareciente.value.compareciente_personas_fisicas
  return Array.isArray(data) ? data[0] : data
})

const pm = computed(() => {
  if (!compareciente.value || compareciente.value.tipo_persona !== 'moral') return null
  const data = compareciente.value.compareciente_personas_morales
  return Array.isArray(data) ? data[0] : data
})

const actoFrecuente = computed(() => {
  if (escrituras.value.length === 0) return 'Sin registros'
  const counts: Record<string, number> = {}
  for (const item of escrituras.value) {
    counts[item.acto_juridico] = (counts[item.acto_juridico] || 0) + 1
  }
  let maxCount = 0
  let topActo = 'Sin registros'
  for (const [acto, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count
      topActo = acto
    }
  }
  return topActo
})

const ultimaComparecencia = computed(() => {
  if (escrituras.value.length === 0) return 'Ninguna'
  const fechas = escrituras.value
    .map((e) => e.fecha_celebracion)
    .filter((f): f is string => Boolean(f))
    .sort()
    .reverse()
  return fechas[0] || 'En trámite'
})

async function cargarFicha(): Promise<void> {
  loading.value = true
  errorMessage.value = null

  try {
    // 1. Datos raíz y entidad hija
    const { data: compData, error: compErr } = await supabase
      .from('comparecientes')
      .select(`
        id,
        nombre,
        tipo_persona,
        rfc,
        email,
        telefono,
        activo,
        created_at,
        compareciente_personas_fisicas (
          nombres,
          primer_apellido,
          segundo_apellido,
          curp,
          fecha_nacimiento,
          genero,
          pais_nacimiento,
          nacionalidad,
          estado_civil,
          regimen_patrimonial_id,
          regimenes_patrimoniales(nombre),
          ocupacion,
          tipo_identificacion_id,
          tipos_identificacion_oficial(nombre),
          folio_identificacion,
          vigencia_identificacion,
          calle,
          numero_exterior,
          numero_interior,
          colonia,
          codigo_postal,
          municipio,
          entidad_federativa,
          pais
        ),
        compareciente_personas_morales (
          razon_social,
          fecha_constitucion,
          nacionalidad,
          folio_mercantil,
          instrumento_constitutivo,
          fecha_instrumento,
          notario_constitucion,
          plaza_constitucion,
          objeto_social,
          calle,
          numero_exterior,
          numero_interior,
          colonia,
          codigo_postal,
          municipio,
          entidad_federativa,
          pais
        )
      `)
      .eq('id', comparecienteId)
      .single()

    if (compErr) throw compErr
    compareciente.value = compData as ComparecienteDetail

    // 2. Historial de escrituras participadas
    const { data: escData, error: escErr } = await supabase
      .from('escritura_comparecientes')
      .select(`
        id,
        porcentaje_participacion,
        roles_compareciente(nombre),
        escrituras(
          id,
          instrumento,
          anio,
          estatus,
          objeto,
          fecha_celebracion,
          actos_juridicos(nombre)
        )
      `)
      .eq('compareciente_id', comparecienteId)

    if (escErr) throw escErr

    escrituras.value = (escData ?? [])
      .map((row: any) => {
        const esc = Array.isArray(row.escrituras) ? row.escrituras[0] : row.escrituras
        const rol = Array.isArray(row.roles_compareciente) ? row.roles_compareciente[0] : row.roles_compareciente
        const acto = Array.isArray(esc?.actos_juridicos) ? esc.actos_juridicos[0] : esc?.actos_juridicos
        if (!esc) return null
        return {
          id: row.id,
          escritura_id: esc.id,
          instrumento: esc.instrumento,
          anio: esc.anio,
          estatus: esc.estatus,
          objeto: esc.objeto,
          fecha_celebracion: esc.fecha_celebracion,
          acto_juridico: acto?.nombre ?? 'No especificado',
          rol: rol?.nombre ?? 'Otorgante',
          porcentaje_participacion: row.porcentaje_participacion,
        }
      })
      .filter((item): item is EscrituraHistorialItem => item !== null)
      .sort((a, b) => b.instrumento - a.instrumento)

    // 3. Representaciones y Beneficiarios
    if (compareciente.value.tipo_persona === 'moral') {
      const { data: reps } = await supabase
        .from('compareciente_representantes')
        .select(`
          id,
          representante_fisica_id,
          tipo_facultades,
          instrumento_poder,
          fecha_poder,
          notario_poder,
          vigente,
          representante:comparecientes!representante_fisica_id(nombre)
        `)
        .eq('persona_moral_id', comparecienteId)

      representaciones.value = (reps ?? []).map((r: any) => ({
        id: r.id,
        sociedad_id: comparecienteId,
        sociedad_nombre: r.representante?.nombre ?? 'Apoderado Legal',
        tipo_facultades: r.tipo_facultades,
        instrumento_poder: r.instrumento_poder,
        fecha_poder: r.fecha_poder,
        notario_poder: r.notario_poder,
        vigente: r.vigente,
      }))

      const { data: bcs } = await supabase
        .from('compareciente_beneficiarios_controladores')
        .select(`
          id,
          beneficiario_fisica_id,
          porcentaje_participacion,
          criterio_control,
          observaciones,
          beneficiario:comparecientes!beneficiario_fisica_id(nombre)
        `)
        .eq('persona_moral_id', comparecienteId)

      beneficiarios.value = (bcs ?? []).map((b: any) => ({
        id: b.id,
        sociedad_id: comparecienteId,
        sociedad_nombre: b.beneficiario?.nombre ?? 'Beneficiario Controlador',
        porcentaje_participacion: Number(b.porcentaje_participacion),
        criterio_control: b.criterio_control,
        observaciones: b.observaciones,
      }))
    } else {
      // Si es física, buscar en qué sociedades participa como apoderado
      const { data: reps } = await supabase
        .from('compareciente_representantes')
        .select(`
          id,
          persona_moral_id,
          tipo_facultades,
          instrumento_poder,
          fecha_poder,
          notario_poder,
          vigente,
          sociedad:comparecientes!persona_moral_id(nombre)
        `)
        .eq('representante_fisica_id', comparecienteId)

      representaciones.value = (reps ?? []).map((r: any) => ({
        id: r.id,
        sociedad_id: r.persona_moral_id,
        sociedad_nombre: r.sociedad?.nombre ?? 'Sociedad',
        tipo_facultades: r.tipo_facultades,
        instrumento_poder: r.instrumento_poder,
        fecha_poder: r.fecha_poder,
        notario_poder: r.notario_poder,
        vigente: r.vigente,
      }))
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Error al cargar la ficha notarial del compareciente'
  } finally {
    loading.value = false
  }
}

function getIniciales(nombre: string): string {
  if (!nombre) return 'C'
  const partes = nombre.trim().split(/\s+/)
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
  }
  return nombre.substring(0, 2).toUpperCase()
}

onMounted(cargarFicha)
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Navegación superior -->
    <div class="mb-4">
      <v-btn
        to="/comparecientes"
        variant="text"
        prepend-icon="mdi-arrow-left"
        color="primary"
        density="comfortable"
      >
        Volver al Directorio de Comparecientes
      </v-btn>
    </div>

    <!-- Feedback de Error -->
    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-6"
    >
      {{ errorMessage }}
    </v-alert>

    <!-- Estado de Carga -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" class="mb-3" />
      <div class="text-body-2 text-medium-emphasis">
        Cargando expediente notarial 360°...
      </div>
    </div>

    <div v-else-if="compareciente">
      <!-- Banner / Header de la Ficha Notarial 360° -->
      <v-card variant="outlined" class="pa-6 mb-6 bg-surface">
        <div class="d-flex flex-wrap align-center justify-space-between ga-4">
          <div class="d-flex align-center">
            <v-avatar
              :color="compareciente.tipo_persona === 'fisica' ? 'primary' : 'secondary'"
              variant="tonal"
              size="64"
              class="mr-4 font-weight-bold text-h6"
            >
              {{ getIniciales(compareciente.nombre) }}
            </v-avatar>
            <div>
              <div class="d-flex align-center ga-2 flex-wrap mb-1">
                <h1 class="text-h5 font-weight-bold text-primary mb-0">
                  {{ compareciente.nombre }}
                </h1>
                <v-chip
                  :color="compareciente.tipo_persona === 'fisica' ? 'primary' : 'secondary'"
                  size="small"
                  variant="flat"
                  class="font-weight-bold text-uppercase"
                >
                  {{ compareciente.tipo_persona === 'fisica' ? 'Persona Física' : 'Persona Moral' }}
                </v-chip>
                <v-chip color="success" size="small" variant="tonal" prepend-icon="mdi-shield-check">
                  Expediente Conforme
                </v-chip>
              </div>

              <!-- Metadatos Rápidos en Línea -->
              <div class="d-flex flex-wrap align-center ga-4 text-body-2 text-medium-emphasis">
                <span v-if="compareciente.rfc">
                  RFC: <strong style="font-family: monospace;" class="text-high-emphasis">{{ compareciente.rfc }}</strong>
                </span>
                <span v-if="pf?.curp">
                  CURP: <strong style="font-family: monospace;" class="text-high-emphasis">{{ pf.curp }}</strong>
                </span>
                <span v-if="pm?.folio_mercantil">
                  FME: <strong style="font-family: monospace;" class="text-high-emphasis">{{ pm.folio_mercantil }}</strong>
                </span>
                <span v-if="pf?.estado_civil">
                  Estado Civil: <strong class="text-capitalize text-high-emphasis">{{ pf.estado_civil }}</strong>
                </span>
                <span v-if="pf?.ocupacion">
                  Ocupación: <strong class="text-high-emphasis">{{ pf.ocupacion }}</strong>
                </span>
              </div>
            </div>
          </div>

          <div class="d-flex align-center ga-2">
            <v-btn
              to="/comparecientes"
              variant="outlined"
              color="primary"
              prepend-icon="mdi-pencil-outline"
            >
              Editar en Padrón
            </v-btn>
          </div>
        </div>
      </v-card>

      <!-- Métricas de Actividad Protocolar -->
      <v-row class="mb-6">
        <v-col cols="12" sm="4">
          <v-card variant="outlined" class="pa-4 bg-surface">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">ESCRITURAS OTORGADAS</div>
                <div class="text-h5 font-weight-bold mt-1 text-primary">
                  {{ escrituras.length }}
                </div>
              </div>
              <v-avatar color="primary" variant="tonal" rounded="lg">
                <v-icon icon="mdi-book-open-outline" />
              </v-avatar>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card variant="outlined" class="pa-4 bg-surface">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">ACTO MÁS FRECUENTE</div>
                <div class="text-h6 font-weight-bold mt-1 text-high-emphasis text-truncate" style="max-width: 220px;">
                  {{ actoFrecuente }}
                </div>
              </div>
              <v-avatar color="secondary" variant="tonal" rounded="lg">
                <v-icon icon="mdi-file-certificate-outline" />
              </v-avatar>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card variant="outlined" class="pa-4 bg-surface">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">ÚLTIMA COMPARECENCIA</div>
                <div class="text-h6 font-weight-bold mt-1 text-high-emphasis">
                  {{ ultimaComparecencia }}
                </div>
              </div>
              <v-avatar color="success" variant="tonal" rounded="lg">
                <v-icon icon="mdi-calendar-check" />
              </v-avatar>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Pestañas Notariales 360° -->
      <v-card variant="outlined">
        <v-tabs v-model="activeTab" color="primary" density="comfortable">
          <v-tab value="escrituras" prepend-icon="mdi-file-document-multiple-outline">
            Historial de Escrituras ({{ escrituras.length }})
          </v-tab>
          <v-tab value="datos" prepend-icon="mdi-card-account-details-outline">
            Datos Notariales y Domicilio
          </v-tab>
          <v-tab value="representaciones" prepend-icon="mdi-account-tie-outline">
            Poderes y Cumplimiento
          </v-tab>
        </v-tabs>
        <v-divider />

        <v-window v-model="activeTab" class="pa-4">
          <!-- Pestaña 1: Historial de Escrituras -->
          <v-window-item value="escrituras">
            <div v-if="escrituras.length === 0" class="pa-8 text-center bg-surface">
              <v-icon icon="mdi-file-document-outline" size="48" color="medium-emphasis" class="mb-2" />
              <h3 class="text-subtitle-1 font-weight-bold mb-1">
                Sin escrituras formalizadas
              </h3>
              <p class="text-caption text-medium-emphasis mb-0">
                Este compareciente aún no ha sido asociado a ningún instrumento notarial del protocolo.
              </p>
            </div>

            <v-table v-else density="comfortable" hover>
              <thead>
                <tr>
                  <th>Instrumento</th>
                  <th>Año</th>
                  <th>Acto Jurídico</th>
                  <th>Objeto</th>
                  <th>Rol Desempeñado</th>
                  <th>Alícuota / %</th>
                  <th>Estatus</th>
                  <th class="text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="esc in escrituras" :key="esc.id">
                  <td class="font-weight-bold text-primary">
                    #{{ esc.instrumento }}
                  </td>
                  <td>{{ esc.anio }}</td>
                  <td>
                    <v-chip size="small" color="primary" variant="outlined">
                      {{ esc.acto_juridico }}
                    </v-chip>
                  </td>
                  <td class="text-caption text-truncate" style="max-width: 250px;">
                    {{ esc.objeto }}
                  </td>
                  <td>
                    <span class="font-weight-medium">{{ esc.rol }}</span>
                  </td>
                  <td>
                    <span v-if="esc.porcentaje_participacion !== null" class="font-weight-bold">
                      {{ Number(esc.porcentaje_participacion).toFixed(2) }}%
                    </span>
                    <span v-else class="text-medium-emphasis">—</span>
                  </td>
                  <td>
                    <v-chip
                      :color="esc.estatus === 'protocolizada' ? 'success' : (esc.estatus === 'borrador' ? 'warning' : 'error')"
                      size="x-small"
                      variant="flat"
                    >
                      {{ esc.estatus }}
                    </v-chip>
                  </td>
                  <td class="text-right">
                    <v-btn
                      icon="mdi-eye-outline"
                      size="small"
                      variant="text"
                      color="primary"
                      title="Ver instrumento"
                      :to="`/escrituras/${esc.escritura_id}`"
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>

          <!-- Pestaña 2: Datos Notariales y Domicilio -->
          <v-window-item value="datos">
            <v-row>
              <!-- Filiación / Constitución -->
              <v-col cols="12" md="6">
                <v-card variant="outlined" class="pa-4 h-100">
                  <div class="text-subtitle-2 font-weight-bold text-primary mb-3 d-flex align-center">
                    <v-icon icon="mdi-badge-account-horizontal-outline" class="mr-2" size="small" />
                    {{ compareciente.tipo_persona === 'fisica' ? 'Identificación y Filiación' : 'Datos Constitutivos' }}
                  </div>

                  <div v-if="compareciente.tipo_persona === 'fisica'">
                    <div class="mb-2"><span class="text-medium-emphasis text-caption">Nombre completo:</span> <div>{{ compareciente.nombre }}</div></div>
                    <div class="mb-2"><span class="text-medium-emphasis text-caption">RFC:</span> <div style="font-family: monospace;">{{ compareciente.rfc || '—' }}</div></div>
                    <div class="mb-2"><span class="text-medium-emphasis text-caption">CURP:</span> <div style="font-family: monospace;">{{ pf?.curp || '—' }}</div></div>
                    <div class="mb-2"><span class="text-medium-emphasis text-caption">Fecha de Nacimiento:</span> <div>{{ pf?.fecha_nacimiento || '—' }} ({{ pf?.genero === 'M' ? 'Masculino' : (pf?.genero === 'F' ? 'Femenino' : 'Otro') }})</div></div>
                    <div class="mb-2"><span class="text-medium-emphasis text-caption">Nacionalidad:</span> <div>{{ pf?.nacionalidad || 'Mexicana' }}</div></div>
                    <div class="mb-2">
                      <span class="text-medium-emphasis text-caption">Estado Civil y Régimen:</span>
                      <div>
                        {{ pf?.estado_civil || '—' }}
                        <span v-if="pf?.regimenes_patrimoniales"> ({{ pf.regimenes_patrimoniales.nombre }})</span>
                      </div>
                    </div>
                    <div>
                      <span class="text-medium-emphasis text-caption">Identificación Oficial:</span>
                      <div>
                        {{ pf?.tipos_identificacion_oficial?.nombre || 'No registrada' }}
                        <span v-if="pf?.folio_identificacion"> · Folio: {{ pf.folio_identificacion }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-else>
                    <div class="mb-2"><span class="text-medium-emphasis text-caption">Razón Social:</span> <div>{{ compareciente.nombre }}</div></div>
                    <div class="mb-2"><span class="text-medium-emphasis text-caption">RFC:</span> <div style="font-family: monospace;">{{ compareciente.rfc || '—' }}</div></div>
                    <div class="mb-2"><span class="text-medium-emphasis text-caption">Folio Mercantil (RPC):</span> <div>{{ pm?.folio_mercantil || '—' }}</div></div>
                    <div class="mb-2"><span class="text-medium-emphasis text-caption">Fecha de Constitución:</span> <div>{{ pm?.fecha_constitucion || '—' }}</div></div>
                    <div class="mb-2"><span class="text-medium-emphasis text-caption">Instrumento Constitutivo:</span> <div>{{ pm?.instrumento_constitutivo || '—' }} ({{ pm?.fecha_instrumento || 'Sin fecha' }})</div></div>
                    <div class="mb-2"><span class="text-medium-emphasis text-caption">Fedatario y Plaza:</span> <div>{{ pm?.notario_constitucion || '—' }} · {{ pm?.plaza_constitucion || '—' }}</div></div>
                    <div><span class="text-medium-emphasis text-caption">Objeto Social:</span> <div class="text-caption">{{ pm?.objeto_social || '—' }}</div></div>
                  </div>
                </v-card>
              </v-col>

              <!-- Domicilio y Contacto -->
              <v-col cols="12" md="6">
                <v-card variant="outlined" class="pa-4 h-100">
                  <div class="text-subtitle-2 font-weight-bold text-primary mb-3 d-flex align-center">
                    <v-icon icon="mdi-map-marker-outline" class="mr-2" size="small" />
                    Domicilio y Notificaciones
                  </div>

                  <div class="mb-3">
                    <span class="text-medium-emphasis text-caption">Domicilio Notarial Asentado:</span>
                    <div class="font-weight-medium">
                      {{ (compareciente.tipo_persona === 'fisica' ? pf?.calle : pm?.calle) || 'Calle no registrada' }}
                      <span v-if="(compareciente.tipo_persona === 'fisica' ? pf?.numero_exterior : pm?.numero_exterior)">
                        No. {{ compareciente.tipo_persona === 'fisica' ? pf?.numero_exterior : pm?.numero_exterior }}
                      </span>
                      <span v-if="(compareciente.tipo_persona === 'fisica' ? pf?.numero_interior : pm?.numero_interior)">
                        Int. {{ compareciente.tipo_persona === 'fisica' ? pf?.numero_interior : pm?.numero_interior }}
                      </span>
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      Col. {{ (compareciente.tipo_persona === 'fisica' ? pf?.colonia : pm?.colonia) || '—' }},
                      C.P. {{ (compareciente.tipo_persona === 'fisica' ? pf?.codigo_postal : pm?.codigo_postal) || '—' }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ (compareciente.tipo_persona === 'fisica' ? pf?.municipio : pm?.municipio) || '—' }},
                      {{ (compareciente.tipo_persona === 'fisica' ? pf?.entidad_federativa : pm?.entidad_federativa) || '—' }}
                    </div>
                  </div>

                  <v-divider class="my-3" />

                  <div>
                    <div class="text-subtitle-2 font-weight-bold text-primary mb-2 d-flex align-center">
                      <v-icon icon="mdi-phone-outline" class="mr-2" size="small" />
                      Canales de Contacto
                    </div>
                    <div class="mb-2">
                      <span class="text-medium-emphasis text-caption">Teléfono:</span>
                      <div>{{ compareciente.telefono || 'No registrado' }}</div>
                    </div>
                    <div>
                      <span class="text-medium-emphasis text-caption">Correo Electrónico:</span>
                      <div>{{ compareciente.email || 'No registrado' }}</div>
                    </div>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- Pestaña 3: Representaciones y Cumplimiento -->
          <v-window-item value="representaciones">
            <!-- Si es persona moral: apoderados y beneficiarios -->
            <div v-if="compareciente.tipo_persona === 'moral'">
              <h3 class="text-subtitle-2 font-weight-bold text-primary mb-2">
                Apoderados y Representantes Legales
              </h3>
              <v-table density="compact" class="border rounded mb-6">
                <thead>
                  <tr>
                    <th>Apoderado</th>
                    <th>Facultades</th>
                    <th>Instrumento</th>
                    <th>Vigente</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="representaciones.length === 0">
                    <td colspan="4" class="text-center text-medium-emphasis py-3">
                      Sin representantes legales vinculados
                    </td>
                  </tr>
                  <tr v-for="r in representaciones" :key="r.id">
                    <td class="font-weight-medium">{{ r.sociedad_nombre }}</td>
                    <td><v-chip size="x-small" color="primary" variant="outlined">{{ r.tipo_facultades }}</v-chip></td>
                    <td class="text-caption">{{ r.instrumento_poder || '—' }}</td>
                    <td>
                      <v-chip :color="r.vigente ? 'success' : 'grey'" size="x-small" variant="flat">
                        {{ r.vigente ? 'Sí' : 'No' }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <h3 class="text-subtitle-2 font-weight-bold text-secondary mb-2">
                Beneficiarios Controladores (CFF Art. 32-B Quáter)
              </h3>
              <v-table density="compact" class="border rounded">
                <thead>
                  <tr>
                    <th>Beneficiario Controlador</th>
                    <th>Participación (%)</th>
                    <th>Criterio de Control</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="beneficiarios.length === 0">
                    <td colspan="4" class="text-center text-medium-emphasis py-3">
                      Sin beneficiarios controladores declarados
                    </td>
                  </tr>
                  <tr v-for="b in beneficiarios" :key="b.id">
                    <td class="font-weight-medium">{{ b.sociedad_nombre }}</td>
                    <td>
                      <v-chip size="x-small" color="secondary" variant="flat">
                        {{ b.porcentaje_participacion }}%
                      </v-chip>
                    </td>
                    <td class="text-caption">{{ b.criterio_control }}</td>
                    <td class="text-caption text-medium-emphasis">{{ b.observaciones || '—' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <!-- Si es persona física: sociedades donde comparece como apoderado -->
            <div v-else>
              <h3 class="text-subtitle-2 font-weight-bold text-primary mb-2">
                Sociedades donde ejerce Representación Legal
              </h3>
              <v-table density="compact" class="border rounded">
                <thead>
                  <tr>
                    <th>Sociedad Mercantil / Civil</th>
                    <th>Facultades Otorgadas</th>
                    <th>Instrumento de Poder</th>
                    <th>Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="representaciones.length === 0">
                    <td colspan="4" class="text-center text-medium-emphasis py-4">
                      Esta persona física no tiene representaciones legales activas registradas en el padrón.
                    </td>
                  </tr>
                  <tr v-for="r in representaciones" :key="r.id">
                    <td class="font-weight-medium">{{ r.sociedad_nombre }}</td>
                    <td><v-chip size="x-small" color="primary" variant="outlined">{{ r.tipo_facultades }}</v-chip></td>
                    <td class="text-caption">{{ r.instrumento_poder || '—' }}</td>
                    <td>
                      <v-chip :color="r.vigente ? 'success' : 'grey'" size="x-small" variant="flat">
                        {{ r.vigente ? 'Vigente' : 'Inactivo' }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-window-item>
        </v-window>
      </v-card>
    </div>
  </v-container>
</template>
