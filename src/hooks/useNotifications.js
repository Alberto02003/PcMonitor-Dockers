/**
 * Hook useNotifications - Gestión de notificaciones desktop nativas
 * 
 * Fase 4.3 - Notificaciones Desktop (Tauri Native)
 * 
 * Features:
 * - Notificaciones nativas del sistema operativo via Tauri
 * - Solicitud de permisos
 * - Cola de notificaciones
 * - Preferencias de usuario
 * - Integración con alertas de métricas
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'

const STORAGE_KEY = 'pcmd.notifications.v1'

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  ALERT: 'alert',
}

/**
 * Carga las preferencias de notificaciones
 * @returns {Object}
 */
function loadPreferences() {
  if (typeof window === 'undefined') return getDefaultPreferences()
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return getDefaultPreferences()
    
    const parsed = JSON.parse(stored)
    return { ...getDefaultPreferences(), ...parsed }
  } catch (error) {
    console.warn('Error loading notification preferences:', error)
    return getDefaultPreferences()
  }
}

/**
 * Obtiene las preferencias por defecto
 * @returns {Object}
 */
function getDefaultPreferences() {
  return {
    enabled: true,
    sound: false,
    desktop: true,
    types: {
      [NOTIFICATION_TYPES.INFO]: false,
      [NOTIFICATION_TYPES.SUCCESS]: true,
      [NOTIFICATION_TYPES.WARNING]: true,
      [NOTIFICATION_TYPES.ERROR]: true,
      [NOTIFICATION_TYPES.ALERT]: true,
    },
  }
}

/**
 * Guarda las preferencias de notificaciones
 * @param {Object} preferences 
 */
function savePreferences(preferences) {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.warn('Error saving notification preferences:', error)
  }
}

/**
 * Verifica si las notificaciones están soportadas (Tauri siempre las soporta)
 * @returns {boolean}
 */
function isSupported() {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
}

/**
 * Hook para gestionar notificaciones desktop nativas de Tauri
 * 
 * @returns {{
 *   preferences: Object,
 *   permission: string,
 *   isSupported: boolean,
 *   notify: (title: string, options: Object) => void,
 *   requestPermission: () => Promise<string>,
 *   updatePreferences: (updates: Object) => void,
 *   showAlert: (message: string, severity: string) => void,
 *   clearAll: () => void
 * }}
 */
export function useNotifications() {
  const [preferences, setPreferences] = useState(() => loadPreferences())
  const [permission, setPermission] = useState('default')
  const queueRef = useRef([])
  const processingRef = useRef(false)
  const permissionCheckedRef = useRef(false)

  // Verificar y solicitar permisos al iniciar
  useEffect(() => {
    async function initPermissions() {
      if (!isSupported()) {
        // Tauri not supported
        setPermission('denied')
        return
      }
      
      if (permissionCheckedRef.current) return
      permissionCheckedRef.current = true
      
      try {
        let granted = await isPermissionGranted()

        if (!granted) {
          const result = await requestPermission()
          granted = result === 'granted'
        }

        const newPermission = granted ? 'granted' : 'denied'
        setPermission(newPermission)
      } catch (error) {
        console.warn('[Notifications] Error checking/requesting permission:', error)
        // En Windows, si hay error asumimos que está concedido (comportamiento por defecto)
        setPermission('granted')
      }
    }
    
    initPermissions()
  }, [])

  // Guardar preferencias cuando cambien
  useEffect(() => {
    savePreferences(preferences)
  }, [preferences])

  /**
   * Procesar cola de notificaciones
   */
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return

    processingRef.current = true
    const { title, options } = queueRef.current.shift()

    try {
      await sendNotification({
        title,
        body: options.body || '',
      })
    } catch (error) {
      console.error('[Notifications] Error sending notification:', error)
    }

    processingRef.current = false

    // Procesar siguiente después de un pequeño delay
    if (queueRef.current.length > 0) {
      setTimeout(processQueue, 100)
    }
  }, [])

  /**
   * Solicitar permisos
   * @returns {Promise<string>}
   */
  const requestPermissionCallback = useCallback(async () => {
    if (!isSupported()) {
      return 'denied'
    }

    try {
      // Primero verificar si ya tenemos permiso
      const alreadyGranted = await isPermissionGranted()
      if (alreadyGranted) {
        setPermission('granted')
        return 'granted'
      }

      // Solicitar permiso
      const result = await requestPermission()
      const newPermission = result === 'granted' ? 'granted' : 'denied'
      setPermission(newPermission)
      return newPermission
    } catch (error) {
      console.warn('Error requesting notification permission:', error)
      // En caso de error, asumir concedido en Windows
      setPermission('granted')
      return 'granted'
    }
  }, [])

  /**
   * Actualizar preferencias
   * @param {Object} updates 
   */
  const updatePreferences = useCallback((updates) => {
    setPreferences(prev => {
      const updated = { ...prev }
      
      // Merge updates
      Object.keys(updates).forEach(key => {
        if (key === 'types' && typeof updates.types === 'object') {
          updated.types = { ...prev.types, ...updates.types }
        } else {
          updated[key] = updates[key]
        }
      })
      
      return updated
    })
  }, [])

  /**
   * Mostrar notificación
   * @param {string} title 
   * @param {Object} options 
   */
  const notify = useCallback(async (title, options = {}) => {
    const {
      type = NOTIFICATION_TYPES.INFO,
      body = '',
    } = options

    if (!preferences.enabled) return
    if (!preferences.desktop) return
    if (preferences.types[type] === false) return

    // Verificar si Tauri está disponible
    if (!isSupported()) {
      console.warn('[Notifications] Tauri not available')
      return
    }

    // No bloquear por permisos - intentar enviar de todos modos
    // En Windows las notificaciones generalmente funcionan sin permiso explícito

    // Agregar a la cola
    queueRef.current.push({
      title,
      options: {
        body,
      },
    })

    // Process queue

    // Procesar cola
    processQueue()
  }, [preferences, permission, processQueue])

  /**
   * Enviar notificación directamente (sin verificar preferencias)
   * Útil para pruebas
   */
  const sendDirect = useCallback(async (title, body) => {
    if (!isSupported()) {
      console.warn('[Notifications] Tauri not available for direct send')
      return false
    }

    try {
      await sendNotification({ title, body })
      return true
    } catch (error) {
      console.error('[Notifications] Direct send error:', error)
      return false
    }
  }, [])

  /**
   * Mostrar alerta de métricas
   * @param {string} message 
   * @param {string} severity 
   */
  const showAlert = useCallback((message, severity = 'warning') => {
    const typeMap = {
      info: NOTIFICATION_TYPES.INFO,
      success: NOTIFICATION_TYPES.SUCCESS,
      warning: NOTIFICATION_TYPES.WARNING,
      error: NOTIFICATION_TYPES.ERROR,
    }

    // Añadir prefijo según severidad para mejor visibilidad
    const severityPrefix = {
      info: 'INFO',
      success: 'OK',
      warning: 'AVISO',
      error: 'ERROR',
      critical: 'CRITICO',
    }

    const prefix = severityPrefix[severity] || 'ALERTA'

    notify(`[${prefix}] Monitoreo`, {
      type: typeMap[severity] || NOTIFICATION_TYPES.ALERT,
      body: message,
    })
  }, [notify])

  /**
   * Cerrar todas las notificaciones (en Tauri las notificaciones nativas se cierran solas)
   */
  const clearAll = useCallback(() => {
    queueRef.current = []
  }, [])

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      clearAll()
    }
  }, [clearAll])

  return {
    preferences,
    permission,
    isSupported: isSupported(),
    notify,
    sendDirect,
    requestPermission: requestPermissionCallback,
    updatePreferences,
    showAlert,
    clearAll,
  }
}

export default useNotifications
