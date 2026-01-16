/**
 * Utilidades para formateo y procesamiento de métricas
 * Extraídas de useAdvancedMetrics (eliminado en optimización Sprint 0)
 */

/**
 * Formatea bytes a unidad legible
 * @param {number} bytes - Cantidad de bytes
 * @param {number} decimals - Decimales a mostrar
 * @returns {string} Tamaño formateado (ej: "1.5 GB")
 */
export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * Formatea bytes/s a unidad legible de velocidad
 * @param {number} bytesPerSec - Bytes por segundo
 * @param {number} decimals - Decimales a mostrar
 * @returns {string} Velocidad formateada (ej: "10.5 MB/s")
 */
export function formatSpeed(bytesPerSec, decimals = 2) {
  if (!bytesPerSec || bytesPerSec === 0) return '0 B/s'
  
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k))
  
  return `${parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * Obtiene color según el porcentaje de uso
 * @param {number} percent - Porcentaje de uso (0-100)
 * @returns {string} Variable CSS de color
 */
export function getUsageColor(percent) {
  if (percent >= 90) return 'var(--status-danger)'
  if (percent >= 75) return 'var(--status-warning)'
  if (percent >= 50) return 'var(--accent-blue)'
  return 'var(--accent-cyan)'
}

/**
 * Obtiene el estado del proceso según el caracter
 * @param {string} state - Caracter de estado (R, S, D, Z, T, I)
 * @returns {string} Nombre del estado
 */
export function getProcessState(state) {
  const states = {
    'R': 'Running',
    'S': 'Sleeping',
    'D': 'Disk Sleep',
    'Z': 'Zombie',
    'T': 'Stopped',
    'I': 'Idle',
  }
  return states[state] || state
}
