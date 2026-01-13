import { useEffect, useState } from 'react'
import { NotificationProvider } from '../Notification/Notification.jsx'
import { SettingsProvider } from '../Settings/Settings.jsx'
import SplashPage from '../../pages/SplashPage/SplashPage.jsx'
import SelectionPage from '../../pages/SelectionPage/SelectionPage.jsx'
import MonitoringPage from '../../pages/MonitoringPage/MonitoringPage.jsx'
import TerminalWindow from '../../pages/TerminalWindow/TerminalWindow.jsx'
import { useConnectionsStore } from '../../stores/connectionsStore.js'
import { useTranslation } from '../../hooks/useTranslation.jsx'
import './App.css'

// Check if we're in the terminal window (based on URL hash)
const isTerminalWindow = () => {
  return window.location.hash === '#/terminal-window'
}

// Error screen component that uses translations
function ApiErrorScreen({ error, onRetry }) {
  const { t } = useTranslation()
  
  return (
    <div className="db-error-screen">
      <div className="db-error-content">
        <h2>{t('app.connectionError')}</h2>
        <p>{t('app.apiConnectionFailed')}</p>
        <p className="db-error-detail">{error}</p>
        <div className="db-error-help">
          <p>{t('app.ensureDocker')}</p>
          <ul>
            <li>{t('app.dockerRunning')}</li>
            <li>{t('app.containersStarted')}</li>
            <li>{t('app.runCommand')} <code>cd bd && docker-compose up -d</code></li>
          </ul>
        </div>
        <button onClick={onRetry}>
          {t('app.retry')}
        </button>
      </div>
    </div>
  )
}

// Main app content
function AppContent() {
  const [showSplash, setShowSplash] = useState(true)
  const [activeConnection, setActiveConnection] = useState(null)
  const [currentPage, setCurrentPage] = useState('selection')
  const [allowAutoConnect, setAllowAutoConnect] = useState(true)
  const [apiError, setApiError] = useState(null)
  
  const loadConnections = useConnectionsStore(state => state.loadConnections)
  const apiConnected = useConnectionsStore(state => state.apiConnected)

  // Inicializar API y cargar conexiones
  useEffect(() => {
    const init = async () => {
      try {
        const connections = await loadConnections()
        if (connections.length === 0 && !apiConnected) {
          // Solo mostrar error si realmente no hay conexion
          const store = useConnectionsStore.getState()
          if (!store.apiConnected && store.error) {
            setApiError(store.error)
          }
        }
      } catch (error) {
        console.error('API init error:', error)
        setApiError(error.message || error.toString())
      }
    }
    init()
  }, [loadConnections, apiConnected])

  // Splash screen timer
  useEffect(() => {
    const timerId = setTimeout(() => setShowSplash(false), 2000)
    return () => clearTimeout(timerId)
  }, [])

  // Mostrar error de API si existe
  if (apiError && !showSplash) {
    return <ApiErrorScreen error={apiError} onRetry={() => window.location.reload()} />
  }

  if (showSplash) {
    return <SplashPage />
  }

  if (currentPage === 'monitoring') {
    return (
      <MonitoringPage
        connection={activeConnection}
        onBack={() => {
          setAllowAutoConnect(false)
          setCurrentPage('selection')
        }}
      />
    )
  }

  return (
    <SelectionPage
      onConnect={(connection) => {
        setActiveConnection(connection)
        setCurrentPage('monitoring')
        setAllowAutoConnect(false)
      }}
      allowAutoConnect={allowAutoConnect}
      onAutoConnectUsed={() => setAllowAutoConnect(false)}
    />
  )
}

function App() {
  // If this is the terminal window, render only the terminal
  if (isTerminalWindow()) {
    return <TerminalWindow />
  }

  return (
    <SettingsProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </SettingsProvider>
  )
}

export default App
