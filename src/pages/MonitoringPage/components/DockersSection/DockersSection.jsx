import { useState } from 'react'
import { dockerStart, dockerStop, dockerRestart, dockerRemove } from '../../../../services/tauri.js'
import { generateAccessUrls, formatPortsDisplay, openInBrowser, copyToClipboard } from '../../../../utils/dockerUtils.js'
import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './DockersSection.css'

const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined) return '--'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '--'
  return num.toFixed(decimals)
}

function DockersSection({ onOpenDocker, connectionId, containers = [], loading, error, onDockerAction, serverHost }) {
  const { t } = useTranslation()
  const [actionLoading, setActionLoading] = useState({})
  const [actionError, setActionError] = useState(null)
  const [copiedUrl, setCopiedUrl] = useState(null)

  const handleStart = async (containerId) => {
    setActionLoading((prev) => ({ ...prev, [containerId]: 'start' }))
    setActionError(null)
    try {
      await dockerStart(connectionId, containerId)
      if (onDockerAction) onDockerAction()
    } catch (err) {
      setActionError(`${t('docker.errorStart')} ${err}`)
    } finally {
      setActionLoading((prev) => ({ ...prev, [containerId]: null }))
    }
  }

  const handleStop = async (containerId) => {
    setActionLoading((prev) => ({ ...prev, [containerId]: 'stop' }))
    setActionError(null)
    try {
      await dockerStop(connectionId, containerId)
      if (onDockerAction) onDockerAction()
    } catch (err) {
      setActionError(`${t('docker.errorStop')} ${err}`)
    } finally {
      setActionLoading((prev) => ({ ...prev, [containerId]: null }))
    }
  }

  const handleRestart = async (containerId) => {
    setActionLoading((prev) => ({ ...prev, [containerId]: 'restart' }))
    setActionError(null)
    try {
      await dockerRestart(connectionId, containerId)
      if (onDockerAction) onDockerAction()
    } catch (err) {
      setActionError(`${t('docker.errorRestart')} ${err}`)
    } finally {
      setActionLoading((prev) => ({ ...prev, [containerId]: null }))
    }
  }

  const handleRemove = async (containerId, containerName) => {
    const confirmed = window.confirm(`${t('docker.confirmRemove')}\n\n${containerName}`)
    if (!confirmed) return

    setActionLoading((prev) => ({ ...prev, [containerId]: 'remove' }))
    setActionError(null)
    try {
      await dockerRemove(connectionId, containerId, true) // force = true
      if (onDockerAction) onDockerAction()
    } catch (err) {
      setActionError(`${t('docker.errorRemove')} ${err}`)
    } finally {
      setActionLoading((prev) => ({ ...prev, [containerId]: null }))
    }
  }

  const handleOpenUrl = async (url) => {
    await openInBrowser(url)
  }

  const handleCopyUrl = async (url) => {
    const success = await copyToClipboard(url)
    if (success) {
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    }
  }

  const runningCount = containers.filter((c) => c.state === 'running').length
  const stoppedCount = containers.filter((c) => c.state !== 'running').length
  const totalCpu = containers.reduce((sum, c) => sum + (c.cpuPercent || 0), 0)
  const totalMemory = containers.reduce((sum, c) => sum + (c.memoryUsageMb || 0), 0)

  if (loading && containers.length === 0) {
    return (
      <section className="monitoring-docker">
        <div className="card-header">
          <h2>Dockers</h2>
          <span className="card-value">{t('common.loading')}</span>
        </div>
        <div className="docker-loading">
          <span>{t('docker.gettingContainers')}</span>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="monitoring-docker">
        <div className="card-header">
          <h2>Dockers</h2>
          <span className="card-value">{t('common.error')}</span>
        </div>
        <p className="docker-error">{error}</p>
      </section>
    )
  }

  return (
    <section className="monitoring-docker animate-fade-in-up">
      <div className="card-header">
        <h2>Dockers</h2>
        <span className="card-value">{containers.length} {containers.length === 1 ? 'container' : 'containers'}</span>
      </div>

      {/* Summary Stats */}
      <div className="docker-stats-grid">
        <div className="docker-stat-card glass hover-lift">
          <div className="docker-stat-label">Total</div>
          <div className="docker-stat-value">{containers.length}</div>
        </div>

        <div className="docker-stat-card glass hover-lift">
          <div className="docker-stat-label">Running</div>
          <div className="docker-stat-value" style={{ color: 'var(--status-success)' }}>
            {runningCount}
          </div>
        </div>

        <div className="docker-stat-card glass hover-lift">
          <div className="docker-stat-label">Stopped</div>
          <div className="docker-stat-value" style={{ color: 'var(--text-secondary)' }}>
            {stoppedCount}
          </div>
        </div>

        <div className="docker-stat-card glass hover-lift">
          <div className="docker-stat-label">Total CPU</div>
          <div className="docker-stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {totalCpu.toFixed(1)}<span className="docker-stat-unit">%</span>
          </div>
        </div>

        <div className="docker-stat-card glass hover-lift">
          <div className="docker-stat-label">Total RAM</div>
          <div className="docker-stat-value" style={{ color: 'var(--accent-purple)' }}>
            {totalMemory.toFixed(0)}<span className="docker-stat-unit">MB</span>
          </div>
        </div>
      </div>
      
      {actionError && (
        <div className="docker-action-error">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)}>×</button>
        </div>
      )}
      
      {/* Containers List with Scroll */}
                      <div className="docker-containers-wrapper scrollbar-thin">
        {containers.length === 0 ? (
          <div className="docker-empty">
            <p>{t('docker.noContainers')}</p>
          </div>
        ) : (
          <div className="docker-containers-grid">
            {containers.map((container) => {
              const accessUrls = generateAccessUrls(container.portMappings || [], serverHost)
              const webUrls = accessUrls.filter(u => u.isWebPort)
              const isRunning = container.state === 'running'
              
              return (
                <div key={container.id} className={`docker-card glass hover-lift ${!isRunning ? 'is-stopped' : ''}`}>
                  {/* Header */}
                  <div className="docker-card-header">
                    <div className="docker-card-title">
                      <span className="docker-card-name">{container.name}</span>
                      <span className={`docker-status-badge ${isRunning ? 'status-running' : 'status-stopped'}`}>
                        {container.state}
                      </span>
                    </div>
                    <div className="docker-card-subtitle">
                      {container.image || 'Unknown image'}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="docker-metrics">
                    <div className="docker-metric">
                      <span className="docker-metric-label">CPU</span>
                      <span className="docker-metric-value" style={{ color: 'var(--accent-cyan)' }}>
                        {formatNumber(container.cpuPercent, 1)}%
                      </span>
                    </div>
                    <div className="docker-metric">
                      <span className="docker-metric-label">RAM</span>
                      <span className="docker-metric-value" style={{ color: 'var(--accent-purple)' }}>
                        {formatNumber(container.memoryUsageMb)} MB
                      </span>
                    </div>
                    <div className="docker-metric">
                      <span className="docker-metric-label">NET RX</span>
                      <span className="docker-metric-value">
                        {formatNumber(container.netIoRxMb, 1)} MB
                      </span>
                    </div>
                    <div className="docker-metric">
                      <span className="docker-metric-label">NET TX</span>
                      <span className="docker-metric-value">
                        {formatNumber(container.netIoTxMb, 1)} MB
                      </span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="docker-info-row">
                    <span className="docker-info-item">
                      <span className="docker-info-label">Restarts:</span> {container.restartCount ?? 0}
                    </span>
                    {container.status && (
                      <span className="docker-info-item">
                        {container.status}
                      </span>
                    )}
                  </div>

                  {/* Ports */}
                  {container.portMappings && container.portMappings.length > 0 && (
                    <div className="docker-ports-section">
                      <span className="docker-ports-label">Ports:</span>
                      <span className="docker-ports-value">
                        {formatPortsDisplay(container.portMappings)}
                      </span>
                    </div>
                  )}

                  {/* Quick Access URLs */}
                  {isRunning && webUrls.length > 0 && (
                    <div className="docker-urls-section">
                      <div className="docker-urls-label">{t('docker.quickAccess')}</div>
                      <div className="docker-urls-grid">
                        {webUrls.map((urlInfo, idx) => (
                          <div key={idx} className="docker-url-group">
                            <button
                              type="button"
                              className="docker-url-btn interactive-bounce"
                              onClick={() => handleOpenUrl(urlInfo.url)}
                              title={urlInfo.url}
                            >
                              <span className="docker-url-icon">↗</span>
                              <span className="docker-url-text">{urlInfo.label}</span>
                            </button>
                            <button
                              type="button"
                              className="docker-copy-btn interactive-bounce"
                              onClick={() => handleCopyUrl(urlInfo.url)}
                              title="Copy URL"
                            >
                              {copiedUrl === urlInfo.url ? '✓' : '□'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="docker-card-actions">
                    <div className="docker-actions-main">
                      {isRunning ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-outline btn-danger btn-sm interactive-bounce"
                            onClick={() => handleStop(container.id)}
                            disabled={actionLoading[container.id]}
                          >
                            {actionLoading[container.id] === 'stop' ? t('docker.stopping') : t('docker.stopAction')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm interactive-bounce"
                            onClick={() => handleRestart(container.id)}
                            disabled={actionLoading[container.id]}
                          >
                            {actionLoading[container.id] === 'restart' ? t('docker.restarting') : t('docker.restartAction')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-success btn-sm interactive-bounce"
                          onClick={() => handleStart(container.id)}
                          disabled={actionLoading[container.id]}
                        >
                          {actionLoading[container.id] === 'start' ? t('docker.starting') : t('docker.startAction')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-accent btn-sm interactive-bounce hover-glow"
                        onClick={() => onOpenDocker(container)}
                      >
                        {t('actions.viewDetails')}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-danger btn-sm docker-remove-btn interactive-bounce"
                      onClick={() => handleRemove(container.id, container.name)}
                      disabled={actionLoading[container.id]}
                      title={t('docker.removeAction')}
                    >
                      {actionLoading[container.id] === 'remove' ? t('docker.removing') : '×'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default DockersSection
