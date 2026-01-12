import { useEffect, useMemo, useState } from 'react'
import { useRealTimeMetrics, useRealTimeContainers } from '../../hooks/useRealTimeData.js'
import { useMetricsHistory } from '../../hooks/useMetricsHistory.js'
import MonitoringHeader from './components/MonitoringHeader/MonitoringHeader.jsx'
import SystemWidgets from './components/SystemWidgets/SystemWidgets.jsx'
import DockersSection from './components/DockersSection/DockersSection.jsx'
import DockerModal from './components/DockerModal/DockerModal.jsx'
import AlertsModal from './components/AlertsModal/AlertsModal.jsx'
import MetricsCharts from '../../components/MetricsCharts/MetricsCharts.jsx'
import './MonitoringPage.css'

const ALERTS_KEY_PREFIX = 'pcmd.alerts.v1'
const WIDGETS_KEY_PREFIX = 'pcmd.widgets.v1'

const defaultAlerts = {
  cpuUsage: { enabled: true, value: 85 },
  gpuUsage: { enabled: true, value: 85 },
  ramUsage: { enabled: true, value: 85 },
  diskUsage: { enabled: true, value: 90 },
  swapUsage: { enabled: false, value: 70 },
  cpuTemp: { enabled: true, value: 80 },
  gpuTemp: { enabled: false, value: 85 },
  loadAvg: { enabled: true, value: 1.5 },
  netIn: { enabled: false, value: 50 },
  netOut: { enabled: false, value: 50 },
  ioRead: { enabled: false, value: 120 },
  ioWrite: { enabled: false, value: 120 },
  latency: { enabled: false, value: 150 },
  dockerDown: { enabled: true },
  restarts: { enabled: false, value: 3 },
}

function MonitoringPage({ connection, onBack }) {
  const [view, setView] = useState('system')
  const [widgetOrder, setWidgetOrder] = useState([
    'hero',
    'core-grid',
    'extended-grid',
    'details',
    'specs',
  ])
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [widgetsLoaded, setWidgetsLoaded] = useState(false)
  const [dockerModalOpen, setDockerModalOpen] = useState(false)
  const [activeDocker, setActiveDocker] = useState(null)
  const [dockerPanel, setDockerPanel] = useState('metrics')
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [alerts, setAlerts] = useState(defaultAlerts)
  
  // Real-time data from SSH connection (no mock data)
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

  // Metrics history for charts (24h retention, 1000 max points)
  const metricsHistory = useMetricsHistory(connection?.id, {
    retention: 24 * 60 * 60 * 1000, // 24 hours
    maxPoints: 1000,
    autoSave: true
  })
  
  const connectionLabel = connection
    ? `${connection.name} - ${connection.username}@${connection.host}:${connection.port || 22}`
    : 'Sin conexion activa'

  const alertsKey = useMemo(
    () => `${ALERTS_KEY_PREFIX}.${connection?.id || 'global'}`,
    [connection],
  )

  const widgetsKey = useMemo(
    () => `${WIDGETS_KEY_PREFIX}.${connection?.id || 'global'}`,
    [connection],
  )

  const alertFields = useMemo(
    () => [
      { key: 'cpuUsage', label: 'CPU (%)', unit: '%' },
      { key: 'gpuUsage', label: 'GPU (%)', unit: '%' },
      { key: 'ramUsage', label: 'RAM (%)', unit: '%' },
      { key: 'diskUsage', label: 'Disco (%)', unit: '%' },
      { key: 'swapUsage', label: 'Swap (%)', unit: '%' },
      { key: 'cpuTemp', label: 'Temp CPU (C)', unit: 'C' },
      { key: 'gpuTemp', label: 'Temp GPU (C)', unit: 'C' },
      { key: 'loadAvg', label: 'Carga promedio', unit: '' },
      { key: 'netIn', label: 'Red entrada (Mb/s)', unit: 'Mb/s' },
      { key: 'netOut', label: 'Red salida (Mb/s)', unit: 'Mb/s' },
      { key: 'ioRead', label: 'IO lectura (MB/s)', unit: 'MB/s' },
      { key: 'ioWrite', label: 'IO escritura (MB/s)', unit: 'MB/s' },
      { key: 'latency', label: 'Latencia (ms)', unit: 'ms' },
      { key: 'dockerDown', label: 'Contenedor caido', unit: '', noValue: true },
      { key: 'restarts', label: 'Reinicios (>=)', unit: '' },
    ],
    [],
  )

  useEffect(() => {
    try {
      const stored = localStorage.getItem(alertsKey)
      if (!stored) {
        setAlerts(defaultAlerts)
        return
      }
      const parsed = JSON.parse(stored)
      setAlerts({ ...defaultAlerts, ...parsed })
    } catch {
      setAlerts(defaultAlerts)
    }
  }, [alertsKey])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(widgetsKey)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setWidgetOrder(parsed)
      }
    } catch {
      // Ignore invalid stored widget order.
    } finally {
      setWidgetsLoaded(true)
    }
  }, [widgetsKey])

  useEffect(() => {
    if (!widgetsLoaded) return
    localStorage.setItem(widgetsKey, JSON.stringify(widgetOrder))
  }, [widgetsKey, widgetOrder, widgetsLoaded])

  function updateAlertValue(key, value) {
    setAlerts((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }))
  }

  function updateAlertEnabled(key, enabled) {
    setAlerts((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled },
    }))
  }

  function handleSaveAlerts() {
    localStorage.setItem(alertsKey, JSON.stringify(alerts))
    setAlertsOpen(false)
  }

  function handleDragStart(id) {
    setDraggingId(id)
  }

  function handleDragEnter(id) {
    if (!draggingId || draggingId === id) return
    setDragOverId(id)
    setWidgetOrder((prev) => {
      const next = [...prev]
      const from = next.indexOf(draggingId)
      const to = next.indexOf(id)
      if (from === -1 || to === -1) return prev
      next.splice(from, 1)
      next.splice(to, 0, draggingId)
      return next
    })
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverId(null)
  }

  useEffect(() => {
    function handlePointerUp() {
      handleDragEnd()
    }
    window.addEventListener('pointerup', handlePointerUp)
    return () => window.removeEventListener('pointerup', handlePointerUp)
  })

  function handleOpenDocker(container) {
    setActiveDocker(container)
    setDockerPanel('metrics')
    setDockerModalOpen(true)
  }

  // Callback to refresh containers after docker action
  const handleDockerAction = () => {
    setTimeout(refreshContainers, 1000)
  }

  // Add metrics to history when they are updated
  useEffect(() => {
    if (metrics && !metricsLoading && !metricsError) {
      metricsHistory.addMetrics(metrics)
    }
  }, [metrics, metricsLoading, metricsError, metricsHistory])

  return (
    <div className="monitoring-page">
      <MonitoringHeader
        view={view}
        onViewChange={setView}
        onBack={onBack}
        onOpenAlerts={() => setAlertsOpen(true)}
        connectionLabel={connectionLabel}
      />

      {/* Show error banner if there are errors */}
      {(metricsError || containersError) && (
        <div className="monitoring-error">
          <span className="error-icon">!</span>
          <span>{metricsError || containersError}</span>
        </div>
      )}

      {view === 'system' ? (
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
      ) : view === 'charts' ? (
        <MetricsCharts metricsHistory={metricsHistory} />
      ) : (
        <DockersSection 
          onOpenDocker={handleOpenDocker} 
          connectionId={connection?.id}
          containers={containers}
          loading={containersLoading}
          error={containersError}
          onDockerAction={handleDockerAction}
          serverHost={connection?.host}
        />
      )}

      <DockerModal
        open={dockerModalOpen}
        activeDocker={activeDocker}
        dockerPanel={dockerPanel}
        onClose={() => setDockerModalOpen(false)}
        onPanelChange={setDockerPanel}
        connection={connection}
      />

      <AlertsModal
        open={alertsOpen}
        alerts={alerts}
        alertFields={alertFields}
        onClose={() => setAlertsOpen(false)}
        onSave={handleSaveAlerts}
        onUpdateAlertEnabled={updateAlertEnabled}
        onUpdateAlertValue={updateAlertValue}
      />
    </div>
  )
}

export default MonitoringPage
