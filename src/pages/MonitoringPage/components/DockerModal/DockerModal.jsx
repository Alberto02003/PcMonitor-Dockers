import { useCallback, useEffect, useRef, useState } from 'react'
import { dockerImages, dockerVolumes } from '../../../../services/tauri.js'
import { useRealTimeLogs } from '../../../../hooks/useRealTimeData.js'
import './DockerModal.css'

function DockerModal({
  open,
  activeDocker,
  dockerPanel,
  onClose,
  onPanelChange,
  connection,
}) {
  const [images, setImages] = useState([])
  const [volumes, setVolumes] = useState([])
  const [imagesLoading, setImagesLoading] = useState(false)
  const [volumesLoading, setVolumesLoading] = useState(false)
  const logsEndRef = useRef(null)

  const container = activeDocker || {}
  const containerName = container.name || 'Contenedor'

  // Real-time logs via polling (replaces WebSocket)
  // Poll every 3 seconds to reduce SSH load
  const { logs, error: logsError, clearLogs } = useRealTimeLogs(
    connection?.id,
    open && dockerPanel === 'logs' ? container.id : null,
    3000
  )

  const formatNumber = (value, decimals = 0) => {
    if (value === null || value === undefined) return '--'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '--'
    return num.toFixed(decimals)
  }

  const fetchImages = useCallback(async () => {
    if (!connection?.id) return
    setImagesLoading(true)
    try {
      const data = await dockerImages(connection.id)
      setImages(data)
    } catch {
      setImages([])
    } finally {
      setImagesLoading(false)
    }
  }, [connection?.id])

  const fetchVolumes = useCallback(async () => {
    if (!connection?.id) return
    setVolumesLoading(true)
    try {
      const data = await dockerVolumes(connection.id)
      setVolumes(data)
    } catch {
      setVolumes([])
    } finally {
      setVolumesLoading(false)
    }
  }, [connection?.id])

  useEffect(() => {
    if (!open) return
    if (dockerPanel === 'images') {
      fetchImages()
    }
    if (dockerPanel === 'volumes') {
      fetchVolumes()
    }
  }, [open, dockerPanel, fetchImages, fetchVolumes])

  // Clear logs when changing container or closing
  useEffect(() => {
    if (!open) {
      clearLogs()
    }
  }, [open, clearLogs])

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current && dockerPanel === 'logs') {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, dockerPanel])

  if (!open) return null

  const memPercent = container.memoryLimitMb > 0 
    ? (container.memoryUsageMb / container.memoryLimitMb) * 100 
    : 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel modal-panel-wide"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Detalles de {containerName}</h3>
          <button type="button" className="icon-button" onClick={onClose} title="Cerrar">
            x
          </button>
        </div>
        <div className="modal-tabs" role="tablist" aria-label="Paneles de detalles">
          <button
            type="button"
            role="tab"
            aria-selected={dockerPanel === 'metrics'}
            className={`modal-tab ${dockerPanel === 'metrics' ? 'is-active' : ''}`}
            onClick={() => onPanelChange('metrics')}
          >
            Rendimiento
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dockerPanel === 'logs'}
            className={`modal-tab ${dockerPanel === 'logs' ? 'is-active' : ''}`}
            onClick={() => onPanelChange('logs')}
          >
            Logs
            <span className="tab-badge">LIVE</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dockerPanel === 'volumes'}
            className={`modal-tab ${dockerPanel === 'volumes' ? 'is-active' : ''}`}
            onClick={() => onPanelChange('volumes')}
          >
            Volumenes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dockerPanel === 'images'}
            className={`modal-tab ${dockerPanel === 'images' ? 'is-active' : ''}`}
            onClick={() => onPanelChange('images')}
          >
            Imagenes
          </button>
        </div>
        <div className="modal-body">
          {dockerPanel === 'metrics' && (
            <div className="modal-section">
              <span>Rendimiento de {containerName}</span>
              <div className="docker-metrics">
                <div className="metric-card">
                  <div className="metric-head">
                    <span>CPU</span>
                    <strong>{formatNumber(container.cpuPercent, 1)}%</strong>
                  </div>
                  <div className="hbar">
                    <span style={{ width: `${Math.min(container.cpuPercent || 0, 100)}%` }} />
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>RAM</span>
                    <strong>{formatNumber(container.memoryUsageMb)} MB</strong>
                  </div>
                  <div className="hbar">
                    <span style={{ width: `${memPercent}%` }} />
                  </div>
                  <p className="metric-footnote">Limite: {formatNumber(container.memoryLimitMb)} MB</p>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>Red RX</span>
                    <strong>{formatNumber(container.netIoRxMb, 1)} MB</strong>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>Red TX</span>
                    <strong>{formatNumber(container.netIoTxMb, 1)} MB</strong>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>Disco Read</span>
                    <strong>{formatNumber(container.blockIoReadMb, 1)} MB</strong>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>Disco Write</span>
                    <strong>{formatNumber(container.blockIoWriteMb, 1)} MB</strong>
                  </div>
                </div>
              </div>
              <div className="metric-grid">
                <div className="metric-card">
                  <div className="metric-head">
                    <span>Uso de CPU</span>
                    <strong>{formatNumber(container.cpuPercent)}%</strong>
                  </div>
                  <div className="donut">
                    <div className="donut-ring" style={{ '--val': container.cpuPercent || 0 }} />
                    <span>{formatNumber(container.cpuPercent)}%</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>Memoria</span>
                    <strong>{formatNumber(container.memoryUsageMb)} MB</strong>
                  </div>
                  <div className="donut">
                    <div className="donut-ring" style={{ '--val': memPercent }} />
                    <span>{formatNumber(memPercent)}%</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>Estado</span>
                    <strong>{container.state || '--'}</strong>
                  </div>
                  <div className="status-badges">
                    <span className={`badge ${container.state === 'running' ? 'ok' : 'warn'}`}>
                      {container.state === 'running' ? 'OK' : 'Detenido'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-head">
                  <span>Informacion</span>
                  <strong>Contenedor</strong>
                </div>
                <div className="mini-table">
                  <div>ID</div>
                  <div>{container.id?.substring(0, 12) || '--'}</div>
                  <div></div>
                  <div>Imagen</div>
                  <div>{container.image || '--'}</div>
                  <div></div>
                  <div>Reinicios</div>
                  <div>{container.restartCount ?? '--'}</div>
                  <div></div>
                </div>
              </div>
            </div>
          )}
          {dockerPanel === 'logs' && (
            <div className="modal-section">
              <div className="logs-header">
                <span>Logs en tiempo real</span>
                <div className="logs-status">
                  <span className="status-dot live" />
                  <span>LIVE</span>
                </div>
              </div>
              {logsError && (
                <div className="logs-error">{logsError}</div>
              )}
              <div className="terminal">
                <div className="terminal-header">
                  <span className="terminal-dot dot-red" />
                  <span className="terminal-dot dot-yellow" />
                  <span className="terminal-dot dot-green" />
                  <span className="terminal-title">docker logs {containerName} --follow</span>
                </div>
                <div className="terminal-body">
                  {logs.length === 0 ? (
                    <div className="terminal-line">
                      <span className="terminal-entry terminal-waiting">Esperando logs...</span>
                    </div>
                  ) : (
                    logs.map((line, index) => (
                      <div key={index} className="terminal-line">
                        <span className="terminal-entry">{line}</span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          )}
          {dockerPanel === 'volumes' && (
            <div className="modal-section">
              <span>Volumenes {volumesLoading && '(cargando...)'}</span>
              <div className="volume-list">
                {volumes.length === 0 ? (
                  <p>No hay volumenes</p>
                ) : (
                  volumes.map((vol) => (
                    <div key={vol.name} className="volume-item">
                      <div>
                        <p className="volume-name">{vol.name}</p>
                        <p className="volume-meta">{vol.mountPoint} · {vol.driver}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {dockerPanel === 'images' && (
            <div className="modal-section">
              <span>Imagenes {imagesLoading && '(cargando...)'}</span>
              <div className="image-list">
                {images.length === 0 ? (
                  <p>No hay imagenes</p>
                ) : (
                  images.map((img) => (
                    <div key={img.id} className="image-item">
                      <div>
                        <p className="image-name">{img.repository}:{img.tag}</p>
                        <p className="image-meta">{img.id?.substring(0, 12) || '--'}</p>
                      </div>
                      <div className="image-stats">
                        <span>{formatNumber(img.sizeMb)} MB</span>
                        <span>{img.created || '--'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default DockerModal
