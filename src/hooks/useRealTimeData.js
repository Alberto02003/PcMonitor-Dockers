/**
 * Hooks para obtener datos en tiempo real via SSH
 * 
 * OPTIMIZADO (2026-01-16):
 * - useRealTimeData: Hook unificado con Promise.all (RECOMENDADO)
 * - useRealTimeMetrics: Legacy hook (para backward compatibility)
 * - useRealTimeContainers: Legacy hook (para backward compatibility)
 * - useRealTimeLogs: Hook especializado para logs de Docker
 * 
 * REGLAS DE VERCEL APLICADAS:
 * - async-parallel: Promise.all para peticiones paralelas
 * - client-swr-dedup: Deduplicación de requests
 * - rerender-dependencies: useRef para estabilizar dependencias
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { 
  getSystemMetrics, 
  getAdvancedMetrics,
  dockerList, 
  dockerLogs,
  dockerImages,
  dockerVolumes,
  isTauri 
} from '../services/tauri.js'

/**
 * Calcula el MCD (Máximo Común Divisor) para sincronizar intervalos
 */
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

// ============================================================================
// HOOK UNIFICADO (RECOMENDADO) - Usa este en componentes nuevos
// ============================================================================

/**
 * Hook unificado de datos en tiempo real
 * Consolida métricas básicas, avanzadas y contenedores en un solo polling
 * 
 * OPTIMIZACIÓN: Reduce de 3 timers a 1, usa Promise.all para paralelismo
 * 
 * @param {string} connectionId - ID de la conexión SSH
 * @param {Object} options - Opciones de configuración
 * @param {number} options.metricsInterval - Intervalo para métricas básicas (ms)
 * @param {number} options.advancedInterval - Intervalo para métricas avanzadas (ms)
 * @param {number} options.containersInterval - Intervalo para contenedores Docker (ms)
 * @returns {Object} Estado consolidado de todos los datos
 */
export function useRealTimeData(connectionId, options = {}) {
  const {
    metricsInterval = 5000,
    advancedInterval = 5000,
    containersInterval = 10000,
  } = options

  // Estado para cada tipo de dato
  const [metrics, setMetrics] = useState(null)
  const [advancedMetrics, setAdvancedMetrics] = useState(null)
  const [containers, setContainers] = useState([])
  
  // Estados de loading individuales
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [advancedLoading, setAdvancedLoading] = useState(true)
  const [containersLoading, setContainersLoading] = useState(true)
  
  // Estados de error individuales
  const [metricsError, setMetricsError] = useState(null)
  const [advancedError, setAdvancedError] = useState(null)
  const [containersError, setContainersError] = useState(null)
  
  const [lastUpdate, setLastUpdate] = useState(null)

  // Refs para valores estables (OPTIMIZACIÓN: evita re-renders)
  const connectionIdRef = useRef(connectionId)
  const isMountedRef = useRef(true)
  const intervalRef = useRef(null)
  const tickCountRef = useRef(0)
  const fetchCountRef = useRef(0)

  // Actualizar ref cuando cambia connectionId
  useEffect(() => {
    connectionIdRef.current = connectionId
  }, [connectionId])

  /**
   * Función de fetch unificada con Promise.all
   * OPTIMIZACIÓN: Todas las peticiones SSH en paralelo
   */
  const fetchAllData = useCallback(async () => {
    const connId = connectionIdRef.current
    
    if (!connId || !isTauri()) {
      if (!isTauri()) {
        setMetricsError('Esta aplicación solo funciona en Tauri')
        setAdvancedError('Esta aplicación solo funciona en Tauri')
        setContainersError('Esta aplicación solo funciona en Tauri')
      }
      setMetricsLoading(false)
      setAdvancedLoading(false)
      setContainersLoading(false)
      return
    }

    const tick = tickCountRef.current

    try {
      // Determinar qué datos necesitamos fetch en este tick
      const baseInterval = gcd(gcd(metricsInterval, advancedInterval), containersInterval)
      const shouldFetchMetrics = tick % (metricsInterval / baseInterval) === 0
      const shouldFetchAdvanced = tick % (advancedInterval / baseInterval) === 0
      const shouldFetchContainers = tick % (containersInterval / baseInterval) === 0

      // Construir array de promesas solo para lo que necesitamos
      const promises = []
      const tasks = []

      if (shouldFetchMetrics) {
        promises.push(getSystemMetrics(connId))
        tasks.push('metrics')
      } else {
        promises.push(null)
        tasks.push(null)
      }

      if (shouldFetchAdvanced) {
        promises.push(getAdvancedMetrics(connId))
        tasks.push('advanced')
      } else {
        promises.push(null)
        tasks.push(null)
      }

      if (shouldFetchContainers) {
        promises.push(dockerList(connId, true))
        tasks.push('containers')
      } else {
        promises.push(null)
        tasks.push(null)
      }

      // OPTIMIZACIÓN: Promise.all para fetch paralelo
      const results = await Promise.all(
        promises.map(p => 
          p === null 
            ? Promise.resolve(null) 
            : p.catch(err => ({ error: err }))
        )
      )

      // Procesar resultados si el componente sigue montado
      if (!isMountedRef.current) return

      // Métricas básicas
      if (tasks[0] === 'metrics') {
        if (results[0]?.error) {
          setMetricsError(results[0].error.toString())
        } else if (results[0]) {
          setMetrics(results[0])
          setMetricsError(null)
        }
        setMetricsLoading(false)
      }

      // Métricas avanzadas
      if (tasks[1] === 'advanced') {
        if (results[1]?.error) {
          setAdvancedError(results[1].error.toString())
        } else if (results[1]) {
          setAdvancedMetrics(results[1])
          setAdvancedError(null)
        }
        setAdvancedLoading(false)
      }

      // Contenedores Docker
      if (tasks[2] === 'containers') {
        if (results[2]?.error) {
          setContainersError(results[2].error.toString())
        } else if (results[2]) {
          setContainers(results[2] || [])
          setContainersError(null)
          
          // Fetch imágenes y volúmenes cada 6 llamadas (~30s a 5s interval)
          fetchCountRef.current++
          if (fetchCountRef.current % 6 === 1) {
            try {
              await Promise.all([
                dockerImages(connId).catch((e) => { console.warn('Failed to fetch Docker images:', e); return null }),
                dockerVolumes(connId).catch((e) => { console.warn('Failed to fetch Docker volumes:', e); return null }),
              ])
            } catch (e) {
              console.warn('Error fetching Docker extras:', e)
            }
          }
        }
        setContainersLoading(false)
      }

      setLastUpdate(new Date())

    } catch (err) {
      if (!isMountedRef.current) return
      console.error('Error fetching data:', err)
      
      setMetricsError(err.toString())
      setAdvancedError(err.toString())
      setContainersError(err.toString())
      
      setMetricsLoading(false)
      setAdvancedLoading(false)
      setContainersLoading(false)
    }
  }, [metricsInterval, advancedInterval, containersInterval])

  /**
   * Setup del polling unificado
   */
  useEffect(() => {
    isMountedRef.current = true
    tickCountRef.current = 0
    
    if (!connectionId) {
      setMetricsLoading(false)
      setAdvancedLoading(false)
      setContainersLoading(false)
      return
    }

    // Reset de estados
    setMetricsLoading(true)
    setAdvancedLoading(true)
    setContainersLoading(true)
    setMetricsError(null)
    setAdvancedError(null)
    setContainersError(null)

    // Fetch inicial inmediato
    fetchAllData()

    // Calcular intervalo base (MCD de todos los intervalos)
    const baseInterval = gcd(
      gcd(metricsInterval, advancedInterval),
      containersInterval
    )

    // Polling unificado
    intervalRef.current = setInterval(() => {
      tickCountRef.current++
      fetchAllData()
    }, baseInterval)

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [connectionId, fetchAllData])

  /**
   * Función para refresh manual
   */
  const refresh = useCallback(() => {
    setMetricsLoading(true)
    setAdvancedLoading(true)
    setContainersLoading(true)
    tickCountRef.current = 0
    fetchAllData()
  }, [fetchAllData])

  /**
   * Función para refresh solo de contenedores
   */
  const refreshContainers = useCallback(async () => {
    const connId = connectionIdRef.current
    if (!connId || !isTauri()) return

    setContainersLoading(true)
    try {
      const data = await dockerList(connId, true)
      if (isMountedRef.current) {
        setContainers(data || [])
        setContainersError(null)
        setContainersLoading(false)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setContainersError(err.toString())
        setContainersLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    // Métricas básicas
    metrics,
    metricsLoading,
    metricsError,
    
    // Métricas avanzadas
    advancedMetrics,
    advancedLoading,
    advancedError,
    
    // Contenedores
    containers,
    containersLoading,
    containersError,
    
    // Comunes
    lastUpdate,
    refresh,
    refreshContainers,
  }
}

// ============================================================================
// HOOKS LEGACY (Para backward compatibility y tests)
// ============================================================================

/**
 * Hook para obtener métricas del sistema en tiempo real
 * @deprecated Usa useRealTimeData() en su lugar para mejor performance
 * Solo funciona en Tauri - sin datos mock
 */
export function useRealTimeMetrics(connectionId, intervalMs = 3000) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  // OPTIMIZACIÓN: Usar refs para evitar re-renders
  const connectionIdRef = useRef(connectionId)
  const intervalRef = useRef(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    connectionIdRef.current = connectionId
  }, [connectionId])

  const fetchMetrics = useCallback(async () => {
    const connId = connectionIdRef.current
    if (!connId || !isTauri()) {
      if (!isTauri()) {
        setError('Esta aplicación solo funciona en Tauri. Los datos se obtienen via SSH del servidor remoto.')
      }
      setLoading(false)
      return
    }

    try {
      const data = await getSystemMetrics(connId)
      
      if (isMountedRef.current) {
        setMetrics(data)
        setLastUpdate(new Date())
        setError(null)
        setLoading(false)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.toString())
        setLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    setLoading(true)
    setError(null)

    if (!connectionId) {
      setLoading(false)
      return
    }

    // Fetch inicial
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        fetchMetrics()
      }
    }, 0)

    // Polling
    intervalRef.current = setInterval(fetchMetrics, intervalMs)

    return () => {
      isMountedRef.current = false
      clearTimeout(timeoutId)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [connectionId, intervalMs, fetchMetrics])

  const refresh = useCallback(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return { metrics, loading, error, lastUpdate, refresh }
}

/**
 * Hook para obtener contenedores Docker en tiempo real
 * @deprecated Usa useRealTimeData() en su lugar para mejor performance
 * Solo funciona en Tauri - sin datos mock
 */
export function useRealTimeContainers(connectionId, intervalMs = 5000) {
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // OPTIMIZACIÓN: Usar refs para evitar re-renders
  const connectionIdRef = useRef(connectionId)
  const intervalRef = useRef(null)
  const isMountedRef = useRef(true)
  const fetchCountRef = useRef(0)

  useEffect(() => {
    connectionIdRef.current = connectionId
  }, [connectionId])

  const fetchContainers = useCallback(async () => {
    const connId = connectionIdRef.current
    if (!connId || !isTauri()) {
      if (!isTauri()) {
        setError('Esta aplicación solo funciona en Tauri.')
      }
      setLoading(false)
      return
    }

    try {
      const data = await dockerList(connId, true)
      
      if (isMountedRef.current) {
        setContainers(data || [])
        setError(null)
        setLoading(false)
        
        fetchCountRef.current++
        if (fetchCountRef.current % 6 === 1) {
          try {
            await Promise.all([
              dockerImages(connId).catch((e) => { console.warn('Failed to fetch Docker images:', e); return null }),
              dockerVolumes(connId).catch((e) => { console.warn('Failed to fetch Docker volumes:', e); return null }),
            ])
          } catch (e) {
            console.warn('Error fetching Docker extras:', e)
          }
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.toString())
        setLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    setLoading(true)
    setError(null)

    if (!connectionId) {
      setLoading(false)
      return
    }

    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        fetchContainers()
      }
    }, 0)

    intervalRef.current = setInterval(fetchContainers, intervalMs)

    return () => {
      isMountedRef.current = false
      clearTimeout(timeoutId)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [connectionId, intervalMs, fetchContainers])

  const refresh = useCallback(() => {
    fetchContainers()
  }, [fetchContainers])

  return { containers, loading, error, refresh }
}

/**
 * Hook para obtener logs de Docker en tiempo real (polling rápido)
 * Solo funciona en Tauri - sin datos mock
 */
export function useRealTimeLogs(connectionId, containerId, intervalMs = 1000) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // OPTIMIZACIÓN: Usar refs para evitar re-renders
  const connectionIdRef = useRef(connectionId)
  const containerIdRef = useRef(containerId)
  const intervalRef = useRef(null)
  const isMountedRef = useRef(true)
  const lastLogCountRef = useRef(0)

  useEffect(() => {
    connectionIdRef.current = connectionId
    containerIdRef.current = containerId
  }, [connectionId, containerId])

  const fetchLogs = useCallback(async () => {
    const connId = connectionIdRef.current
    const contId = containerIdRef.current
    
    if (!connId || !contId || !isTauri()) {
      return
    }

    try {
      const data = await dockerLogs(connId, contId, 200)
      
      if (isMountedRef.current) {
        // Solo actualizar si hay nuevos logs
        if (data && data.length !== lastLogCountRef.current) {
          setLogs(data)
          lastLogCountRef.current = data.length
        }
        setError(null)
        setLoading(false)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.toString())
        setLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    lastLogCountRef.current = 0
    setLogs([])
    setError(null)

    if (!connectionId || !containerId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        fetchLogs()
      }
    }, 0)

    intervalRef.current = setInterval(fetchLogs, intervalMs)

    return () => {
      isMountedRef.current = false
      clearTimeout(timeoutId)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [connectionId, containerId, intervalMs, fetchLogs])

  const clearLogs = useCallback(() => {
    setLogs([])
    lastLogCountRef.current = 0
  }, [])

  return { logs, loading, error, clearLogs }
}

export default useRealTimeData
