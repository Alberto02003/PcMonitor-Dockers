/**
 * Hook para gestionar estados de conexion SSH
 */

import { useState, useCallback, useRef } from 'react'
import { sshConnect, sshTest, sshDisconnect, isTauri } from '../services/tauri.js'

/**
 * Estados posibles de conexion
 */
export const CONNECTION_STATUS = {
  UNKNOWN: 'unknown',
  CHECKING: 'checking',
  ONLINE: 'online',
  OFFLINE: 'offline',
}

/**
 * Hook para gestionar el estado de conexiones SSH
 * @param {Object} options
 * @param {Function} options.onStatusChange - Callback cuando cambia el estado
 * @param {Function} options.onConnect - Callback cuando se conecta exitosamente
 * @param {Function} options.onError - Callback de error
 * @returns {Object}
 */
export function useConnectionStatus({ onStatusChange, onConnect, onError } = {}) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [activeConnectionId, setActiveConnectionId] = useState(null)
  const abortControllerRef = useRef(null)

  /**
   * Conectar a un servidor
   * @param {Object} connection - Datos de conexion
   * @returns {Promise<boolean>} - true si exitoso
   */
  const connect = useCallback(async (connection) => {
    if (!connection) return false

    setIsConnecting(true)
    setActiveConnectionId(connection.id)

    if (onStatusChange) {
      onStatusChange(connection.id, CONNECTION_STATUS.CHECKING)
    }

    if (isTauri()) {
      try {
        await sshConnect(connection)
        
        if (onStatusChange) {
          onStatusChange(connection.id, CONNECTION_STATUS.ONLINE)
        }
        
        if (onConnect) {
          onConnect(connection)
        }
        
        setIsConnecting(false)
        return true
      } catch (error) {
        if (onStatusChange) {
          onStatusChange(connection.id, CONNECTION_STATUS.OFFLINE)
        }
        
        if (onError) {
          onError(error)
        }
        
        setIsConnecting(false)
        return false
      }
    } else {
      // Fallback para desarrollo en navegador
      return new Promise((resolve) => {
        setTimeout(() => {
          if (onStatusChange) {
            onStatusChange(connection.id, CONNECTION_STATUS.ONLINE)
          }
          
          if (onConnect) {
            onConnect(connection)
          }
          
          setIsConnecting(false)
          resolve(true)
        }, 1200)
      })
    }
  }, [onStatusChange, onConnect, onError])

  /**
   * Probar conexion sin mantenerla abierta
   * @param {Object} connectionData - Datos de conexion (puede ser formData)
   * @param {string|null} existingId - ID si es conexion existente
   * @returns {Promise<boolean>} - true si exitoso
   */
  const testConnection = useCallback(async (connectionData, existingId = null) => {
    setIsTesting(true)

    if (existingId && onStatusChange) {
      onStatusChange(existingId, CONNECTION_STATUS.CHECKING)
    }

    if (isTauri()) {
      try {
        const testConfig = {
          id: existingId || crypto.randomUUID(),
          host: connectionData.host?.trim() || connectionData.host,
          port: Number(connectionData.port) || 22,
          username: connectionData.username?.trim() || connectionData.username,
          authType: connectionData.authType || 'password',
          password: connectionData.password || null,
          keyPath: connectionData.keyPath || null,
        }

        await sshTest(testConfig)
        
        if (existingId && onStatusChange) {
          onStatusChange(existingId, CONNECTION_STATUS.ONLINE)
        }
        
        setIsTesting(false)
        return true
      } catch (error) {
        if (existingId && onStatusChange) {
          onStatusChange(existingId, CONNECTION_STATUS.OFFLINE)
        }
        
        if (onError) {
          onError(error)
        }
        
        setIsTesting(false)
        return false
      }
    } else {
      // Fallback para desarrollo en navegador
      return new Promise((resolve) => {
        setTimeout(() => {
          if (existingId && onStatusChange) {
            onStatusChange(existingId, CONNECTION_STATUS.ONLINE)
          }
          
          setIsTesting(false)
          resolve(true)
        }, 1200)
      })
    }
  }, [onStatusChange, onError])

  /**
   * Desconectar del servidor actual
   * @param {string} connectionId
   * @returns {Promise<void>}
   */
  const disconnect = useCallback(async (connectionId) => {
    if (!connectionId) return

    if (isTauri()) {
      try {
        await sshDisconnect(connectionId)
      } catch (error) {
        if (onError) {
          onError(error)
        }
      }
    }

    if (activeConnectionId === connectionId) {
      setActiveConnectionId(null)
    }

    if (onStatusChange) {
      onStatusChange(connectionId, CONNECTION_STATUS.UNKNOWN)
    }
  }, [activeConnectionId, onStatusChange, onError])

  /**
   * Cancelar operacion en curso
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsConnecting(false)
    setIsTesting(false)
  }, [])

  return {
    // Estado
    isConnecting,
    isTesting,
    activeConnectionId,
    isLoading: isConnecting || isTesting,
    
    // Acciones
    connect,
    testConnection,
    disconnect,
    cancel,
  }
}

export default useConnectionStatus
