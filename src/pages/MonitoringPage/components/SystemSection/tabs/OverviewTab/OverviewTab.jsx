import { useMemo } from 'react'
import { useTranslation } from '../../../../../../hooks/useTranslation.jsx'
import { formatBytes, formatSpeed, getUsageColor } from '../../../../../../utils/metricsUtils.js'
import '../../SystemSection.css'
import './OverviewTab.css'

function OverviewTab({ metrics, advancedMetrics, basicMetrics, loading }) {
  const { t } = useTranslation()

  // Calculate health score (0-100)
  const healthScore = useMemo(() => {
    if (!basicMetrics) return 0
    
    const cpuScore = Math.max(0, 100 - (basicMetrics.cpu?.usagePercent || 0))
    const memScore = Math.max(0, 100 - (basicMetrics.memory?.usagePercent || 0))
    const diskScore = Math.max(0, 100 - ((basicMetrics.disks?.[0]?.usagePercent || 0)))
    
    return Math.round((cpuScore + memScore + diskScore) / 3)
  }, [basicMetrics])

  const healthColor = useMemo(() => {
    if (healthScore >= 80) return 'var(--status-success)'
    if (healthScore >= 60) return 'var(--accent-cyan)'
    if (healthScore >= 40) return 'var(--status-warning)'
    return 'var(--status-danger)'
  }, [healthScore])

  const healthStatus = useMemo(() => {
    if (healthScore >= 80) return t('overview.excellent')
    if (healthScore >= 60) return t('overview.good')
    if (healthScore >= 40) return t('overview.fair')
    return t('overview.poor')
  }, [healthScore, t])

  if (!basicMetrics && !loading) {
    return (
      <div className="no-data">
        <p>{t('monitoring.noData')}</p>
      </div>
    )
  }

  return (
    <div className="overview-container">
      {/* Health Score Card - Redesigned */}
      <div className="health-score-card">
        <div className="health-score-content">
          <div className="health-label">{t('overview.systemHealth')}</div>
          <div className="health-metrics">
            <div className="health-metric-item">
              <span className="health-metric-label">CPU</span>
              <span className="health-metric-value" style={{ color: getUsageColor(basicMetrics?.cpu?.usagePercent || 0) }}>
                {(basicMetrics?.cpu?.usagePercent || 0).toFixed(0)}%
              </span>
            </div>
            <div className="health-metric-item">
              <span className="health-metric-label">RAM</span>
              <span className="health-metric-value" style={{ color: getUsageColor(basicMetrics?.memory?.usagePercent || 0) }}>
                {(basicMetrics?.memory?.usagePercent || 0).toFixed(0)}%
              </span>
            </div>
            <div className="health-metric-item">
              <span className="health-metric-label">DISK</span>
              <span className="health-metric-value" style={{ color: getUsageColor(basicMetrics?.disks?.[0]?.usagePercent || 0) }}>
                {(basicMetrics?.disks?.[0]?.usagePercent || 0).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="health-status-badge" style={{ 
            background: `${healthColor}20`,
            borderColor: healthColor,
            color: healthColor 
          }}>
            {healthStatus}
          </div>
        </div>
        <div className="health-score-display">
          <svg className="health-circle" viewBox="0 0 120 120">
            <circle 
              className="health-circle-bg" 
              cx="60" 
              cy="60" 
              r="54" 
            />
            <circle 
              className="health-circle-progress" 
              cx="60" 
              cy="60" 
              r="54"
              style={{
                stroke: healthColor,
                strokeDasharray: `${(healthScore / 100) * 339.292}, 339.292`
              }}
            />
          </svg>
          <div className="health-score-number" style={{ color: healthColor }}>
            {healthScore}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="quick-stats-grid">
        {/* CPU Quick Stat */}
        <div className="quick-stat-card">
          <div className="quick-stat-icon cpu">CPU</div>
          <div className="quick-stat-info">
            <div className="quick-stat-label">{t('overview.cpuUsage')}</div>
            <div className="quick-stat-value" style={{ color: getUsageColor(basicMetrics?.cpu?.usagePercent || 0) }}>
              {(basicMetrics?.cpu?.usagePercent || 0).toFixed(1)}%
            </div>
            <div className="quick-stat-detail">
              {basicMetrics?.cpu?.cores || 0} {t('overview.cores')} • {(basicMetrics?.cpu?.frequencyMhz || 0).toFixed(0)} MHz
            </div>
          </div>
        </div>

        {/* Memory Quick Stat */}
        <div className="quick-stat-card">
          <div className="quick-stat-icon memory">RAM</div>
          <div className="quick-stat-info">
            <div className="quick-stat-label">{t('overview.memoryUsage')}</div>
            <div className="quick-stat-value" style={{ color: getUsageColor(basicMetrics?.memory?.usagePercent || 0) }}>
              {(basicMetrics?.memory?.usagePercent || 0).toFixed(1)}%
            </div>
            <div className="quick-stat-detail">
              {formatBytes((basicMetrics?.memory?.usedMb || 0) * 1024 * 1024)} / {formatBytes((basicMetrics?.memory?.totalMb || 0) * 1024 * 1024)}
            </div>
          </div>
        </div>

        {/* Disk Quick Stat */}
        <div className="quick-stat-card">
          <div className="quick-stat-icon disk">HDD</div>
          <div className="quick-stat-info">
            <div className="quick-stat-label">{t('overview.diskUsage')}</div>
            <div className="quick-stat-value" style={{ color: getUsageColor(basicMetrics?.disks?.[0]?.usagePercent || 0) }}>
              {(basicMetrics?.disks?.[0]?.usagePercent || 0).toFixed(1)}%
            </div>
            <div className="quick-stat-detail">
              {(basicMetrics?.disks?.[0]?.usedGb || 0).toFixed(1)} GB / {(basicMetrics?.disks?.[0]?.totalGb || 0).toFixed(1)} GB
            </div>
          </div>
        </div>

        {/* Network Quick Stat */}
        <div className="quick-stat-card">
          <div className="quick-stat-icon network">NET</div>
          <div className="quick-stat-info">
            <div className="quick-stat-label">{t('monitoring.network')}</div>
            <div className="quick-stat-value">
              {formatSpeed((basicMetrics?.network?.[0]?.rxBytes || 0) + (basicMetrics?.network?.[0]?.txBytes || 0))}
            </div>
            <div className="quick-stat-detail">
              RX {formatSpeed(basicMetrics?.network?.[0]?.rxBytes || 0)} • TX {formatSpeed(basicMetrics?.network?.[0]?.txBytes || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* System Info Cards */}
      <div className="overview-grid">
        {/* System Info */}
        <div className="overview-card">
          <h3 className="overview-card-title">{t('overview.systemInformation')}</h3>
          <div className="overview-details">
            <div className="overview-detail-row">
              <span className="detail-label">{t('overview.hostname')}</span>
              <span className="detail-value">{basicMetrics?.system?.hostname || '-'}</span>
            </div>
            <div className="overview-detail-row">
              <span className="detail-label">{t('overview.os')}</span>
              <span className="detail-value">{basicMetrics?.system?.os || '-'}</span>
            </div>
            <div className="overview-detail-row">
              <span className="detail-label">{t('overview.kernel')}</span>
              <span className="detail-value">{basicMetrics?.system?.kernel || '-'}</span>
            </div>
            <div className="overview-detail-row">
              <span className="detail-label">{t('monitoring.uptime')}</span>
              <span className="detail-value">{basicMetrics?.system?.uptime || '-'}</span>
            </div>
          </div>
        </div>

        {/* Load Average */}
        <div className="overview-card">
          <h3 className="overview-card-title">{t('overview.loadAverage')}</h3>
          <div className="load-average-grid">
            <div className="load-item">
              <div className="load-label">1 min</div>
              <div className="load-value">{(basicMetrics?.cpu?.loadAvg1m || 0).toFixed(2)}</div>
            </div>
            <div className="load-item">
              <div className="load-label">5 min</div>
              <div className="load-value">{(basicMetrics?.cpu?.loadAvg5m || 0).toFixed(2)}</div>
            </div>
            <div className="load-item">
              <div className="load-label">15 min</div>
              <div className="load-value">{(basicMetrics?.cpu?.loadAvg15m || 0).toFixed(2)}</div>
            </div>
          </div>
          <div className="load-bar-container">
            <div className="load-bar">
              <div 
                className="load-bar-fill" 
                style={{ 
                  width: `${Math.min(100, ((basicMetrics?.cpu?.loadAvg1m || 0) / (basicMetrics?.cpu?.cores || 1)) * 100)}%`,
                  background: getUsageColor(Math.min(100, ((basicMetrics?.cpu?.loadAvg1m || 0) / (basicMetrics?.cpu?.cores || 1)) * 100))
                }}
              />
            </div>
          </div>
        </div>

        {/* Network Info */}
        <div className="overview-card">
          <h3 className="overview-card-title">{t('overview.networkInterfaces')}</h3>
          <div className="overview-details">
            <div className="overview-detail-row">
              <span className="detail-label">{t('overview.publicIp')}</span>
              <span className="detail-value mono">{basicMetrics?.system?.publicIp || '-'}</span>
            </div>
            <div className="overview-detail-row">
              <span className="detail-label">{t('overview.privateIp')}</span>
              <span className="detail-value mono">{basicMetrics?.system?.privateIp || '-'}</span>
            </div>
            <div className="overview-detail-row">
              <span className="detail-label">{t('overview.activeInterfaces')}</span>
              <span className="detail-value">{basicMetrics?.network?.length || 0}</span>
            </div>
            {advancedMetrics?.tcp && (
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.tcpConnections')}</span>
                <span className="detail-value">{advancedMetrics.tcp.established || 0} {t('overview.active')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Temperature */}
        {basicMetrics?.temperatures && (
          <div className="overview-card">
            <h3 className="overview-card-title">{t('overview.temperature')}</h3>
            <div className="temp-grid">
              {basicMetrics.temperatures.cpuTempC > 0 && (
                <div className="temp-item">
                  <div className="temp-label">CPU</div>
                  <div className="temp-value" style={{ color: getTempColor(basicMetrics.temperatures.cpuTempC) }}>
                    {basicMetrics.temperatures.cpuTempC.toFixed(1)}°C
                  </div>
                </div>
              )}
              {basicMetrics.temperatures.gpuTempC > 0 && (
                <div className="temp-item">
                  <div className="temp-label">GPU</div>
                  <div className="temp-value" style={{ color: getTempColor(basicMetrics.temperatures.gpuTempC) }}>
                    {basicMetrics.temperatures.gpuTempC.toFixed(1)}°C
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Processes */}
        {advancedMetrics?.processes && advancedMetrics.processes.length > 0 && (
          <div className="overview-card overview-card-wide">
            <h3 className="overview-card-title">{t('overview.topProcesses')}</h3>
            <div className="processes-mini-table">
              {advancedMetrics.processes.slice(0, 5).map((proc) => (
                <div key={proc.pid} className="process-mini-row">
                  <span className="process-name">{proc.name}</span>
                  <div className="process-stats">
                    <span className="process-cpu" style={{ color: getUsageColor(proc.cpuPercent) }}>
                      {proc.cpuPercent.toFixed(1)}%
                    </span>
                    <span className="process-mem">
                      {proc.memoryRssMb.toFixed(0)} MB
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disk I/O */}
        {advancedMetrics?.disks && advancedMetrics.disks.length > 0 && (
          <div className="overview-card overview-card-wide">
            <h3 className="overview-card-title">{t('overview.diskIoActivity')}</h3>
            <div className="disk-io-grid">
              {advancedMetrics.disks.slice(0, 3).map((disk) => (
                <div key={disk.device} className="disk-io-item">
                  <div className="disk-io-device">{disk.device}</div>
                  <div className="disk-io-stats">
                    <div className="io-stat">
                      <span className="io-label">{t('overview.read')}</span>
                      <span className="io-value read">{formatSpeed(disk.readBytesPerSec)}</span>
                      <span className="io-ops">{disk.readOpsPerSec.toFixed(1)} ops/s</span>
                    </div>
                    <div className="io-stat">
                      <span className="io-label">{t('overview.write')}</span>
                      <span className="io-value write">{formatSpeed(disk.writeBytesPerSec)}</span>
                      <span className="io-ops">{disk.writeOpsPerSec.toFixed(1)} ops/s</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CPU Advanced Stats */}
        {advancedMetrics?.cpu && (
          <div className="overview-card">
            <h3 className="overview-card-title">{t('overview.cpuDetails')}</h3>
            <div className="overview-details">
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.contextSwitches')}</span>
                <span className="detail-value">{formatNumber(advancedMetrics.cpu.contextSwitchesPerSec)} /s</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.interrupts')}</span>
                <span className="detail-value">{formatNumber(advancedMetrics.cpu.interruptsPerSec)} /s</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.processesRunning')}</span>
                <span className="detail-value">{advancedMetrics.cpu.processesRunning}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.processesBlocked')}</span>
                <span className="detail-value">{advancedMetrics.cpu.processesBlocked}</span>
              </div>
            </div>
          </div>
        )}

        {/* Memory Advanced Stats */}
        {advancedMetrics?.memory && (
          <div className="overview-card">
            <h3 className="overview-card-title">{t('overview.memoryDetails')}</h3>
            <div className="overview-details">
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.buffers')}</span>
                <span className="detail-value">{formatBytes(advancedMetrics.memory.buffers)}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.cached')}</span>
                <span className="detail-value">{formatBytes(advancedMetrics.memory.cached)}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.swapCached')}</span>
                <span className="detail-value">{formatBytes(advancedMetrics.memory.swapCached)}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.slab')}</span>
                <span className="detail-value">{formatBytes(advancedMetrics.memory.slab)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Swap Details */}
        {basicMetrics?.memory?.swapTotalMb > 0 && (
          <div className="overview-card">
            <h3 className="overview-card-title">{t('overview.swapMemory')}</h3>
            <div className="overview-details">
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.total')}</span>
                <span className="detail-value">{formatBytes(basicMetrics.memory.swapTotalMb * 1024 * 1024)}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.used')}</span>
                <span className="detail-value">{formatBytes(basicMetrics.memory.swapUsedMb * 1024 * 1024)}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.free')}</span>
                <span className="detail-value">{formatBytes((basicMetrics.memory.swapTotalMb - basicMetrics.memory.swapUsedMb) * 1024 * 1024)}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.usage')}</span>
                <span className="detail-value" style={{ color: getUsageColor(basicMetrics.memory.swapPercent) }}>
                  {basicMetrics.memory.swapPercent.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="progress-bar-container" style={{ marginTop: '0.75rem' }}>
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${basicMetrics.memory.swapPercent}%`, 
                    background: getUsageColor(basicMetrics.memory.swapPercent) 
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TCP Connection Details */}
        {advancedMetrics?.tcp && (
          <div className="overview-card">
            <h3 className="overview-card-title">{t('overview.tcpConnectionDetails')}</h3>
            <div className="overview-details">
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.established')}</span>
                <span className="detail-value">{advancedMetrics.tcp.established}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.timeWait')}</span>
                <span className="detail-value">{advancedMetrics.tcp.timeWait}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.closeWait')}</span>
                <span className="detail-value">{advancedMetrics.tcp.closeWait}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.listening')}</span>
                <span className="detail-value">{advancedMetrics.tcp.listen}</span>
              </div>
            </div>
          </div>
        )}

        {/* Listening Ports Summary */}
        {advancedMetrics?.ports && advancedMetrics.ports.length > 0 && (
          <div className="overview-card">
            <h3 className="overview-card-title">{t('overview.listeningPorts')}</h3>
            <div className="overview-details">
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.totalPorts')}</span>
                <span className="detail-value">{advancedMetrics.ports.length}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.tcpPorts')}</span>
                <span className="detail-value">{advancedMetrics.ports.filter(p => p.protocol === 'tcp').length}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.udpPorts')}</span>
                <span className="detail-value">{advancedMetrics.ports.filter(p => p.protocol === 'udp').length}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">{t('overview.commonPorts')}</span>
                <span className="detail-value mono">
                  {advancedMetrics.ports.slice(0, 3).map(p => p.port).join(', ')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* System Specifications */}
        {basicMetrics?.specs && (
          <div className="overview-card overview-card-wide">
            <h3 className="overview-card-title">{t('overview.hardwareSpecs')}</h3>
            <div className="specs-grid">
              <div className="spec-detail">
                <span className="spec-label">{t('overview.cpuModel')}</span>
                <span className="spec-value">{basicMetrics.specs.cpuModel || '-'}</span>
              </div>
              <div className="spec-detail">
                <span className="spec-label">{t('overview.cpuCores')}</span>
                <span className="spec-value">{basicMetrics.specs.cpuCores} {t('overview.cores')} / {basicMetrics.specs.cpuThreads} {t('overview.threads')}</span>
              </div>
              <div className="spec-detail">
                <span className="spec-label">{t('overview.maxFrequency')}</span>
                <span className="spec-value">{basicMetrics.specs.cpuMaxMhz.toFixed(0)} MHz</span>
              </div>
              <div className="spec-detail">
                <span className="spec-label">{t('overview.totalRam')}</span>
                <span className="spec-value">{formatBytes(basicMetrics.specs.totalRamMb * 1024 * 1024)}</span>
              </div>
            </div>
          </div>
        )}

        {/* All Disks Summary */}
        {basicMetrics?.disks && basicMetrics.disks.length > 0 && (
          <div className="overview-card overview-card-wide">
            <h3 className="overview-card-title">{t('overview.storageOverview')}</h3>
            <div className="disks-summary-grid">
              {basicMetrics.disks.map((disk) => (
                <div key={disk.mountPoint} className="disk-summary-item">
                  <div className="disk-summary-header">
                    <span className="disk-summary-mount">{disk.mountPoint}</span>
                    <span className="disk-summary-percent" style={{ color: getUsageColor(disk.usagePercent) }}>
                      {disk.usagePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="disk-summary-info">
                    <span className="disk-summary-size">{disk.usedGb.toFixed(1)} GB / {disk.totalGb.toFixed(1)} GB</span>
                    <span className="disk-summary-fs">{disk.filesystem}</span>
                  </div>
                  <div className="progress-bar-container" style={{ marginTop: '0.5rem' }}>
                    <div className="progress-bar">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${disk.usagePercent}%`, 
                          background: getUsageColor(disk.usagePercent) 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toFixed(0)
}

function getTempColor(temp) {
  if (temp >= 80) return 'var(--status-danger)'
  if (temp >= 70) return 'var(--status-warning)'
  if (temp >= 60) return 'var(--accent-cyan)'
  return 'var(--text-primary)'
}

export default OverviewTab
