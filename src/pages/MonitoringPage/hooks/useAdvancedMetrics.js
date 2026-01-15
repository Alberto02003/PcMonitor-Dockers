import { useState, useEffect, useCallback, useRef } from 'react'
import { getAdvancedMetrics, isTauri } from '../../../services/tauri.js'

/**
 * Hook para obtener metricas avanzadas del sistema en tiempo real
 * @param {string} connectionId - ID de la conexion SSH
 * @param {number} interval - Intervalo de actualizacion en ms (default: 5000)
 * @returns {Object} { metrics, loading, error, lastUpdate, refresh }
 */
export function useAdvancedMetrics(connectionId, interval = 5000) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const intervalRef = useRef(null)
  const isMountedRef = useRef(true)
  const saveCounterRef = useRef(0)

  const fetchMetrics = useCallback(async () => {
    if (!connectionId || !isTauri()) {
      setLoading(false)
      return
    }

    try {
      // Fetch advanced metrics
      const advancedData = await getAdvancedMetrics(connectionId)
      
      if (isMountedRef.current) {
        setMetrics(advancedData)
        setLastUpdate(new Date())
        setError(null)
        setLoading(false)
        // No database persistence - data only in frontend state
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error fetching advanced metrics:', err)
        setError(err.message || String(err))
        setLoading(false)
      }
    }
  }, [connectionId])

  // Refresh manual
  const refresh = useCallback(() => {
    setLoading(true)
    fetchMetrics()
  }, [fetchMetrics])

  // Setup polling
  useEffect(() => {
    isMountedRef.current = true
    
    if (!connectionId) {
      setLoading(false)
      return
    }

    // Initial fetch
    fetchMetrics()

    // Set up interval
    intervalRef.current = setInterval(fetchMetrics, interval)

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [connectionId, interval, fetchMetrics])

  return {
    metrics,
    loading,
    error,
    lastUpdate,
    refresh,
  }
}

/**
 * Formatea bytes a unidad legible
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
 */
export function formatSpeed(bytesPerSec, decimals = 2) {
  if (!bytesPerSec || bytesPerSec === 0) return '0 B/s'
  
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k))
  
  return `${parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * Obtiene color segun el porcentaje de uso
 */
export function getUsageColor(percent) {
  if (percent >= 90) return 'var(--status-danger)'
  if (percent >= 75) return 'var(--status-warning)'
  if (percent >= 50) return 'var(--accent-blue)'
  return 'var(--accent-cyan)'
}

/**
 * Obtiene el estado del proceso segun el caracter
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

export default useAdvancedMetrics
