import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSettings } from '../Settings/Settings.jsx'
import './Notification.css'

const NotificationContext = createContext(null)

function NotificationProvider({ children }) {
  const { settings } = useSettings()
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    type: 'success',
  })
  const timerRef = useRef(null)

  useEffect(() => {
    if (!notification.open) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      setNotification((prev) => ({ ...prev, open: false }))
    }, settings.notificationDuration || 1000)
    return () => {
      clearTimeout(timerRef.current)
    }
  }, [notification.open, notification.message, settings.notificationDuration])

  const api = useMemo(
    () => ({
      showNotification(message, type = 'success') {
        setNotification({ open: true, message, type })
      },
    }),
    [],
  )

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <NotificationBar
        message={notification.message}
        type={notification.type}
        open={notification.open}
      />
    </NotificationContext.Provider>
  )
}

function NotificationBar({ message, type, open }) {
  if (!message) return null
  return (
    <div className={`notification-bar ${open ? 'is-visible' : ''}`} data-type={type}>
      <span className="notification-icon" aria-hidden="true">
        {type === 'error' ? <ErrorIcon /> : null}
        {type === 'warning' ? <WarningIcon /> : null}
        {type !== 'error' && type !== 'warning' ? <SuccessIcon /> : null}
      </span>
      <span className="notification-text">{message}</span>
    </div>
  )
}

function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification debe usarse dentro de NotificationProvider')
  }
  return context
}

function SuccessIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9.5 17.5 4 12l1.4-1.4 4.1 4.1 9.1-9.1L20 7Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m12 10.6 3.6-3.6 1.4 1.4-3.6 3.6 3.6 3.6-1.4 1.4-3.6-3.6-3.6 3.6-1.4-1.4 3.6-3.6-3.6-3.6L8.4 7Z"
        fill="currentColor"
      />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3 2 21h20Zm0 5a1 1 0 0 1 1 1v6a1 1 0 0 1-2 0V9a1 1 0 0 1 1-1Zm0 11a1.2 1.2 0 1 1 1.2-1.2A1.2 1.2 0 0 1 12 19Z"
        fill="currentColor"
      />
    </svg>
  )
}

export { NotificationProvider, useNotification }
