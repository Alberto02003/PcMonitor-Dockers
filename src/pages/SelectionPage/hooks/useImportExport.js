/**
 * Hook para gestionar importación y exportación de conexiones
 */

import { useRef, useCallback } from 'react'
import { useConnectionsStore } from '../../../stores/connectionsStore.js'
import { useTranslation } from '../../../hooks/useTranslation.jsx'

/**
 * Hook que proporciona funcionalidad de import/export de conexiones
 * @param {Object} options - Opciones del hook
 * @param {Function} options.showNotification - Función para mostrar notificaciones
 */
export function useImportExport({ showNotification }) {
  const { t } = useTranslation()
  const importInputRef = useRef(null)
  const storeImportConnections = useConnectionsStore(state => state.importConnections)
  const storeExportConnections = useConnectionsStore(state => state.exportConnections)

  const handleExport = useCallback(() => {
    const payload = storeExportConnections()
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `pcmd-connections-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    showNotification(t('notifications.exportOk'), 'success')
  }, [storeExportConnections, showNotification, t])

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click()
  }, [])

  const handleImportFile = useCallback(async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const imported = Array.isArray(payload) ? payload : payload?.connections
      if (!Array.isArray(imported) || imported.length === 0) {
        showNotification(t('notifications.importEmpty'), 'warning')
        return
      }
      const count = await storeImportConnections(imported)
      showNotification(`${t('notifications.importOk')} (${count})`, 'success')
    } catch {
      showNotification(t('notifications.importFail'), 'error')
    }
  }, [storeImportConnections, showNotification, t])

  return {
    importInputRef,
    handleExport,
    handleImportClick,
    handleImportFile,
  }
}

export default useImportExport
