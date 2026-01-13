import { useState, useCallback, useEffect } from 'react'
import { useRealTimeMetrics, useRealTimeContainers } from '../../hooks/useRealTimeData.js'
import { alertFields } from './constants/alertsConfig.js'
import { useAlertsConfig } from './hooks/useAlertsConfig.js'
import { useWidgetOrder } from './hooks/useWidgetOrder.js'
import { useDockerModal } from './hooks/useDockerModal.js'
import { useAlertNotifications } from './hooks/useAlertNotifications.js'
import { useReportsModal } from './hooks/useReportsModal.js'
import { useTranslation } from '../../hooks/useTranslation.jsx'
import { isTauri } from '../../services/tauri.js'
import MonitoringHeader from './components/MonitoringHeader/MonitoringHeader.jsx'
import SystemWidgets from './components/SystemWidgets/SystemWidgets.jsx'
import DockersSection from './components/DockersSection/DockersSection.jsx'
import TerminalSection from './components/TerminalSection/TerminalSection.jsx'
import DockerModal from './components/DockerModal/DockerModal.jsx'
import AlertsModal from './components/AlertsModal/AlertsModal.jsx'
import ReportsModal from './components/ReportsModal/ReportsModal.jsx'
import './MonitoringPage.css'

function MonitoringPage({ connection, onBack }) {
  const { t } = useTranslation()
  const [view, setView] = useState('system')
  
  // Terminal state - persists across view changes
  const [terminalHistory, setTerminalHistory] = useState([])
  const [terminalCommandHistory, setTerminalCommandHistory] = useState([])
  const [isTerminalPoppedOut, setIsTerminalPoppedOut] = useState(false)

  // Custom hooks para gestión de estado
  const {
    alerts,
    alertsOpen,
    openAlerts,
    closeAlerts,
    updateAlertValue,
    updateAlertEnabled,
    saveAlerts,
  } = useAlertsConfig(connection?.id)

  const {
    widgetOrder,
    draggingId,
    dragOverId,
    handleDragStart,
    handleDragEnter,
  } = useWidgetOrder(connection?.id)

  const {
    dockerModalOpen,
    activeDocker,
    dockerPanel,
    openDocker,
    closeDocker,
    changePanel,
  } = useDockerModal()

  const {
    reportsOpen,
    openReports,
    closeReports,
    isGenerating,
    generateReport,
  } = useReportsModal(connection?.id)

  // Real-time data from SSH connection
  // Intervals optimized for performance: metrics every 5s, containers every 10s
  const { 
    metrics, 
    loading: metricsLoading, 
    error: metricsError, 
    lastUpdate 
  } = useRealTimeMetrics(connection?.id, 5000)
  
  const {
    containers,
    loading: containersLoading,
    error: containersError,
    refresh: refreshContainers,
  } = useRealTimeContainers(connection?.id, 10000)

  // Sistema de notificaciones de alertas
  useAlertNotifications({
    metrics,
    metricsLoading,
    containers,
    containersLoading,
    alerts,
    connection,
  })
  
  const connectionLabel = connection
    ? `${connection.name} - ${connection.username}@${connection.host}:${connection.port || 22}`
    : t('common.noConnection')

  // Callback to refresh containers after docker action
  const handleDockerAction = useCallback(() => {
    setTimeout(refreshContainers, 1000)
  }, [refreshContainers])

  // Handle view change
  const handleViewChange = useCallback((newView) => {
    setView(newView)
  }, [])

  // Terminal pop-out functionality
  const handleTerminalPopout = useCallback(async () => {
    if (!isTauri() || !connection) return

    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
      const { emit, listen } = await import('@tauri-apps/api/event')

      // Set up listeners BEFORE creating window
      // Listen for when the window is ready
      const unlistenReady = await listen('terminal-window-ready', async () => {
        console.log('Terminal window ready, sending init data')
        // Send initial data to the terminal window
        await emit('terminal-init', {
          connectionId: connection.id,
          serverHost: connection.host,
          history: terminalHistory,
          commandHistory: terminalCommandHistory,
        })
        unlistenReady()
      })

      // Listen for terminal sync events (history updates from external window)
      const unlistenSync = await listen('terminal-sync', (event) => {
        const { history, commandHistory } = event.payload
        setTerminalHistory(history)
        setTerminalCommandHistory(commandHistory)
      })

      console.log('Creating terminal window...')
      
      // Create the external terminal window
      const terminalWindow = new WebviewWindow('terminal-window', {
        url: '/#/terminal-window',
        title: `Terminal SSH - ${connection.host}`,
        width: 900,
        height: 600,
        minWidth: 600,
        minHeight: 400,
        center: true,
        decorations: true,
        resizable: true,
      })

      // Listen for pop-in event (when user wants to return terminal to main window)
      const unlistenPopin = await listen('terminal-popin', async (event) => {
        console.log('Received terminal-popin, closing external window')
        const { history, commandHistory } = event.payload
        setTerminalHistory(history)
        setTerminalCommandHistory(commandHistory)
        setIsTerminalPoppedOut(false)
        unlistenSync()
        unlistenPopin()
        
        // Close the terminal window from the main window
        try {
          await terminalWindow.close()
          console.log('Terminal window closed from main')
        } catch (err) {
          console.log('Error closing terminal window:', err)
          try {
            await terminalWindow.destroy()
          } catch (e) {
            console.log('Destroy also failed:', e)
          }
        }
      })

      // Wait for the window to be created
      terminalWindow.once('tauri://created', () => {
        console.log('Terminal window created successfully')
        setIsTerminalPoppedOut(true)
      })

      terminalWindow.once('tauri://error', (e) => {
        console.error('Failed to create terminal window:', e)
        unlistenReady()
        unlistenSync()
        unlistenPopin()
      })

      // Handle window close event (user closes via X button)
      terminalWindow.onCloseRequested(async () => {
        console.log('Terminal window close requested via X')
        setIsTerminalPoppedOut(false)
        unlistenSync()
        unlistenPopin()
      })

    } catch (error) {
      console.error('Failed to open terminal window:', error)
    }
  }, [connection, terminalHistory, terminalCommandHistory])

  // Cleanup listeners when component unmounts or connection changes
  useEffect(() => {
    return () => {
      // If terminal is popped out when we leave, it will be orphaned
      // The external window will handle its own cleanup
    }
  }, [])

  return (
    <div className="monitoring-page">
      <MonitoringHeader
        view={view}
        onViewChange={handleViewChange}
        onBack={onBack}
        onOpenAlerts={openAlerts}
        onOpenReports={openReports}
        connectionLabel={connectionLabel}
      />

      {/* Show error banner if there are errors */}
      {(metricsError || containersError) && (
        <div className="monitoring-error">
          <span className="error-icon">!</span>
          <span>{metricsError || containersError}</span>
        </div>
      )}

      {view === 'system' && (
        <SystemWidgets
          widgetOrder={widgetOrder}
          draggingId={draggingId}
          dragOverId={dragOverId}
          onDragStart={handleDragStart}
          onDragEnter={handleDragEnter}
          metrics={metrics}
          metricsLoading={metricsLoading}
          metricsError={metricsError}
          lastUpdate={lastUpdate}
        />
      )}

      {view === 'dockers' && (
        <DockersSection 
          onOpenDocker={openDocker} 
          connectionId={connection?.id}
          containers={containers}
          loading={containersLoading}
          error={containersError}
          onDockerAction={handleDockerAction}
          serverHost={connection?.host}
        />
      )}

      {view === 'terminal' && !isTerminalPoppedOut && (
        <TerminalSection
          connectionId={connection?.id}
          serverHost={connection?.host}
          history={terminalHistory}
          setHistory={setTerminalHistory}
          commandHistory={terminalCommandHistory}
          setCommandHistory={setTerminalCommandHistory}
          isPoppedOut={false}
          onPopout={handleTerminalPopout}
        />
      )}

      {view === 'terminal' && isTerminalPoppedOut && (
        <div className="terminal-popped-out-message">
          <div className="popped-out-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
          <p>{t('terminal.poppedOutMessage')}</p>
          <span className="hint">{t('terminal.closeExternalHint')}</span>
        </div>
      )}

      <DockerModal
        open={dockerModalOpen}
        activeDocker={activeDocker}
        dockerPanel={dockerPanel}
        onClose={closeDocker}
        onPanelChange={changePanel}
        connection={connection}
      />

      <AlertsModal
        open={alertsOpen}
        alerts={alerts}
        alertFields={alertFields}
        onClose={closeAlerts}
        onSave={saveAlerts}
        onUpdateAlertEnabled={updateAlertEnabled}
        onUpdateAlertValue={updateAlertValue}
      />

      <ReportsModal
        open={reportsOpen}
        connection={connection}
        onClose={closeReports}
        onGenerate={generateReport}
        isGenerating={isGenerating}
      />
    </div>
  )
}

export default MonitoringPage
