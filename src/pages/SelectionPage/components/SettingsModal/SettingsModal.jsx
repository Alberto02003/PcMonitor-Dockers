import './SettingsModal.css'

function SettingsModal({
  open,
  settings,
  t,
  onClose,
  onUpdateSettings,
  onStoreCredentialsChange,
  onExport,
  onImport,
}) {
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
          <h3>{t.settingsTitle}</h3>
          <button type="button" className="icon-button" onClick={onClose} title={t.settingsClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <span>{t.settingsSectionGeneral}</span>
            <label className="modal-field">
              <span>{t.settingNotifications}</span>
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
              <span>{t.settingAutoConnect}</span>
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
            <span>{t.settingsSectionSecurity}</span>
            <label className="modal-toggle">
              <span>{t.settingStoreCreds}</span>
              <input
                type="checkbox"
                checked={settings.storeCredentials}
                onChange={(event) => onStoreCredentialsChange(event.target.checked)}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={onExport}>
                {t.exportJson}
              </button>
              <button type="button" className="btn btn-outline" onClick={onImport}>
                {t.importJson}
              </button>
            </div>
          </div>

          <div className="modal-section">
            <span>{t.settingsSectionWindow}</span>
            <label className="modal-field">
              <span>{t.settingWindowSize}</span>
              <select
                value={settings.windowSize}
                onChange={(event) => onUpdateSettings({ windowSize: event.target.value })}
              >
                <option value="small">{t.sizeSmall}</option>
                <option value="medium">{t.sizeMedium}</option>
                <option value="large">{t.sizeLarge}</option>
              </select>
            </label>
          </div>

          <div className="modal-section">
            <span>{t.settingsSectionLocale}</span>
            <label className="modal-field">
              <span>{t.settingLanguage}</span>
              <select
                value={settings.language}
                onChange={(event) => onUpdateSettings({ language: event.target.value })}
              >
                <option value="es">{t.languageEs}</option>
                <option value="en">{t.languageEn}</option>
              </select>
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {t.settingsClose}
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
