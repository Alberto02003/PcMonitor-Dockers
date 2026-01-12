/**
 * Hook useNotifications - Gestión de notificaciones desktop
 * 
 * Fase 4.3 - Notificaciones Desktop
 * 
 * Features:
 * - Notificaciones del sistema operativo
 * - Solicitud de permisos
 * - Cola de notificaciones
 * - Preferencias de usuario
 * - Integración con alertas de métricas
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'pcmd.notifications.v1'
const NOTIFICATION_TIMEOUT = 5000 // 5 segundos

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
 * Verifica si las notificaciones están soportadas
 * @returns {boolean}
 */
function isSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Obtiene el estado de los permisos
 * @returns {string} 'granted', 'denied', 'default'
 */
function getPermissionStatus() {
  if (!isSupported()) return 'denied'
  return Notification.permission
}

/**
 * Solicita permisos para notificaciones
 * @returns {Promise<string>}
 */
async function requestPermission() {
  if (!isSupported()) {
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.warn('Error requesting notification permission:', error)
    return 'denied'
  }
}

/**
 * Muestra una notificación del sistema
 * @param {string} title 
 * @param {Object} options 
 * @returns {Notification|null}
 */
function showSystemNotification(title, options = {}) {
  if (!isSupported() || Notification.permission !== 'granted') {
    return null
  }

  try {
    const notification = new Notification(title, {
      icon: '/icon.png',
      badge: '/badge.png',
      ...options,
    })

    // Auto-cerrar después del timeout
    if (options.autoClose !== false) {
      setTimeout(() => {
        notification.close()
      }, options.timeout || NOTIFICATION_TIMEOUT)
    }

    return notification
  } catch (error) {
    console.warn('Error showing notification:', error)
    return null
  }
}

/**
 * Hook para gestionar notificaciones desktop
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
  const [permission, setPermission] = useState(() => getPermissionStatus())
  const notificationsRef = useRef([])
  const queueRef = useRef([])
  const processingRef = useRef(false)

  // Guardar preferencias cuando cambien
  useEffect(() => {
    savePreferences(preferences)
  }, [preferences])

  // Monitorear cambios en permisos
  useEffect(() => {
    if (!isSupported()) return

    const checkPermission = () => {
      setPermission(Notification.permission)
    }

    // Verificar cada segundo (no hay evento nativo para esto)
    const interval = setInterval(checkPermission, 1000)
    
    return () => clearInterval(interval)
  }, [])

  /**
   * Procesar cola de notificaciones
   */
  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) return

    processingRef.current = true
    const { title, options } = queueRef.current.shift()

    const notification = showSystemNotification(title, options)
    if (notification) {
      notificationsRef.current.push(notification)
      
      // Limpiar referencia cuando se cierre
      notification.onclose = () => {
        const index = notificationsRef.current.indexOf(notification)
        if (index > -1) {
          notificationsRef.current.splice(index, 1)
        }
      }
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
    const result = await requestPermission()
    setPermission(result)
    return result
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
  const notify = useCallback((title, options = {}) => {
    const {
      type = NOTIFICATION_TYPES.INFO,
      body = '',
      icon,
      onClick,
      timeout = NOTIFICATION_TIMEOUT,
    } = options

    // Verificar si las notificaciones están habilitadas
    if (!preferences.enabled) return
    if (!preferences.desktop) return
    if (preferences.types[type] === false) return

    // Verificar permisos
    if (permission !== 'granted') {
      console.warn('Notification permission not granted')
      return
    }

    // Agregar a la cola
    queueRef.current.push({
      title,
      options: {
        body,
        icon: icon || getIconForType(type),
        tag: `pcmd-${type}-${Date.now()}`,
        timeout,
        onClick,
      },
    })

    // Procesar cola
    processQueue()
  }, [preferences, permission, processQueue])

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

    notify('Alerta de Monitoreo', {
      type: typeMap[severity] || NOTIFICATION_TYPES.ALERT,
      body: message,
    })
  }, [notify])

  /**
   * Cerrar todas las notificaciones
   */
  const clearAll = useCallback(() => {
    notificationsRef.current.forEach(notification => {
      try {
        notification.close()
      } catch (error) {
        // Ignore
      }
    })
    notificationsRef.current = []
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
    requestPermission: requestPermissionCallback,
    updatePreferences,
    showAlert,
    clearAll,
  }
}

/**
 * Obtiene el ícono para un tipo de notificación
 * @param {string} type 
 * @returns {string}
 */
function getIconForType(type) {
  const icons = {
    [NOTIFICATION_TYPES.INFO]: '/icons/info.png',
    [NOTIFICATION_TYPES.SUCCESS]: '/icons/success.png',
    [NOTIFICATION_TYPES.WARNING]: '/icons/warning.png',
    [NOTIFICATION_TYPES.ERROR]: '/icons/error.png',
    [NOTIFICATION_TYPES.ALERT]: '/icons/alert.png',
  }
  return icons[type] || '/icon.png'
}

export default useNotifications
