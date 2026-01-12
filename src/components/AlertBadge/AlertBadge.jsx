/**
 * Badge de alertas para mostrar en widgets y header
 */

import { useAlertsStore, ALERT_SEVERITY } from '../../stores/alertsStore.js'
import './AlertBadge.css'

/**
 * Badge que muestra el numero de alertas activas
 * @param {Object} props
 * @param {boolean} props.showCount - Mostrar contador
 * @param {boolean} props.animate - Animar cuando hay alertas criticas
 * @param {Function} props.onClick - Callback al hacer click
 */
function AlertBadge({ showCount = true, animate = true, onClick }) {
  const alerts = useAlertsStore((state) => state.alerts)
  const activeAlerts = alerts.filter((a) => !a.acknowledged)
  const criticalAlerts = activeAlerts.filter((a) => a.severity === ALERT_SEVERITY.CRITICAL)

  if (activeAlerts.length === 0) {
    return null
  }

  const hasCritical = criticalAlerts.length > 0
  const severity = hasCritical ? 'critical' : 'warning'

  return (
    <button
      type="button"
      className={`alert-badge alert-badge--${severity} ${animate && hasCritical ? 'alert-badge--animate' : ''}`}
      onClick={onClick}
      title={`${activeAlerts.length} alerta${activeAlerts.length !== 1 ? 's' : ''} activa${activeAlerts.length !== 1 ? 's' : ''}`}
    >
      <AlertIcon />
      {showCount && <span className="alert-badge__count">{activeAlerts.length}</span>}
    </button>
  )
}

/**
 * Lista de alertas activas
 * @param {Object} props
 * @param {Function} props.onAcknowledge - Callback al reconocer alerta
 * @param {Function} props.onDismiss - Callback al descartar alerta
 */
function AlertList({ onAcknowledge, onDismiss }) {
  const alerts = useAlertsStore((state) => state.alerts)
  const acknowledgeAlert = useAlertsStore((state) => state.acknowledgeAlert)
  const removeAlert = useAlertsStore((state) => state.removeAlert)

  const activeAlerts = alerts.filter((a) => !a.acknowledged)

  if (activeAlerts.length === 0) {
    return (
      <div className="alert-list alert-list--empty">
        <CheckIcon />
        <span>Sin alertas activas</span>
      </div>
    )
  }

  const handleAcknowledge = (alertId) => {
    acknowledgeAlert(alertId)
    onAcknowledge?.(alertId)
  }

  const handleDismiss = (alertId) => {
    removeAlert(alertId)
    onDismiss?.(alertId)
  }

  return (
    <div className="alert-list">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`alert-item alert-item--${alert.severity}`}
        >
          <div className="alert-item__icon">
            {alert.severity === ALERT_SEVERITY.CRITICAL && <CriticalIcon />}
            {alert.severity === ALERT_SEVERITY.WARNING && <WarningIcon />}
            {alert.severity === ALERT_SEVERITY.INFO && <InfoIcon />}
          </div>
          <div className="alert-item__content">
            <span className="alert-item__message">{alert.message}</span>
            <span className="alert-item__time">
              {formatTime(alert.timestamp)}
            </span>
          </div>
          <div className="alert-item__actions">
            <button
              type="button"
              className="alert-item__btn"
              onClick={() => handleAcknowledge(alert.id)}
              title="Marcar como leida"
            >
              <CheckIcon />
            </button>
            <button
              type="button"
              className="alert-item__btn alert-item__btn--dismiss"
              onClick={() => handleDismiss(alert.id)}
              title="Descartar"
            >
              <DismissIcon />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Widget compacto de alertas para mostrar en el dashboard
 */
function AlertWidget() {
  const alerts = useAlertsStore((state) => state.alerts)
  const activeAlerts = alerts.filter((a) => !a.acknowledged)
  const criticalCount = activeAlerts.filter((a) => a.severity === ALERT_SEVERITY.CRITICAL).length
  const warningCount = activeAlerts.filter((a) => a.severity === ALERT_SEVERITY.WARNING).length

  return (
    <div className="alert-widget">
      <div className="alert-widget__header">
        <AlertIcon />
        <span>Alertas</span>
      </div>
      <div className="alert-widget__stats">
        {criticalCount > 0 && (
          <div className="alert-widget__stat alert-widget__stat--critical">
            <span className="alert-widget__stat-value">{criticalCount}</span>
            <span className="alert-widget__stat-label">Criticas</span>
          </div>
        )}
        {warningCount > 0 && (
          <div className="alert-widget__stat alert-widget__stat--warning">
            <span className="alert-widget__stat-value">{warningCount}</span>
            <span className="alert-widget__stat-label">Advertencias</span>
          </div>
        )}
        {activeAlerts.length === 0 && (
          <div className="alert-widget__stat alert-widget__stat--ok">
            <CheckIcon />
            <span>Todo OK</span>
          </div>
        )}
      </div>
    </div>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 22h20L12 2z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  )
}

function CriticalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 22h20L12 2z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function DismissIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) {
    return 'Ahora'
  }
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000)
    return `Hace ${mins}m`
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `Hace ${hours}h`
  }
  return date.toLocaleDateString()
}

export default AlertBadge
export { AlertList, AlertWidget }
