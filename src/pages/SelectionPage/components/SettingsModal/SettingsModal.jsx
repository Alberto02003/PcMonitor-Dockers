import { useState, useEffect } from 'react'
import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import { isTauri, getAppVersion } from '../../../../services/tauri.js'
import BackupRestore from '../../../../components/Settings/BackupRestore.jsx'
import './SettingsModal.css'

function SettingsModal({
  open,
  settings,
  onClose,
  onUpdateSettings,
  onStoreCredentialsChange,
  onExport,
  onImport,
  onCheckUpdates,
}) {
  const { t } = useTranslation()
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    if (isTauri()) {
      getAppVersion().then(setAppVersion)
    }
  }, [])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{t('settings.title')}</h3>
          <button type="button" className="icon-button" onClick={onClose} title={t('common.close')}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <span>{t('settings.sectionGeneral')}</span>
            <label className="modal-field">
              <span>{t('settings.notifications')}</span>
              <select
                value={settings.notificationDuration}
                onChange={(event) =>
                  onUpdateSettings({ notificationDuration: Number(event.target.value) })
                }
              >
                <option value="800">0.8s</option>
                <option value="1000">1s</option>
                <option value="1500">1.5s</option>
                <option value="2000">2s</option>
                <option value="3000">3s</option>
              </select>
            </label>
          </div>

          <div className="modal-section">
            <span>{t('settings.sectionSecurity')}</span>
            <label className="modal-toggle">
              <span>{t('settings.storeCreds')}</span>
              <input
                type="checkbox"
                checked={settings.storeCredentials}
                onChange={(event) => onStoreCredentialsChange(event.target.checked)}
              />
            </label>
          </div>

          <div className="modal-section">
            <span>{t('settings.sectionBackup')}</span>
            <BackupRestore />
          </div>

          <div className="modal-section">
            <span>{t('settings.sectionLocale')}</span>
            <label className="modal-field">
              <span>{t('settings.language')}</span>
              <select
                value={settings.language}
                onChange={(event) => onUpdateSettings({ language: event.target.value })}
              >
                <option value="es">{t('languages.es')}</option>
                <option value="en">{t('languages.en')}</option>
              </select>
            </label>
          </div>

          {isTauri() && (
            <div className="modal-section">
              <span>{t('updater.title')}</span>
              
              <label className="modal-toggle">
                <span>{t('updater.autoCheck')}</span>
                <input
                  type="checkbox"
                  checked={settings.autoCheckUpdates}
                  onChange={(event) => onUpdateSettings({ autoCheckUpdates: event.target.checked })}
                />
              </label>
              <p className="setting-description">{t('updater.autoCheckDescription')}</p>
              
              <div className="updater-info">
                <span className="version-badge">v{appVersion}</span>
                <button type="button" className="btn btn-outline" onClick={onCheckUpdates}>
                  {t('updater.checkNow')}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        d="m7 7 10 10m0-10L7 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default SettingsModal
