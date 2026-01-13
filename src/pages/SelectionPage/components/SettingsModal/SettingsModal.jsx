import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './SettingsModal.css'

function SettingsModal({
  open,
  settings,
  onClose,
  onUpdateSettings,
  onStoreCredentialsChange,
  onExport,
  onImport,
}) {
  const { t } = useTranslation()

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
            <label className="modal-toggle">
              <span>{t('settings.autoConnect')}</span>
              <input
                type="checkbox"
                checked={settings.autoConnectDefault}
                onChange={(event) =>
                  onUpdateSettings({ autoConnectDefault: event.target.checked })
                }
              />
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
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={onExport}>
                {t('actions.exportJson')}
              </button>
              <button type="button" className="btn btn-outline" onClick={onImport}>
                {t('actions.importJson')}
              </button>
            </div>
          </div>

          <div className="modal-section">
            <span>{t('settings.sectionWindow')}</span>
            <label className="modal-field">
              <span>{t('settings.windowSize')}</span>
              <select
                value={settings.windowSize}
                onChange={(event) => onUpdateSettings({ windowSize: event.target.value })}
              >
                <option value="small">{t('settings.sizeSmall')}</option>
                <option value="medium">{t('settings.sizeMedium')}</option>
                <option value="large">{t('settings.sizeLarge')}</option>
              </select>
            </label>
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
