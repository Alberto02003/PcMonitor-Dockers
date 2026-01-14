import { useState, useEffect, useCallback } from 'react'
import { checkForUpdates, downloadAndInstallUpdate, getAppVersion } from '../../services/tauri.js'
import { useTranslation } from '../../hooks/useTranslation.jsx'
import './UpdaterModal.css'

function UpdaterModal({ open, onClose }) {
  const { t } = useTranslation()
  
  const [checking, setChecking] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [currentVersion, setCurrentVersion] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState({ downloaded: 0, total: 0 })
  const [error, setError] = useState(null)

  // Get current version on mount
  useEffect(() => {
    getAppVersion().then(setCurrentVersion)
  }, [])

  // Check for updates when modal opens
  useEffect(() => {
    if (open && !updateInfo && !checking) {
      handleCheckUpdates()
    }
  }, [open])

  const handleCheckUpdates = useCallback(async () => {
    setChecking(true)
    setError(null)
    setUpdateInfo(null)
    
    try {
      const result = await checkForUpdates()
      if (result === null) {
        setError(t('updater.error'))
      } else {
        setUpdateInfo(result)
      }
    } catch (err) {
      setError(err?.message || t('updater.error'))
    } finally {
      setChecking(false)
    }
  }, [t])

  const handleDownload = useCallback(async () => {
    if (!updateInfo?.update) return
    
    setDownloading(true)
    setProgress({ downloaded: 0, total: 0 })
    
    try {
      await downloadAndInstallUpdate(updateInfo, (downloaded, total) => {
        setProgress({ downloaded, total })
      })
      // App will restart, so we don't need to handle success
    } catch (err) {
      setError(err?.message || 'Download failed')
      setDownloading(false)
    }
  }, [updateInfo])

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const progressPercent = progress.total > 0 
    ? Math.round((progress.downloaded / progress.total) * 100) 
    : 0

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal updater-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('updater.title')}</h2>
          <button type="button" className="btn btn-ghost btn-close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="modal-body">
          {/* Checking state */}
          {checking && (
            <div className="updater-checking">
              <div className="spinner" />
              <p>{t('updater.checking')}</p>
            </div>
          )}

          {/* Error state */}
          {error && !checking && (
            <div className="updater-error">
              <p>{error}</p>
              <button type="button" className="btn btn-outline" onClick={handleCheckUpdates}>
                {t('actions.retry')}
              </button>
            </div>
          )}

          {/* No update available */}
          {updateInfo && !updateInfo.available && !checking && (
            <div className="updater-no-update">
              <div className="check-icon">✓</div>
              <p>{t('updater.notAvailable')}</p>
              <p className="version-info">
                {t('updater.currentVersion')}: <strong>v{currentVersion}</strong>
              </p>
            </div>
          )}

          {/* Update available */}
          {updateInfo?.available && !downloading && !checking && (
            <div className="updater-available">
              <div className="update-icon">↑</div>
              <h3>{t('updater.available')}</h3>
              
              <div className="version-comparison">
                <div className="version-item">
                  <span className="version-label">{t('updater.currentVersion')}</span>
                  <span className="version-number">v{currentVersion}</span>
                </div>
                <div className="version-arrow">→</div>
                <div className="version-item">
                  <span className="version-label">{t('updater.newVersion')}</span>
                  <span className="version-number new">v{updateInfo.version}</span>
                </div>
              </div>

              {updateInfo.notes && (
                <div className="release-notes">
                  <h4>{t('updater.releaseNotes')}</h4>
                  <div className="notes-content">
                    {updateInfo.notes}
                  </div>
                </div>
              )}

              <p className="restart-warning">{t('updater.restartRequired')}</p>
            </div>
          )}

          {/* Downloading state */}
          {downloading && (
            <div className="updater-downloading">
              <h3>{t('updater.downloading')}</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="progress-text">
                {formatBytes(progress.downloaded)} / {formatBytes(progress.total)} ({progressPercent}%)
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {updateInfo?.available && !downloading && (
            <>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                {t('updater.later')}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleDownload}>
                {t('updater.download')}
              </button>
            </>
          )}
          
          {!updateInfo?.available && !checking && !error && (
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {t('common.close')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default UpdaterModal
