import { useState, useEffect, useCallback, useMemo } from 'react'
import { downloadAndInstallUpdate, relaunchApp, getAppVersion } from '../../services/tauri.js'
import { useTranslation } from '../../hooks/useTranslation.jsx'
import { parseReleaseBody, hasContent } from '../../utils/releaseNotesParser.js'
import { formatBytes } from '../../utils/metricsUtils.js'
import './UpdaterModal.css'

function UpdaterModal({ open, onClose, updateInfo, isChecking, error: checkError, onRetryCheck }) {
  const { t } = useTranslation()

  const [currentVersion, setCurrentVersion] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [progress, setProgress] = useState({ downloaded: 0, total: 0 })
  const [downloadError, setDownloadError] = useState(null)

  useEffect(() => {
    getAppVersion().then(setCurrentVersion)
  }, [])

  // Reset download state when modal reopens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting download state when modal opens is intentional
      setDownloading(false)
      setInstalled(false)
      setProgress({ downloaded: 0, total: 0 })
      setDownloadError(null)
    }
  }, [open])

  // Trigger check when modal opens with no info
  useEffect(() => {
    if (open && !updateInfo && !isChecking && onRetryCheck) {
      onRetryCheck()
    }
  }, [open, updateInfo, isChecking, onRetryCheck])

  const handleDownload = useCallback(async () => {
    if (!updateInfo?.update) return

    setDownloading(true)
    setDownloadError(null)
    setProgress({ downloaded: 0, total: 0 })

    try {
      // Save release notes before install for post-restart display
      if (updateInfo.notes && updateInfo.version) {
        try {
          localStorage.setItem(`release_notes_${updateInfo.version}`, updateInfo.notes)
        } catch (e) {
          console.warn('Could not save release notes:', e)
        }
      }

      await downloadAndInstallUpdate(updateInfo, (downloaded, total) => {
        setProgress({ downloaded, total })
      })

      setInstalled(true)
      setDownloading(false)
    } catch (err) {
      setDownloadError(err?.message || t('updater.error'))
      setDownloading(false)
    }
  }, [updateInfo, t])

  const handleRestart = useCallback(async () => {
    await relaunchApp()
  }, [])

  const progressPercent = progress.total > 0
    ? Math.round((progress.downloaded / progress.total) * 100)
    : 0

  if (!open) return null

  const error = downloadError || checkError

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal updater-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('updater.title')}</h2>
          {!downloading && (
            <button type="button" className="btn btn-ghost btn-close" onClick={onClose}>
              x
            </button>
          )}
        </div>

        <div className="modal-body">
          {/* Checking state */}
          {isChecking && !downloading && (
            <div className="updater-checking">
              <div className="spinner" />
              <p>{t('updater.checking')}</p>
            </div>
          )}

          {/* Error state (check or download) */}
          {error && !isChecking && !downloading && !installed && (
            <div className="updater-error">
              <p>{error}</p>
              <div className="updater-error-actions">
                {downloadError ? (
                  <button type="button" className="btn btn-outline" onClick={handleDownload}>
                    {t('updater.retryDownload') || t('actions.retry')}
                  </button>
                ) : (
                  <button type="button" className="btn btn-outline" onClick={onRetryCheck}>
                    {t('actions.retry')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* No update available */}
          {updateInfo && !updateInfo.available && !isChecking && !error && (
            <div className="updater-no-update">
              <div className="check-icon">✓</div>
              <p>{t('updater.notAvailable')}</p>
              <p className="version-info">
                {t('updater.currentVersion')}: <strong>v{currentVersion}</strong>
              </p>
              {updateInfo.noReleases && (
                <p className="no-releases-hint">{t('updater.noReleases')}</p>
              )}
            </div>
          )}

          {/* Update available */}
          {updateInfo?.available && !downloading && !isChecking && !installed && !downloadError && (
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

              {updateInfo.notes && <ParsedNotes notes={updateInfo.notes} t={t} />}

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

          {/* Installed - pending restart */}
          {installed && (
            <div className="updater-installed">
              <div className="check-icon">✓</div>
              <h3>{t('updater.installed')}</h3>
              <p>{t('updater.restartToApply')}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {/* Update available - show download + later */}
          {updateInfo?.available && !downloading && !installed && !downloadError && (
            <>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                {t('updater.later')}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleDownload}>
                {t('updater.download')}
              </button>
            </>
          )}

          {/* Installed - restart now or later */}
          {installed && (
            <>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                {t('updater.restartLater')}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleRestart}>
                {t('updater.restartNow')}
              </button>
            </>
          )}

          {/* No update / error without download - close */}
          {!updateInfo?.available && !isChecking && !error && !installed && (
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {t('common.close')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ParsedNotes({ notes, t }) {
  const parsed = useMemo(() => parseReleaseBody(notes), [notes])

  if (!hasContent(parsed)) {
    return (
      <div className="release-notes">
        <h4>{t('updater.releaseNotes')}</h4>
        <div className="notes-content">{notes}</div>
      </div>
    )
  }

  return (
    <div className="release-notes">
      <h4>{t('updater.releaseNotes')}</h4>
      <div className="notes-content parsed">
        {parsed.features.length > 0 && (
          <div className="notes-section">
            <span className="notes-section-title">✨ {t('patchNotes.features')}</span>
            <ul>{parsed.features.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </div>
        )}
        {parsed.fixes.length > 0 && (
          <div className="notes-section">
            <span className="notes-section-title">🐛 {t('patchNotes.fixes')}</span>
            <ul>{parsed.fixes.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </div>
        )}
        {parsed.improvements.length > 0 && (
          <div className="notes-section">
            <span className="notes-section-title">⚡ {t('patchNotes.improvements')}</span>
            <ul>{parsed.improvements.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default UpdaterModal
