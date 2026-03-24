import { useEffect, useState } from 'react'
import { NotificationProvider } from '../Notification/Notification.jsx'
import { SettingsProvider } from '../Settings/Settings.jsx'
import SelectionPage from '../../pages/SelectionPage/SelectionPage.jsx'
import MonitoringPage from '../../pages/MonitoringPage/MonitoringPage.jsx'
import TerminalWindow from '../../pages/TerminalWindow/TerminalWindow.jsx'
import PatchNotesModal from '../PatchNotesModal/PatchNotesModal.jsx'
import { useConnectionsStore } from '../../stores/connectionsStore.js'
import { useTranslation } from '../../hooks/useTranslation.jsx'
import { useWhatsNew } from '../../hooks/useWhatsNew.js'
import { showWindow } from '../../services/tauri.js'
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
  const [activeConnection, setActiveConnection] = useState(null)
  const [currentPage, setCurrentPage] = useState('selection')
  const [allowAutoConnect, setAllowAutoConnect] = useState(true)
  const [apiError, setApiError] = useState(null)
  
  const loadConnections = useConnectionsStore(state => state.loadConnections)
  const apiConnected = useConnectionsStore(state => state.apiConnected)

  // Hook para detectar si la app se actualizó y mostrar "What's New"
  const whatsNew = useWhatsNew({ enabled: true })

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

  // Mostrar error de API si existe
  if (apiError) {
    return <ApiErrorScreen error={apiError} onRetry={() => window.location.reload()} />
  }

  return (
    <>
      {/* Patch Notes - shown automatically after app updates */}
      {whatsNew.shouldShow && (
        <PatchNotesModal
          open={whatsNew.shouldShow}
          onClose={whatsNew.onClose}
          whatsNewMode
          whatsNewVersion={whatsNew.currentVersion}
          savedNotes={whatsNew.releaseNotes}
        />
      )}

      {/* Main app content */}
      {currentPage === 'monitoring' ? (
        <MonitoringPage
          connection={activeConnection}
          onBack={() => {
            setAllowAutoConnect(false)
            setCurrentPage('selection')
          }}
        />
      ) : (
        <SelectionPage
          onConnect={(connection) => {
            setActiveConnection(connection)
            setCurrentPage('monitoring')
            setAllowAutoConnect(false)
          }}
          allowAutoConnect={allowAutoConnect}
          onAutoConnectUsed={() => setAllowAutoConnect(false)}
        />
      )}
    </>
  )
}

function App() {
  // Show window once React is ready
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && 
                    window.__TAURI__ !== undefined

    if (isTauri) {
      // Small delay to ensure everything is rendered
      setTimeout(() => {
        showWindow().catch(err => {
          console.error('Failed to show window:', err)
        })
      }, 50)
    }
  }, [])

  // If this is the terminal window, render only the terminal
  // Still needs SettingsProvider for translations
  if (isTerminalWindow()) {
    return (
      <SettingsProvider>
        <TerminalWindow />
      </SettingsProvider>
    )
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
