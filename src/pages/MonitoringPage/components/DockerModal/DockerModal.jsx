import { useCallback, useEffect, useRef, useState } from 'react'
import { dockerImages, dockerVolumes, isTauri } from '../../../../services/tauri.js'
import { useRealTimeLogs } from '../../../../hooks/useRealTimeData.js'
import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './DockerModal.css'

function DockerModal({
  open,
  activeDocker,
  dockerPanel,
  onClose,
  onPanelChange,
  connection,
}) {
  const { t } = useTranslation()
  const [images, setImages] = useState([])
  const [volumes, setVolumes] = useState([])
  const [imagesLoading, setImagesLoading] = useState(false)
  const [volumesLoading, setVolumesLoading] = useState(false)
  const logsEndRef = useRef(null)

  // Logs viewer state
  const [logLevelFilter, setLogLevelFilter] = useState('all')
  const [logSearch, setLogSearch] = useState('')
  const [followMode, setFollowMode] = useState(true)

  const container = activeDocker || {}
  const containerName = container.name || t('docker.container')

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

  // Detect log level from log line
  const detectLogLevel = (line) => {
    const upperLine = line.toUpperCase()
    if (upperLine.includes('ERROR') || upperLine.includes('ERRO') || upperLine.includes('[E]')) return 'error'
    if (upperLine.includes('WARN') || upperLine.includes('WARNING') || upperLine.includes('[W]')) return 'warn'
    if (upperLine.includes('INFO') || upperLine.includes('[I]')) return 'info'
    if (upperLine.includes('DEBUG') || upperLine.includes('[D]')) return 'debug'
    return 'default'
  }

  // Filter logs by level and search term
  const filteredLogs = logs.filter(line => {
    // Filter by level
    if (logLevelFilter !== 'all') {
      const level = detectLogLevel(line)
      if (level !== logLevelFilter) return false
    }

    // Filter by search term
    if (logSearch && !line.toLowerCase().includes(logSearch.toLowerCase())) {
      return false
    }

    return true
  })

  // Export logs to file
  const handleExportLogs = async () => {
    if (!isTauri()) return
    
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
      const filename = `${containerName}-logs-${timestamp}.txt`
      
      const content = logs.join('\n')
      
      const dialog = await import('@tauri-apps/plugin-dialog')
      const fs = await import('@tauri-apps/plugin-fs')
      
      const filePath = await dialog.save({
        defaultPath: filename,
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
      })
      
      if (filePath) {
        await fs.writeTextFile(filePath, content)
      }
    } catch (error) {
      console.error('Error exporting logs:', error)
    }
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

  // Auto-scroll logs to bottom (only if follow mode is enabled)
  useEffect(() => {
    if (followMode && logsEndRef.current && dockerPanel === 'logs') {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, dockerPanel, followMode])

  if (!open) return null

  const memPercent = container.memoryLimitMb > 0 
    ? (container.memoryUsageMb / container.memoryLimitMb) * 100 
    : 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel modal-panel-wide modal-panel-enter"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{t('docker.detailsOf')} {containerName}</h3>
          <button type="button" className="icon-button interactive-bounce" onClick={onClose} title={t('common.close')}>
            x
          </button>
        </div>
        <div className="modal-tabs" role="tablist" aria-label={t('docker.detailPanels')}>
          <button
            type="button"
            role="tab"
            aria-selected={dockerPanel === 'metrics'}
            className={`modal-tab interactive-bounce ${dockerPanel === 'metrics' ? 'is-active' : ''}`}
            onClick={() => onPanelChange('metrics')}
          >
            {t('docker.performance')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dockerPanel === 'logs'}
            className={`modal-tab interactive-bounce ${dockerPanel === 'logs' ? 'is-active' : ''}`}
            onClick={() => onPanelChange('logs')}
          >
            {t('docker.logs')}
            <span className="tab-badge">LIVE</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dockerPanel === 'volumes'}
            className={`modal-tab interactive-bounce ${dockerPanel === 'volumes' ? 'is-active' : ''}`}
            onClick={() => onPanelChange('volumes')}
          >
            {t('docker.volumes')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dockerPanel === 'images'}
            className={`modal-tab interactive-bounce ${dockerPanel === 'images' ? 'is-active' : ''}`}
            onClick={() => onPanelChange('images')}
          >
            {t('docker.images')}
          </button>
        </div>
        <div className="modal-body">
          {dockerPanel === 'metrics' && (
            <div className="modal-section">
              <span>{t('docker.performance')} - {containerName}</span>
              <div className="docker-metrics">
                <div className="metric-card">
                  <div className="metric-head">
                    <span>{t('docker.cpu')}</span>
                    <strong>{formatNumber(container.cpuPercent, 1)}%</strong>
                  </div>
                  <div className="hbar">
                    <span style={{ width: `${Math.min(container.cpuPercent || 0, 100)}%` }} />
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>{t('docker.ram')}</span>
                    <strong>{formatNumber(container.memoryUsageMb)} MB</strong>
                  </div>
                  <div className="hbar">
                    <span style={{ width: `${memPercent}%` }} />
                  </div>
                  <p className="metric-footnote">{t('docker.limit')} {formatNumber(container.memoryLimitMb)} MB</p>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>{t('docker.netRx')}</span>
                    <strong>{formatNumber(container.netIoRxMb, 1)} MB</strong>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>{t('docker.netTx')}</span>
                    <strong>{formatNumber(container.netIoTxMb, 1)} MB</strong>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>{t('docker.diskRead')}</span>
                    <strong>{formatNumber(container.blockIoReadMb, 1)} MB</strong>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>{t('docker.diskWrite')}</span>
                    <strong>{formatNumber(container.blockIoWriteMb, 1)} MB</strong>
                  </div>
                </div>
              </div>
              <div className="metric-grid">
                <div className="metric-card">
                  <div className="metric-head">
                    <span>{t('docker.cpuUsage')}</span>
                    <strong>{formatNumber(container.cpuPercent)}%</strong>
                  </div>
                  <div className="donut">
                    <div className="donut-ring" style={{ '--val': container.cpuPercent || 0 }} />
                    <span>{formatNumber(container.cpuPercent)}%</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>{t('docker.memoryUsage')}</span>
                    <strong>{formatNumber(container.memoryUsageMb)} MB</strong>
                  </div>
                  <div className="donut">
                    <div className="donut-ring" style={{ '--val': memPercent }} />
                    <span>{formatNumber(memPercent)}%</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-head">
                    <span>{t('docker.status')}</span>
                    <strong>{container.state || '--'}</strong>
                  </div>
                  <div className="status-badges">
                    <span className={`badge ${container.state === 'running' ? 'ok' : 'warn'}`}>
                      {container.state === 'running' ? t('docker.ok') : t('docker.stopped')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-head">
                  <span>{t('docker.info')}</span>
                  <strong>{t('docker.container')}</strong>
                </div>
                <div className="mini-table">
                  <div>{t('docker.id')}</div>
                  <div>{container.id?.substring(0, 12) || '--'}</div>
                  <div></div>
                  <div>{t('docker.image')}</div>
                  <div>{container.image || '--'}</div>
                  <div></div>
                  <div>{t('docker.restarts')}</div>
                  <div>{container.restartCount ?? '--'}</div>
                  <div></div>
                </div>
              </div>
            </div>
          )}
          {dockerPanel === 'logs' && (
            <div className="modal-section">
              <div className="logs-header">
                <span>{t('docker.realtimeLogs')}</span>
                <div className="logs-controls">
                  <select
                    className="log-level-filter focus-ring"
                    value={logLevelFilter}
                    onChange={(e) => setLogLevelFilter(e.target.value)}
                  >
                    <option value="all">{t('logs.allLevels')}</option>
                    <option value="error">{t('logs.errorOnly')}</option>
                    <option value="warn">{t('logs.warnOnly')}</option>
                    <option value="info">{t('logs.infoOnly')}</option>
                    <option value="debug">{t('logs.debugOnly')}</option>
                  </select>
                  
                  <input
                    type="text"
                    className="log-search focus-ring"
                    placeholder={t('logs.searchPlaceholder')}
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                  />

                  <button
                    type="button"
                    className={`follow-toggle interactive-bounce ${followMode ? 'active' : ''}`}
                    onClick={() => setFollowMode(!followMode)}
                    title={t('logs.followMode')}
                  >
                    {followMode ? '⏸' : '▶'}
                  </button>

                  <button
                    type="button"
                    className="export-logs-btn interactive-bounce"
                    onClick={handleExportLogs}
                    disabled={logs.length === 0}
                    title={t('logs.exportLogs')}
                  >
                    💾
                  </button>
                  
                  <div className="logs-status">
                    <span className="status-dot live" />
                    <span>LIVE</span>
                  </div>
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
                <div className="terminal-body scrollbar-thin">
                  {filteredLogs.length === 0 ? (
                    <div className="terminal-line">
                      <span className="terminal-entry terminal-waiting">
                        {logs.length === 0 ? t('docker.waitingLogs') : t('logs.noMatchingLogs')}
                      </span>
                    </div>
                  ) : (
                    filteredLogs.map((line, index) => {
                      const level = detectLogLevel(line)
                      return (
                        <div key={index} className="terminal-line">
                          <span className={`terminal-entry log-level-${level}`}>{line}</span>
                        </div>
                      )
                    })
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          )}
          {dockerPanel === 'volumes' && (
            <div className="modal-section">
              <span>{t('docker.volumes')} {volumesLoading && t('docker.loadingData')}</span>
              <div className="volume-list">
                {volumes.length === 0 ? (
                  <p>{t('docker.noVolumes')}</p>
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
              <span>{t('docker.images')} {imagesLoading && t('docker.loadingData')}</span>
              <div className="image-list">
                {images.length === 0 ? (
                  <p>{t('docker.noImages')}</p>
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
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DockerModal
