/**
 * Hook useMetricsHistory - Gestión de histórico de métricas
 * 
 * Fase 4.2 - Histórico de Métricas
 * 
 * Features:
 * - Almacenamiento de métricas en el tiempo
 * - Límite de retención configurable
 * - Cálculo de estadísticas (min, max, avg)
 * - Limpieza automática de datos antiguos
 * - Exportación a JSON/CSV
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const DEFAULT_RETENTION = 24 * 60 * 60 * 1000 // 24 horas en ms
const DEFAULT_MAX_POINTS = 1000 // Máximo de puntos a almacenar
const STORAGE_KEY_PREFIX = 'pcmd.metrics.history.v1'

/**
 * Obtiene la clave de almacenamiento para una conexión
 * @param {string} connectionId 
 * @returns {string}
 */
function getStorageKey(connectionId) {
  return `${STORAGE_KEY_PREFIX}.${connectionId || 'default'}`
}

/**
 * Carga el histórico desde localStorage
 * @param {string} connectionId 
 * @returns {Array}
 */
function loadHistory(connectionId) {
  if (typeof window === 'undefined') return []
  
  try {
    const key = getStorageKey(connectionId)
    const stored = localStorage.getItem(key)
    if (!stored) return []
    
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('Error loading metrics history:', error)
    return []
  }
}

/**
 * Guarda el histórico en localStorage
 * @param {string} connectionId 
 * @param {Array} history 
 */
function saveHistory(connectionId, history) {
  if (typeof window === 'undefined') return
  
  try {
    const key = getStorageKey(connectionId)
    localStorage.setItem(key, JSON.stringify(history))
  } catch (error) {
    console.warn('Error saving metrics history:', error)
  }
}

/**
 * Limpia entradas antiguas del histórico
 * @param {Array} history 
 * @param {number} retentionMs 
 * @param {number} maxPoints 
 * @returns {Array}
 */
function cleanOldEntries(history, retentionMs, maxPoints) {
  const now = Date.now()
  const cutoff = now - retentionMs
  
  // Filtrar por tiempo
  let cleaned = history.filter(entry => entry.timestamp > cutoff)
  
  // Limitar por cantidad
  if (cleaned.length > maxPoints) {
    cleaned = cleaned.slice(-maxPoints)
  }
  
  return cleaned
}

/**
 * Calcula estadísticas de una serie de valores
 * @param {Array<number>} values 
 * @returns {{min: number, max: number, avg: number, count: number}}
 */
function calculateStats(values) {
  if (!values || values.length === 0) {
    return { min: 0, max: 0, avg: 0, count: 0 }
  }
  
  const min = Math.min(...values)
  const max = Math.max(...values)
  const sum = values.reduce((acc, val) => acc + val, 0)
  const avg = sum / values.length
  
  return {
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    avg: parseFloat(avg.toFixed(2)),
    count: values.length,
  }
}

/**
 * Hook para gestionar el histórico de métricas
 * 
 * @param {string} connectionId - ID de la conexión
 * @param {Object} options - Opciones de configuración
 * @param {number} options.retention - Tiempo de retención en ms
 * @param {number} options.maxPoints - Máximo de puntos a almacenar
 * @param {boolean} options.autoSave - Guardar automáticamente
 * @returns {{
 *   history: Array,
 *   addMetrics: (metrics: Object) => void,
 *   clear: () => void,
 *   getStats: (key: string, timeRange?: number) => Object,
 *   getTimeSeries: (key: string, timeRange?: number) => Array,
 *   exportToJSON: () => string,
 *   exportToCSV: () => string,
 *   size: number
 * }}
 */
export function useMetricsHistory(connectionId, options = {}) {
  const {
    retention = DEFAULT_RETENTION,
    maxPoints = DEFAULT_MAX_POINTS,
    autoSave = true,
  } = options

  const [history, setHistory] = useState(() => loadHistory(connectionId))
  const cleanupTimerRef = useRef(null)

  // Guardar automáticamente cuando cambia el histórico
  useEffect(() => {
    if (autoSave && connectionId) {
      saveHistory(connectionId, history)
    }
  }, [history, connectionId, autoSave])

  // Limpiar datos antiguos periódicamente
  useEffect(() => {
    const cleanup = () => {
      setHistory(prev => cleanOldEntries(prev, retention, maxPoints))
    }

    // Limpiar cada 5 minutos
    cleanupTimerRef.current = setInterval(cleanup, 5 * 60 * 1000)
    
    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current)
      }
    }
  }, [retention, maxPoints])

  // Cargar histórico cuando cambia la conexión
  useEffect(() => {
    setHistory(loadHistory(connectionId))
  }, [connectionId])

  /**
   * Agregar nuevas métricas al histórico
   * @param {Object} metrics - Métricas a agregar
   */
  const addMetrics = useCallback((metrics) => {
    if (!metrics) return

    const entry = {
      timestamp: Date.now(),
      ...metrics,
    }

    setHistory(prev => {
      const updated = [...prev, entry]
      return cleanOldEntries(updated, retention, maxPoints)
    })
  }, [retention, maxPoints])

  /**
   * Limpiar todo el histórico
   */
  const clear = useCallback(() => {
    setHistory([])
    if (connectionId) {
      try {
        localStorage.removeItem(getStorageKey(connectionId))
      } catch (error) {
        console.warn('Error clearing metrics history:', error)
      }
    }
  }, [connectionId])

  /**
   * Obtener estadísticas de una métrica específica
   * @param {string} key - Clave de la métrica (ej: 'cpu.usage')
   * @param {number} timeRange - Rango de tiempo en ms (opcional)
   * @returns {Object} Estadísticas
   */
  const getStats = useCallback((key, timeRange = null) => {
    let data = history

    // Filtrar por rango de tiempo si se especifica
    if (timeRange) {
      const cutoff = Date.now() - timeRange
      data = data.filter(entry => entry.timestamp > cutoff)
    }

    // Extraer valores de la clave
    const values = data
      .map(entry => {
        // Soportar claves anidadas como 'cpu.usage'
        const keys = key.split('.')
        let value = entry
        for (const k of keys) {
          value = value?.[k]
        }
        return value
      })
      .filter(val => typeof val === 'number' && !isNaN(val))

    return calculateStats(values)
  }, [history])

  /**
   * Obtener serie temporal de una métrica
   * @param {string} key - Clave de la métrica
   * @param {number} timeRange - Rango de tiempo en ms (opcional)
   * @returns {Array<{timestamp: number, value: number}>}
   */
  const getTimeSeries = useCallback((key, timeRange = null) => {
    let data = history

    if (timeRange) {
      const cutoff = Date.now() - timeRange
      data = data.filter(entry => entry.timestamp > cutoff)
    }

    return data
      .map(entry => {
        const keys = key.split('.')
        let value = entry
        for (const k of keys) {
          value = value?.[k]
        }
        return {
          timestamp: entry.timestamp,
          value: typeof value === 'number' && !isNaN(value) ? value : null,
        }
      })
      .filter(item => item.value !== null)
  }, [history])

  /**
   * Exportar histórico a JSON
   * @returns {string}
   */
  const exportToJSON = useCallback(() => {
    return JSON.stringify(history, null, 2)
  }, [history])

  /**
   * Exportar histórico a CSV
   * @returns {string}
   */
  const exportToCSV = useCallback(() => {
    if (history.length === 0) return ''

    // Obtener todas las claves
    const allKeys = new Set()
    history.forEach(entry => {
      Object.keys(entry).forEach(key => allKeys.add(key))
    })
    const keys = Array.from(allKeys).sort()

    // Crear encabezado
    const header = keys.join(',')

    // Crear filas
    const rows = history.map(entry => {
      return keys.map(key => {
        const value = entry[key]
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value)
      }).join(',')
    })

    return [header, ...rows].join('\n')
  }, [history])

  return {
    history,
    addMetrics,
    clear,
    getStats,
    getTimeSeries,
    exportToJSON,
    exportToCSV,
    size: history.length,
  }
}

export default useMetricsHistory
