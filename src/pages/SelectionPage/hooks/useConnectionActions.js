/**
 * Hook para gestionar acciones de conexiones (CRUD, favoritos, default)
 */

import { useCallback } from 'react'
import { useConnectionsStore } from '../../../stores/connectionsStore.js'
import { useTranslation } from '../../../hooks/useTranslation.jsx'
import { sshConnect, sshTest, isTauri, secureStorageGet } from '../../../services/tauri.js'

/**
 * Hook que proporciona acciones para gestionar conexiones
 * @param {Object} options - Opciones del hook
 * @param {Function} options.showNotification - Función para mostrar notificaciones
 * @param {Function} options.onConnect - Callback cuando se conecta exitosamente
 */
export function useConnectionActions({ showNotification, onConnect }) {
  const { t } = useTranslation()
  // Store actions
  const connections = useConnectionsStore(state => state.connections)
  const storeAddConnection = useConnectionsStore(state => state.addConnection)
  const storeUpdateConnection = useConnectionsStore(state => state.updateConnection)
  const storeDeleteConnection = useConnectionsStore(state => state.deleteConnection)
  const storeRestoreConnection = useConnectionsStore(state => state.restoreConnection)
  const storeToggleFavorite = useConnectionsStore(state => state.toggleFavorite)
  const storeSetDefault = useConnectionsStore(state => state.setDefault)
  const storeDuplicateConnection = useConnectionsStore(state => state.duplicateConnection)
  const storeUpdateStatus = useConnectionsStore(state => state.updateStatus)
  const storeUpdateLastConnected = useConnectionsStore(state => state.updateLastConnected)

  const saveConnection = useCallback(async (payload, isEdit, connectionId) => {
    if (isEdit && connectionId) {
      await storeUpdateConnection(connectionId, payload)
      return { id: connectionId }
    } else {
      const newConn = await storeAddConnection(payload)
      return newConn
    }
  }, [storeAddConnection, storeUpdateConnection])

  const deleteConnection = useCallback(async (id) => {
    const result = await storeDeleteConnection(id)
    return result
  }, [storeDeleteConnection])

  const restoreConnection = useCallback(async (connection, index) => {
    await storeRestoreConnection(connection, index)
  }, [storeRestoreConnection])

  const setDefault = useCallback(async (id, currentDefaultId) => {
    const isCurrentlyDefault = currentDefaultId === id
    await storeSetDefault(id)
    showNotification(isCurrentlyDefault ? t('notifications.defaultOff') : t('notifications.defaultOn'), 'success')
  }, [storeSetDefault, showNotification, t])

  const toggleFavorite = useCallback(async (id) => {
    const nextFavorite = await storeToggleFavorite(id)
    showNotification(nextFavorite ? t('notifications.favoriteOn') : t('notifications.favoriteOff'), 'success')
  }, [storeToggleFavorite, showNotification, t])

  const duplicateConnection = useCallback(async (id) => {
    const duplicated = await storeDuplicateConnection(id, t('selection.copySuffix'))
    if (duplicated) {
      showNotification(t('notifications.duplicate'), 'success')
    }
    return duplicated
  }, [storeDuplicateConnection, showNotification, t])

  const updateStatus = useCallback((id, status) => {
    storeUpdateStatus(id, status)
  }, [storeUpdateStatus])

  const connect = useCallback(async (id) => {
    const target = connections.find((item) => item.id === id)
    if (!target) return { success: false }

    showNotification(`${t('notifications.connectStart')} ${target.name}...`, 'warning')
    updateStatus(id, 'checking')

    if (isTauri()) {
      try {
        // Cargar credenciales desencriptadas desde Secure Storage
        const connectionWithCredentials = await secureStorageGet(id)
        
        await sshConnect(connectionWithCredentials)
        updateStatus(id, 'online')
        await storeUpdateLastConnected(id)
        showNotification(t('notifications.testOk'), 'success')
        if (onConnect) {
          onConnect(target)
        }
        return { success: true }
      } catch (error) {
        updateStatus(id, 'offline')
        showNotification(`Error: ${error}`, 'error')
        return { success: false, error }
      }
    } else {
      // Fallback for browser development
      return new Promise((resolve) => {
        setTimeout(() => {
          updateStatus(id, 'online')
          showNotification(t('notifications.testOk'), 'success')
          if (onConnect) {
            onConnect(target)
          }
          resolve({ success: true })
        }, 1200)
      })
    }
  }, [connections, showNotification, t, updateStatus, storeUpdateLastConnected, onConnect])

  const testConnection = useCallback(async (testConfig, connectionId) => {
    showNotification(t('notifications.testStart'), 'warning')
    if (connectionId) {
      updateStatus(connectionId, 'checking')
    }

    if (isTauri()) {
      try {
        await sshTest(testConfig)
        showNotification(t('notifications.testOk'), 'success')
        if (connectionId) {
          updateStatus(connectionId, 'online')
        }
        return { success: true }
      } catch (error) {
        showNotification(`Error: ${error}`, 'error')
        if (connectionId) {
          updateStatus(connectionId, 'offline')
        }
        return { success: false, error }
      }
    } else {
      // Fallback for browser development
      return new Promise((resolve) => {
        setTimeout(() => {
          showNotification(t('notifications.testOk'), 'success')
          if (connectionId) {
            updateStatus(connectionId, 'online')
          }
          resolve({ success: true })
        }, 1200)
      })
    }
  }, [showNotification, t, updateStatus])

  return {
    saveConnection,
    deleteConnection,
    restoreConnection,
    setDefault,
    toggleFavorite,
    duplicateConnection,
    updateStatus,
    connect,
    testConnection,
  }
}

export default useConnectionActions
