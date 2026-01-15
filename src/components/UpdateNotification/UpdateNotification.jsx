import { useTranslation } from '../../hooks/useTranslation.jsx'
import './UpdateNotification.css'

/**
 * Notificación discreta que aparece cuando hay una actualización disponible
 * Se muestra en la esquina superior derecha
 */
function UpdateNotification({ updateInfo, onOpenUpdater, onDismiss }) {
  const { t } = useTranslation()

  if (!updateInfo || !updateInfo.available) return null

  return (
    <div className="update-notification">
      <div className="update-notification-content">
        <div className="update-notification-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </div>
        
        <div className="update-notification-text">
          <h4>{t('updater.newVersionAvailable')}</h4>
          <p>v{updateInfo.version}</p>
        </div>

        <div className="update-notification-actions">
          <button 
            className="update-notification-btn update-notification-btn-primary"
            onClick={onOpenUpdater}
            title={t('updater.viewDetails')}
          >
            {t('updater.update')}
          </button>
          <button 
            className="update-notification-btn update-notification-btn-dismiss"
            onClick={onDismiss}
            title={t('common.close')}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

export default UpdateNotification
