import { useState } from 'react'
import { dockerStart, dockerStop, dockerRestart } from '../../../../services/tauri.js'
import { generateAccessUrls, formatPortsDisplay, openInBrowser, copyToClipboard } from '../../../../utils/dockerUtils.js'
import './DockersSection.css'

const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined) return '--'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '--'
  return num.toFixed(decimals)
}

function DockersSection({ onOpenDocker, connectionId, containers = [], loading, error, onDockerAction, serverHost }) {
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
      setActionError(`Error al iniciar: ${err}`)
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
      setActionError(`Error al parar: ${err}`)
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
      setActionError(`Error al reiniciar: ${err}`)
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

  if (loading && containers.length === 0) {
    return (
      <section className="monitoring-docker">
        <div className="card-header">
          <h2>Dockers</h2>
          <span className="card-value">Cargando...</span>
        </div>
        <div className="docker-loading">
          <span>Obteniendo contenedores del servidor...</span>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="monitoring-docker">
        <div className="card-header">
          <h2>Dockers</h2>
          <span className="card-value">Error</span>
        </div>
        <p className="docker-error">{error}</p>
      </section>
    )
  }

  return (
    <section className="monitoring-docker">
      <div className="card-header">
        <h2>Dockers</h2>
        <span className="card-value">{runningCount} activos</span>
      </div>
      
      {actionError && (
        <div className="docker-action-error">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)}>x</button>
        </div>
      )}
      
      <div className="docker-list">
        {containers.length === 0 ? (
          <p className="docker-empty">No se encontraron contenedores</p>
        ) : (
          containers.map((container) => {
            const accessUrls = generateAccessUrls(container.portMappings || [], serverHost)
            const webUrls = accessUrls.filter(u => u.isWebPort)
            
            return (
              <div key={container.id} className={`docker-item ${container.state !== 'running' ? 'is-stopped' : ''}`}>
                <div className="docker-info">
                  <div>
                    <p className="docker-name">{container.name}</p>
                    <p className="docker-meta">
                      Estado: {container.state} · {container.status} · Reinicios: {container.restartCount ?? 0}
                    </p>
                    {container.portMappings && container.portMappings.length > 0 && (
                      <p className="docker-ports">
                        Puertos: {formatPortsDisplay(container.portMappings)}
                      </p>
                    )}
                  </div>
                  <div className="docker-kpis">
                    <span>CPU {formatNumber(container.cpuPercent, 1)}%</span>
                    <span>RAM {formatNumber(container.memoryUsageMb)} MB</span>
                    <span>RX {formatNumber(container.netIoRxMb, 1)} MB</span>
                    <span>TX {formatNumber(container.netIoTxMb, 1)} MB</span>
                    <span>Imagen {container.image || '--'}</span>
                  </div>
                </div>

                {/* URLs de acceso */}
                {container.state === 'running' && webUrls.length > 0 && (
                  <div className="docker-urls">
                    <span className="docker-urls-label">Acceso rápido:</span>
                    <div className="docker-urls-list">
                      {webUrls.map((urlInfo, idx) => (
                        <div key={idx} className="docker-url-item">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline btn-url"
                            onClick={() => handleOpenUrl(urlInfo.url)}
                            title={`Abrir ${urlInfo.url}`}
                          >
                            <span className="url-icon">🌐</span>
                            <span className="url-label">{urlInfo.label}</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-icon"
                            onClick={() => handleCopyUrl(urlInfo.url)}
                            title="Copiar URL"
                          >
                            {copiedUrl === urlInfo.url ? '✓' : '📋'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="docker-actions">
                  {container.state === 'running' ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline btn-danger"
                        onClick={() => handleStop(container.id)}
                        disabled={actionLoading[container.id]}
                      >
                        {actionLoading[container.id] === 'stop' ? 'Parando...' : 'Parar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleRestart(container.id)}
                        disabled={actionLoading[container.id]}
                      >
                        {actionLoading[container.id] === 'restart' ? 'Reiniciando...' : 'Reiniciar'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline btn-success"
                      onClick={() => handleStart(container.id)}
                      disabled={actionLoading[container.id]}
                    >
                      {actionLoading[container.id] === 'start' ? 'Iniciando...' : 'Iniciar'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-accent"
                    onClick={() => onOpenDocker(container)}
                  >
                    Ver detalles
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

export default DockersSection
