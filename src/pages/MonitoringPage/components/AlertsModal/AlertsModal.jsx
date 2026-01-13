import { useNotifications, NOTIFICATION_TYPES } from '../../../../hooks/useNotifications.js'
import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './AlertsModal.css'

function AlertsModal({ open, alerts, alertFields, onClose, onSave, onUpdateAlertEnabled, onUpdateAlertValue }) {
  const { t } = useTranslation()
  const { notify, sendDirect, permission, isSupported } = useNotifications()

  const handleTestNotification = async () => {
    console.log('[AlertsModal] Testing notification...', { permission, isSupported })
    
    // Intentar envío directo primero
    const success = await sendDirect(
      t('notifications.testNotification'),
      t('notifications.testNotificationMsg')
    )
    
    if (!success) {
      // Fallback al método normal
      notify(t('notifications.testNotification'), {
        type: NOTIFICATION_TYPES.WARNING,
        body: t('notifications.testNotificationMsg'),
      })
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel modal-panel-wide"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{t('alerts.title')}</h3>
          <button type="button" className="icon-button" onClick={onClose} title={t('common.close')}>
            x
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <span>{t('alerts.advancedConfig')}</span>
            <div className="alerts-grid">
              {alertFields.map((field) => {
                const alert = alerts[field.key] || {}
                return (
                  <div key={field.key} className="alert-row">
                    <div className="alert-label">
                      <span>{field.label}</span>
                      {field.unit && <small>{field.unit}</small>}
                    </div>
                    <div className="alert-controls">
                      <label className="alert-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(alert.enabled)}
                          onChange={(event) => onUpdateAlertEnabled(field.key, event.target.checked)}
                        />
                        <span>{t('alerts.active')}</span>
                      </label>
                      {!field.noValue && (
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={alert.value ?? ''}
                          onChange={(event) =>
                            onUpdateAlertValue(
                              field.key,
                              event.target.value === '' ? '' : Number(event.target.value),
                            )
                          }
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleTestNotification}
            title={`${t('alerts.support')} ${isSupported ? t('common.yes') : t('common.no')}, ${t('alerts.permission')} ${permission}`}
          >
            {t('alerts.testNotification')}
          </button>
          <button type="button" className="btn btn-outline" onClick={onSave}>
            {t('alerts.saveAlerts')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AlertsModal
