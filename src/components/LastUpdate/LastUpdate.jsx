/**
 * Componente para mostrar ultima actualizacion con tiempo relativo
 */

import { useEffect, useState } from 'react'
import './LastUpdate.css'

/**
 * @param {Object} props
 * @param {Date|string|number} props.timestamp - Timestamp de ultima actualizacion
 * @param {boolean} props.loading - Si esta cargando
 * @param {string} props.error - Mensaje de error
 * @param {Function} props.onRefresh - Callback para refrescar
 * @param {boolean} props.showIcon - Mostrar icono
 * @param {boolean} props.compact - Modo compacto
 */
function LastUpdate({
  timestamp,
  loading = false,
  error,
  onRefresh,
  showIcon = true,
  compact = false,
}) {
  const [relativeTime, setRelativeTime] = useState('')

  // Actualizar tiempo relativo cada segundo
  useEffect(() => {
    if (!timestamp) {
      setRelativeTime('')
      return
    }

    const updateRelativeTime = () => {
      setRelativeTime(getRelativeTime(timestamp))
    }

    updateRelativeTime()
    const interval = setInterval(updateRelativeTime, 1000)

    return () => clearInterval(interval)
  }, [timestamp])

  if (error) {
    return (
      <div className={`last-update last-update--error ${compact ? 'last-update--compact' : ''}`}>
        {showIcon && <ErrorIcon />}
        <span className="last-update__text">Error al actualizar</span>
        {onRefresh && (
          <button
            type="button"
            className="last-update__refresh"
            onClick={onRefresh}
            title="Reintentar"
          >
            <RefreshIcon />
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`last-update last-update--loading ${compact ? 'last-update--compact' : ''}`}>
        {showIcon && <LoadingIcon />}
        <span className="last-update__text">Actualizando...</span>
      </div>
    )
  }

  if (!timestamp) {
    return (
      <div className={`last-update last-update--empty ${compact ? 'last-update--compact' : ''}`}>
        {showIcon && <ClockIcon />}
        <span className="last-update__text">Sin datos</span>
      </div>
    )
  }

  return (
    <div className={`last-update ${compact ? 'last-update--compact' : ''}`}>
      {showIcon && <ClockIcon />}
      <span className="last-update__text">
        {compact ? relativeTime : `Actualizado ${relativeTime}`}
      </span>
      {onRefresh && (
        <button
          type="button"
          className="last-update__refresh"
          onClick={onRefresh}
          title="Actualizar ahora"
          disabled={loading}
        >
          <RefreshIcon />
        </button>
      )}
    </div>
  )
}

/**
 * Obtiene tiempo relativo desde un timestamp
 * @param {Date|string|number} timestamp
 * @returns {string}
 */
function getRelativeTime(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const now = new Date()
  const diffMs = now - date

  if (diffMs < 0) {
    return 'ahora'
  }

  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 5) {
    return 'ahora'
  }
  if (diffSec < 60) {
    return `hace ${diffSec}s`
  }
  if (diffMin < 60) {
    return `hace ${diffMin}m`
  }
  if (diffHour < 24) {
    return `hace ${diffHour}h`
  }
  if (diffDay < 7) {
    return `hace ${diffDay}d`
  }

  return date.toLocaleDateString()
}

function ClockIcon() {
  return (
    <svg className="last-update__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function LoadingIcon() {
  return (
    <svg className="last-update__icon last-update__icon--spin" viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="31.4"
        strokeDashoffset="10"
      />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 4v6h6M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg className="last-update__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

export default LastUpdate
export { getRelativeTime }
