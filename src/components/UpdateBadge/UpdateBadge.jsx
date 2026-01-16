/**
 * Badge de actualización que aparece en la esquina superior izquierda
 * Muestra cuando hay una actualización disponible
 * Detección automática en segundo plano
 */

import { useTranslation } from '../../hooks/useTranslation.jsx'
import './UpdateBadge.css'

function UpdateBadge({ 
  hasUpdate, 
  updateInfo, 
  isChecking, 
  lastCheck,
  onClick 
}) {
  const { t } = useTranslation()

  // Si está checkeando, mostrar indicador de carga
  if (isChecking) {
    return (
      <button 
        className="update-badge update-badge-checking"
        onClick={onClick}
        title={t('updater.checking')}
      >
        <svg className="update-badge-icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
        <span className="update-badge-text">{t('updater.checking')}</span>
      </button>
    )
  }

  // Si hay actualización disponible, mostrar badge con pulsación
  if (hasUpdate && updateInfo) {
    return (
      <button 
        className="update-badge update-badge-available pulse"
        onClick={onClick}
        title={`${t('updater.newVersionAvailable')} v${updateInfo.version}`}
      >
        <svg className="update-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
        <span className="update-badge-text">
          {t('updater.updateAvailable')} v{updateInfo.version}
        </span>
        <span className="update-badge-dot"></span>
      </button>
    )
  }

  // Si no hay actualización, mostrar badge discreto con última verificación
  return (
    <button 
      className="update-badge update-badge-uptodate"
      onClick={onClick}
      title={lastCheck ? `${t('updater.lastCheck')}: ${lastCheck.toLocaleTimeString()}` : t('updater.checkForUpdates')}
    >
      <svg className="update-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <span className="update-badge-text">
        {t('updater.upToDate')}
      </span>
    </button>
  )
}

export default UpdateBadge
