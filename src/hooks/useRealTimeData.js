/* eslint-disable react-hooks/set-state-in-effect */
// This file contains data-fetching hooks that intentionally set state in effects.
// This is a valid pattern for polling data from external sources (SSH/Tauri).

import { useCallback, useEffect, useRef, useState } from 'react'
import { 
  getSystemMetrics, 
  dockerList, 
  dockerLogs,
  dockerImages,
  dockerVolumes,
  isTauri 
} from '../services/tauri.js'
import { saveDockerBatch } from '../services/api.js'

/**
 * Hook para obtener métricas del sistema en tiempo real
 * Solo funciona en Tauri - sin datos mock
 */
export function useRealTimeMetrics(connectionId, intervalMs = 3000) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const intervalRef = useRef(null)
  const isMountedRef = useRef(true)

  const fetchMetrics = useCallback(async () => {
    if (!connectionId || !isTauri()) {
      if (!isTauri()) {
        setError('Esta aplicación solo funciona en Tauri. Los datos se obtienen via SSH del servidor remoto.')
      }
      setLoading(false)
      return
    }

    try {
      const data = await getSystemMetrics(connectionId)
      
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
  }, [connectionId])

useEffect(() => {
    isMountedRef.current = true
    setLoading(true)
    setError(null)

    if (!connectionId) {
      setLoading(false)
      return undefined
    }

    // Fetch inicial con pequeño delay para evitar cascading renders
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
 * Solo funciona en Tauri - sin datos mock
 */
export function useRealTimeContainers(connectionId, intervalMs = 5000) {
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)
  const isMountedRef = useRef(true)
  const fetchCountRef = useRef(0)

  const fetchContainers = useCallback(async () => {
    if (!connectionId || !isTauri()) {
      if (!isTauri()) {
        setError('Esta aplicación solo funciona en Tauri.')
      }
      setLoading(false)
      return
    }

    try {
      const data = await dockerList(connectionId, true)
      
      if (isMountedRef.current) {
        setContainers(data || [])
        setError(null)
        setLoading(false)
        
        // Increment fetch counter
        fetchCountRef.current++
        
        // Fetch images and volumes every 6th call (~30 seconds at 5s interval)
        // to avoid excessive API calls
        let extras = {}
        if (fetchCountRef.current % 6 === 1) {
          try {
            const [images, volumes] = await Promise.all([
              dockerImages(connectionId).catch(() => null),
              dockerVolumes(connectionId).catch(() => null),
            ])
            extras = { images, volumes }
          } catch {
            // Ignore errors fetching extras
          }
        }
        
        // Save Docker data to database (fire and forget)
        if (data && data.length > 0) {
          saveDockerBatch(connectionId, data, extras).catch(err => {
            console.warn('Failed to save Docker metrics:', err.message)
          })
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.toString())
        setLoading(false)
      }
    }
  }, [connectionId])

useEffect(() => {
    isMountedRef.current = true
    setLoading(true)
    setError(null)

    if (!connectionId) {
      setLoading(false)
      return undefined
    }

    // Fetch inicial con pequeño delay
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        fetchContainers()
      }
    }, 0)

    // Polling
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
  const intervalRef = useRef(null)
  const isMountedRef = useRef(true)
  const lastLogCountRef = useRef(0)

  const fetchLogs = useCallback(async () => {
    if (!connectionId || !containerId || !isTauri()) {
      return
    }

    try {
      const data = await dockerLogs(connectionId, containerId, 200)
      
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
  }, [connectionId, containerId])

useEffect(() => {
    isMountedRef.current = true
    lastLogCountRef.current = 0
    setLogs([])
    setError(null)

    if (!connectionId || !containerId) {
      setLoading(false)
      return undefined
    }

    setLoading(true)

    // Fetch inicial con pequeño delay
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        fetchLogs()
      }
    }, 0)

    // Polling rápido para logs
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
