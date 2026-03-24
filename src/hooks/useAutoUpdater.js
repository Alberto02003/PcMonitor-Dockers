import { useState, useEffect, useCallback, useRef } from 'react'
import { checkForUpdates, isTauri } from '../services/tauri.js'

/**
 * Hook para gestionar verificaciones automáticas de actualizaciones
 */
export function useAutoUpdater({
  checkOnMount = true,
  checkInterval = 6 * 60 * 60 * 1000,
  enabled = true,
  onUpdateAvailable = null,
} = {}) {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState(null)
  const [error, setError] = useState(null)

  const intervalRef = useRef(null)
  const mountedRef = useRef(false)
  const onUpdateAvailableRef = useRef(onUpdateAvailable)
  onUpdateAvailableRef.current = onUpdateAvailable

  const checkUpdate = useCallback(async (silent = false) => {
    if (!isTauri() || !enabled) return null

    setIsChecking(true)
    if (!silent) setError(null)

    try {
      const result = await checkForUpdates()
      setLastCheck(new Date())

      if (result === null) {
        if (!silent) setError('Failed to check for updates')
        return null
      }

      setUpdateInfo(result)

      if (result.available && onUpdateAvailableRef.current) {
        onUpdateAvailableRef.current(result)
      }

      return result
    } catch (err) {
      console.error('Auto-updater error:', err)
      if (!silent) setError(err.message || 'Unknown error')
      return null
    } finally {
      setIsChecking(false)
    }
  }, [enabled])

  // Verificación al montar
  useEffect(() => {
    if (!mountedRef.current && checkOnMount && enabled && isTauri()) {
      mountedRef.current = true
      const timer = setTimeout(() => {
        checkUpdate(true)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [checkOnMount, enabled, checkUpdate])

  // Verificación periódica
  useEffect(() => {
    if (!enabled || !isTauri() || checkInterval <= 0) return

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(() => {
      checkUpdate(true)
    }, checkInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, checkInterval, checkUpdate])

  const manualCheck = useCallback(async () => {
    return await checkUpdate(false)
  }, [checkUpdate])

  const resetUpdate = useCallback(() => {
    setUpdateInfo(null)
    setError(null)
  }, [])

  return {
    updateInfo,
    isChecking,
    lastCheck,
    error,
    hasUpdate: updateInfo?.available || false,
    checkUpdate: manualCheck,
    resetUpdate,
  }
}
