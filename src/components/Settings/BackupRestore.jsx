import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation.jsx'
import { useConnectionsStore } from '../../stores/connectionsStore.js'
import { useNotification } from '../Notification/Notification.jsx'
import { isTauri } from '../../services/tauri.js'
import './BackupRestore.css'

function BackupRestore() {
  const { t } = useTranslation()
  const { showNotification } = useNotification()
  const connections = useConnectionsStore(state => state.connections)
  const importConnections = useConnectionsStore(state => state.importConnections)
  
  const [includeCredentials, setIncludeCredentials] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  /**
   * Exportar conexiones a archivo JSON
   */
  const handleExport = async () => {
    if (connections.length === 0) {
      showNotification(t('settings.noConnectionsToExport'), 'warning')
      return
    }

    setIsExporting(true)
    
    try {
      // Preparar datos de exportación
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        includeCredentials: includeCredentials,
        connections: connections.map(c => {
          const conn = {
            id: c.id,
            name: c.name,
            host: c.host,
            port: c.port,
            username: c.username,
            authType: c.authType,
            notes: c.notes || '',
            group: c.group || 'default',
            tags: c.tags || [],
            color: c.color || '#64ffda',
            isFavorite: c.isFavorite || false,
            isDefault: c.isDefault || false,
          }
          
          // Incluir credenciales si el usuario lo solicitó
          if (includeCredentials) {
            conn.password = c.password || ''
            conn.keyPath = c.keyPath || ''
          } else {
            conn.password = ''
            conn.keyPath = ''
          }
          
          return conn
        })
      }

      // Crear archivo JSON
      const jsonString = JSON.stringify(exportData, null, 2)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `pcmonitor-connections-${timestamp}.json`
      
      if (isTauri()) {
        // En Tauri, usar save dialog
        try {
          const dialog = await import('@tauri-apps/plugin-dialog')
          const fs = await import('@tauri-apps/plugin-fs')
          
          const filePath = await dialog.save({
            defaultPath: filename,
            filters: [{
              name: 'JSON',
              extensions: ['json']
            }]
          })
          
          if (filePath) {
            await fs.writeTextFile(filePath, jsonString)
            showNotification(t('settings.exportSuccess'), 'success')
          } else {
            // Usuario canceló
            setIsExporting(false)
            return
          }
        } catch (err) {
          console.error('Tauri plugin error:', err)
          // Fallback a download del navegador
          const blob = new Blob([jsonString], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          link.click()
          URL.revokeObjectURL(url)
          showNotification(t('settings.exportSuccess'), 'success')
        }
      } else {
        // En navegador, usar download directo
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        
        URL.revokeObjectURL(url)
        showNotification(t('settings.exportSuccess'), 'success')
      }
    } catch (error) {
      console.error('Export error:', error)
      showNotification(t('notifications.exportFail'), 'error')
    } finally {
      setIsExporting(false)
    }
  }

  /**
   * Importar conexiones desde archivo JSON
   */
  const handleImportClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = handleImportFile
    input.click()
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // Validar formato
      if (!data.version || !Array.isArray(data.connections)) {
        showNotification(t('settings.invalidImportFile'), 'error')
        setIsImporting(false)
        return
      }

      // Confirmar importación
      const count = data.connections.length
      const confirmed = window.confirm(
        t('settings.importConfirm').replace('{count}', count)
      )
      
      if (!confirmed) {
        setIsImporting(false)
        return
      }

      // Importar
      const imported = await importConnections(data.connections)
      
      if (imported > 0) {
        showNotification(
          t('settings.importSuccess').replace('{count}', imported),
          'success'
        )
      } else {
        showNotification(t('notifications.importEmpty'), 'warning')
      }
    } catch (error) {
      console.error('Import error:', error)
      showNotification(t('settings.importError'), 'error')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="backup-restore">
      {/* Export Section */}
      <div className="backup-section">
        <div className="backup-header">
          <div className="backup-icon export-icon">
            <DownloadIcon />
          </div>
          <div className="backup-info">
            <h3 className="backup-title">{t('settings.exportConnections')}</h3>
            <p className="backup-description">{t('settings.exportDescription')}</p>
          </div>
        </div>

        <div className="backup-options">
          <label className="backup-checkbox">
            <input
              type="checkbox"
              checked={includeCredentials}
              onChange={(e) => setIncludeCredentials(e.target.checked)}
            />
            <span>{t('settings.includeCredentials')}</span>
          </label>
          <p className="backup-warning">
            {includeCredentials && (
              <>⚠️ Credentials will be included encrypted. Keep the file secure.</>
            )}
          </p>
        </div>

        <button
          type="button"
          className="backup-button export-button"
          onClick={handleExport}
          disabled={isExporting || connections.length === 0}
        >
          {isExporting ? t('common.processing') : t('settings.exportButton')}
          {!isExporting && ` (${connections.length})`}
        </button>
      </div>

      {/* Import Section */}
      <div className="backup-section">
        <div className="backup-header">
          <div className="backup-icon import-icon">
            <UploadIcon />
          </div>
          <div className="backup-info">
            <h3 className="backup-title">{t('settings.importConnections')}</h3>
            <p className="backup-description">{t('settings.importDescription')}</p>
          </div>
        </div>

        <button
          type="button"
          className="backup-button import-button"
          onClick={handleImportClick}
          disabled={isImporting}
        >
          {isImporting ? t('common.processing') : t('settings.importButton')}
        </button>
      </div>
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}

export default BackupRestore
