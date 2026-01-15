import { useState, useEffect, useCallback, useRef } from 'react'
import { checkForUpdates, isTauri } from '../services/tauri.js'

/**
 * Hook para gestionar verificaciones automáticas de actualizaciones
 * 
 * @param {Object} options - Configuración
 * @param {boolean} options.checkOnMount - Verificar al montar (inicio de la app)
 * @param {number} options.checkInterval - Intervalo en milisegundos (default: 6 horas)
 * @param {boolean} options.enabled - Si las verificaciones automáticas están habilitadas
 * @param {Function} options.onUpdateAvailable - Callback cuando hay actualización disponible
 * 
 * @returns {Object} - Estado y funciones del updater
 */
export function useAutoUpdater({
  checkOnMount = true,
  checkInterval = 6 * 60 * 60 * 1000, // 6 horas por defecto
  enabled = true,
  onUpdateAvailable = null,
} = {}) {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState(null)
  const [error, setError] = useState(null)
  
  const intervalRef = useRef(null)
  const mountedRef = useRef(false)

  // Función para verificar actualizaciones
  const checkUpdate = useCallback(async (silent = false) => {
    if (!isTauri() || !enabled) return

    if (!silent) {
      setIsChecking(true)
    }
    setError(null)

    try {
      const result = await checkForUpdates()
      setLastCheck(new Date())

      if (result === null) {
        setError('Failed to check for updates')
        return null
      }

      setUpdateInfo(result)

      // Llamar callback si hay actualización disponible
      if (result.available && onUpdateAvailable) {
        onUpdateAvailable(result)
      }

      return result
    } catch (err) {
      console.error('Auto-updater error:', err)
      setError(err.message || 'Unknown error')
      return null
    } finally {
      if (!silent) {
        setIsChecking(false)
      }
    }
  }, [enabled, onUpdateAvailable])

  // Verificación al montar (inicio de la app)
  useEffect(() => {
    if (!mountedRef.current && checkOnMount && enabled && isTauri()) {
      mountedRef.current = true
      // Pequeño delay para no interferir con la carga inicial
      const timer = setTimeout(() => {
        checkUpdate(true) // Silent check
      }, 5000) // 5 segundos después del inicio

      return () => clearTimeout(timer)
    }
  }, [checkOnMount, enabled, checkUpdate])

  // Verificación periódica
  useEffect(() => {
    if (!enabled || !isTauri() || checkInterval <= 0) return

    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Crear nuevo intervalo
    intervalRef.current = setInterval(() => {
      checkUpdate(true) // Silent check
    }, checkInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, checkInterval, checkUpdate])

  // Verificación manual
  const manualCheck = useCallback(async () => {
    return await checkUpdate(false)
  }, [checkUpdate])

  // Resetear estado de actualización (útil después de instalar)
  const resetUpdate = useCallback(() => {
    setUpdateInfo(null)
    setError(null)
  }, [])

  return {
    // Estado
    updateInfo,
    isChecking,
    lastCheck,
    error,
    hasUpdate: updateInfo?.available || false,
    
    // Funciones
    checkUpdate: manualCheck,
    resetUpdate,
  }
}
