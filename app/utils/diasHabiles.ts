import type { EstadoTramite, SemaforoTramite } from '~/types/tramites'

/**
 * Convierte un valor de fecha a objeto Date en UTC medianoche local seguro
 */
function toDate(val: string | Date): Date {
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate())
  }
  const parts = val.split('T')[0].split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, parts[2])
}

/**
 * Formatea un objeto Date a formato YYYY-MM-DD
 */
function toIsoDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Suma días hábiles a una fecha de inicio (excluyendo sábados y domingos)
 */
export function calcularFechaLimiteDiasHabiles(fechaInicio: string | Date, diasHabiles: number): string {
  if (!fechaInicio || diasHabiles <= 0) {
    return typeof fechaInicio === 'string' ? fechaInicio : toIsoDateString(fechaInicio)
  }

  const d = toDate(fechaInicio)
  let diasAgregados = 0

  while (diasAgregados < diasHabiles) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay() // 0 = Domingo, 6 = Sábado
    if (dow !== 0 && dow !== 6) {
      diasAgregados++
    }
  }

  return toIsoDateString(d)
}

/**
 * Calcula los días hábiles restantes entre fechaDesde (por omisión hoy) y fechaHasta
 * Retorna un valor negativo si la fecha límite ya pasó.
 */
export function calcularDiasHabilesRestantes(fechaHasta: string | Date, fechaDesde: string | Date = new Date()): number {
  const inicio = toDate(fechaDesde)
  const fin = toDate(fechaHasta)

  const diffTime = fin.getTime() - inicio.getTime()
  if (diffTime === 0) return 0

  const esNegativo = diffTime < 0
  const dStart = esNegativo ? new Date(fin) : new Date(inicio)
  const dEnd = esNegativo ? new Date(inicio) : new Date(fin)

  let diasHabiles = 0
  const current = new Date(dStart)

  while (current < dEnd) {
    current.setDate(current.getDate() + 1)
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) {
      diasHabiles++
    }
  }

  return esNegativo ? -diasHabiles : diasHabiles
}

export interface ResultadoSemaforo {
  semaforo: SemaforoTramite
  diasRestantes: number
  etiqueta: string
  color: string
}

/**
 * Determina el semáforo normativo de un trámite notarial
 */
export function calcularSemaforoTramite(
  fechaLimite: string | Date | null | undefined,
  estado: EstadoTramite,
  fechaReferencia: string | Date = new Date()
): ResultadoSemaforo {
  if (estado === 'concluido_favorable') {
    return {
      semaforo: 'azul',
      diasRestantes: 0,
      etiqueta: 'Concluido',
      color: 'success'
    }
  }

  if (estado === 'rechazado_cancelado') {
    return {
      semaforo: 'gris',
      diasRestantes: 0,
      etiqueta: 'Cancelado',
      color: 'grey'
    }
  }

  if (estado === 'prevenido_observado') {
    return {
      semaforo: 'rojo',
      diasRestantes: 0,
      etiqueta: 'Prevenido / Observado',
      color: 'error'
    }
  }

  if (!fechaLimite) {
    return {
      semaforo: 'gris',
      diasRestantes: 0,
      etiqueta: estado === 'solicitado' ? 'Solicitado' : 'En proceso',
      color: 'grey'
    }
  }

  const diasRestantes = calcularDiasHabilesRestantes(fechaLimite, fechaReferencia)

  if (diasRestantes < 0) {
    return {
      semaforo: 'rojo',
      diasRestantes,
      etiqueta: `${Math.abs(diasRestantes)}d vencido`,
      color: 'error'
    }
  }

  if (diasRestantes === 0) {
    return {
      semaforo: 'rojo',
      diasRestantes: 0,
      etiqueta: 'Vence hoy',
      color: 'error'
    }
  }

  if (diasRestantes <= 3) {
    return {
      semaforo: 'amarillo',
      diasRestantes,
      etiqueta: `${diasRestantes}d restantes`,
      color: 'warning'
    }
  }

  return {
    semaforo: 'verde',
    diasRestantes,
    etiqueta: `${diasRestantes}d restantes`,
    color: 'success'
  }
}
