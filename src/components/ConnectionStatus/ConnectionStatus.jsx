/**
 * Componente de estado de conexion con indicador visual
 * Muestra estado de conexion SSH y maneja reintentos automaticos
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import './ConnectionStatus.css'

/**
 * Estados posibles de conexion
 */
// eslint-disable-next-line react-refresh/only-export-components
export const STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
}

/**
 * Configuracion de reintentos con backoff exponencial
 */
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
}

/**
 * @param {Object} props
 * @param {'connected'|'disconnected'|'connecting'|'reconnecting'|'error'} props.status
 * @param {string} props.serverName - Nombre del servidor
 * @param {string} props.error - Mensaje de error si hay
 * @param {boolean} props.autoReconnect - Si debe reintentar automaticamente
 * @param {Function} props.onReconnect - Callback para reintentar conexion
 * @param {Function} props.onDisconnect - Callback para desconectar
 * @param {boolean} props.compact - Modo compacto (solo icono)
 */
function ConnectionStatus({
  status = STATUS.DISCONNECTED,
  serverName,
  error,
  autoReconnect = true,
  onReconnect,
  onDisconnect,
  compact = false,
}) {
  const [retryCount, setRetryCount] = useState(0)
  const [nextRetryIn, setNextRetryIn] = useState(0)
  const retryTimeoutRef = useRef(null)
  const countdownRef = useRef(null)

  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  // Manejar reintentos automaticos
  useEffect(() => {
    if (status === STATUS.CONNECTED) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting state on status change is intentional
      setRetryCount(0)
      setNextRetryIn(0)
      return
    }

    if (
      status === STATUS.ERROR &&
      autoReconnect &&
      retryCount < RETRY_CONFIG.maxRetries &&
      onReconnect
    ) {
      const delay = Math.min(
        RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
        RETRY_CONFIG.maxDelay
      )

      setNextRetryIn(Math.ceil(delay / 1000))

      // Countdown
      countdownRef.current = setInterval(() => {
        setNextRetryIn((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Programar reintento
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1)
        onReconnect()
      }, delay)

      return () => {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
        if (countdownRef.current) clearInterval(countdownRef.current)
      }
    }
  }, [status, autoReconnect, retryCount, onReconnect])

  const handleManualReconnect = useCallback(() => {
    setRetryCount(0)
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    onReconnect?.()
  }, [onReconnect])

  const handleCancelReconnect = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    setNextRetryIn(0)
    setRetryCount(RETRY_CONFIG.maxRetries) // Detener reintentos
  }, [])

  const getStatusLabel = () => {
    switch (status) {
      case STATUS.CONNECTED:
        return 'Conectado'
      case STATUS.CONNECTING:
        return 'Conectando...'
      case STATUS.RECONNECTING:
        return `Reconectando (${retryCount}/${RETRY_CONFIG.maxRetries})...`
      case STATUS.ERROR:
        if (nextRetryIn > 0) {
          return `Reintentando en ${nextRetryIn}s...`
        }
        return 'Error de conexion'
      case STATUS.DISCONNECTED:
      default:
        return 'Desconectado'
    }
  }

  if (compact) {
    return (
      <div
        className={`connection-status connection-status--compact connection-status--${status}`}
        title={getStatusLabel()}
      >
        <StatusIcon status={status} />
      </div>
    )
  }

  return (
    <div className={`connection-status connection-status--${status}`}>
      <div className="connection-status__indicator">
        <StatusIcon status={status} />
        {(status === STATUS.CONNECTING || status === STATUS.RECONNECTING) && (
          <span className="connection-status__pulse" />
        )}
      </div>

      <div className="connection-status__info">
        <span className="connection-status__label">{getStatusLabel()}</span>
        {serverName && status === STATUS.CONNECTED && (
          <span className="connection-status__server">{serverName}</span>
        )}
        {error && status === STATUS.ERROR && (
          <span className="connection-status__error" title={error}>
            {truncateError(error)}
          </span>
        )}
      </div>

      <div className="connection-status__actions">
        {status === STATUS.ERROR && nextRetryIn > 0 && (
          <button
            type="button"
            className="connection-status__btn connection-status__btn--cancel"
            onClick={handleCancelReconnect}
            title="Cancelar reconexion"
          >
            <CancelIcon />
          </button>
        )}
        {(status === STATUS.ERROR || status === STATUS.DISCONNECTED) && (
          <button
            type="button"
            className="connection-status__btn connection-status__btn--reconnect"
            onClick={handleManualReconnect}
            title="Reconectar"
          >
            <ReconnectIcon />
          </button>
        )}
        {status === STATUS.CONNECTED && onDisconnect && (
          <button
            type="button"
            className="connection-status__btn connection-status__btn--disconnect"
            onClick={onDisconnect}
            title="Desconectar"
          >
            <DisconnectIcon />
          </button>
        )}
      </div>
    </div>
  )
}

function StatusIcon({ status }) {
  switch (status) {
    case STATUS.CONNECTED:
      return (
        <svg className="connection-status__icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" fill="currentColor" />
        </svg>
      )
    case STATUS.CONNECTING:
    case STATUS.RECONNECTING:
      return (
        <svg className="connection-status__icon connection-status__icon--spin" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="25" />
        </svg>
      )
    case STATUS.ERROR:
      return (
        <svg className="connection-status__icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" fill="currentColor" />
          <line x1="9" y1="9" x2="15" y2="15" stroke="#fff" strokeWidth="2" />
          <line x1="15" y1="9" x2="9" y2="15" stroke="#fff" strokeWidth="2" />
        </svg>
      )
    default:
      return (
        <svg className="connection-status__icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" fill="currentColor" />
        </svg>
      )
  }
}

function ReconnectIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 4v6h6M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  )
}

function DisconnectIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18.36 6.64A9 9 0 1 1 5.64 5.64" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  )
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function truncateError(error, maxLength = 50) {
  if (!error) return ''
  const message = String(error)
  if (message.length <= maxLength) return message
  return message.slice(0, maxLength) + '...'
}

export default ConnectionStatus
