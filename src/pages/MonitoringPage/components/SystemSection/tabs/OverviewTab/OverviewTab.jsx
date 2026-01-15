import { useMemo } from 'react'
import { useTranslation } from '../../../../../../hooks/useTranslation.jsx'
import { formatBytes, formatSpeed, getUsageColor } from '../../../../hooks/useAdvancedMetrics.js'
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

  if (!basicMetrics && !loading) {
    return (
      <div className="no-data">
        <p>{t('monitoring.noData')}</p>
      </div>
    )
  }

  return (
    <div className="overview-container">
      {/* Health Score Card */}
      <div className="health-score-card">
        <div className="health-score-content">
          <div className="health-label">System Health</div>
          <div className="health-score" style={{ color: healthColor }}>
            {healthScore}
            <span className="health-unit">%</span>
          </div>
          <div className="health-status" style={{ color: healthColor }}>
            {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Poor'}
          </div>
        </div>
        <div className="health-ring" style={{ 
          background: `conic-gradient(${healthColor} ${healthScore * 3.6}deg, rgba(100, 255, 218, 0.1) 0deg)` 
        }}>
          <div className="health-ring-inner"></div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="quick-stats-grid">
        {/* CPU Quick Stat */}
        <div className="quick-stat-card">
          <div className="quick-stat-icon cpu">CPU</div>
          <div className="quick-stat-info">
            <div className="quick-stat-label">CPU Usage</div>
            <div className="quick-stat-value" style={{ color: getUsageColor(basicMetrics?.cpu?.usagePercent || 0) }}>
              {(basicMetrics?.cpu?.usagePercent || 0).toFixed(1)}%
            </div>
            <div className="quick-stat-detail">
              {basicMetrics?.cpu?.cores || 0} cores • {(basicMetrics?.cpu?.frequencyMhz || 0).toFixed(0)} MHz
            </div>
          </div>
        </div>

        {/* Memory Quick Stat */}
        <div className="quick-stat-card">
          <div className="quick-stat-icon memory">RAM</div>
          <div className="quick-stat-info">
            <div className="quick-stat-label">Memory Usage</div>
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
            <div className="quick-stat-label">Disk Usage</div>
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
            <div className="quick-stat-label">Network</div>
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
          <h3 className="overview-card-title">System Information</h3>
          <div className="overview-details">
            <div className="overview-detail-row">
              <span className="detail-label">Hostname</span>
              <span className="detail-value">{basicMetrics?.system?.hostname || '-'}</span>
            </div>
            <div className="overview-detail-row">
              <span className="detail-label">OS</span>
              <span className="detail-value">{basicMetrics?.system?.os || '-'}</span>
            </div>
            <div className="overview-detail-row">
              <span className="detail-label">Kernel</span>
              <span className="detail-value">{basicMetrics?.system?.kernel || '-'}</span>
            </div>
            <div className="overview-detail-row">
              <span className="detail-label">Uptime</span>
              <span className="detail-value">{basicMetrics?.system?.uptime || '-'}</span>
            </div>
          </div>
        </div>

        {/* Load Average */}
        <div className="overview-card">
          <h3 className="overview-card-title">Load Average</h3>
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
          <h3 className="overview-card-title">Network Interfaces</h3>
          <div className="overview-details">
            <div className="overview-detail-row">
              <span className="detail-label">Public IP</span>
              <span className="detail-value mono">{basicMetrics?.system?.publicIp || '-'}</span>
            </div>
            <div className="overview-detail-row">
              <span className="detail-label">Private IP</span>
              <span className="detail-value mono">{basicMetrics?.system?.privateIp || '-'}</span>
            </div>
            <div className="overview-detail-row">
              <span className="detail-label">Active Interfaces</span>
              <span className="detail-value">{basicMetrics?.network?.length || 0}</span>
            </div>
            {advancedMetrics?.tcp && (
              <div className="overview-detail-row">
                <span className="detail-label">TCP Connections</span>
                <span className="detail-value">{advancedMetrics.tcp.established || 0} active</span>
              </div>
            )}
          </div>
        </div>

        {/* Temperature */}
        {basicMetrics?.temperatures && (
          <div className="overview-card">
            <h3 className="overview-card-title">Temperature</h3>
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
            <h3 className="overview-card-title">Top Processes</h3>
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
            <h3 className="overview-card-title">Disk I/O Activity</h3>
            <div className="disk-io-grid">
              {advancedMetrics.disks.slice(0, 3).map((disk) => (
                <div key={disk.device} className="disk-io-item">
                  <div className="disk-io-device">{disk.device}</div>
                  <div className="disk-io-stats">
                    <div className="io-stat">
                      <span className="io-label">Read</span>
                      <span className="io-value read">{formatSpeed(disk.readBytesPerSec)}</span>
                      <span className="io-ops">{disk.readOpsPerSec.toFixed(1)} ops/s</span>
                    </div>
                    <div className="io-stat">
                      <span className="io-label">Write</span>
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
            <h3 className="overview-card-title">CPU Details</h3>
            <div className="overview-details">
              <div className="overview-detail-row">
                <span className="detail-label">Context Switches</span>
                <span className="detail-value">{formatNumber(advancedMetrics.cpu.contextSwitchesPerSec)} /s</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Interrupts</span>
                <span className="detail-value">{formatNumber(advancedMetrics.cpu.interruptsPerSec)} /s</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Processes Running</span>
                <span className="detail-value">{advancedMetrics.cpu.processesRunning}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Processes Blocked</span>
                <span className="detail-value">{advancedMetrics.cpu.processesBlocked}</span>
              </div>
            </div>
          </div>
        )}

        {/* Memory Advanced Stats */}
        {advancedMetrics?.memory && (
          <div className="overview-card">
            <h3 className="overview-card-title">Memory Details</h3>
            <div className="overview-details">
              <div className="overview-detail-row">
                <span className="detail-label">Buffers</span>
                <span className="detail-value">{formatBytes(advancedMetrics.memory.buffers)}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Cached</span>
                <span className="detail-value">{formatBytes(advancedMetrics.memory.cached)}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Swap Cached</span>
                <span className="detail-value">{formatBytes(advancedMetrics.memory.swapCached)}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Slab</span>
                <span className="detail-value">{formatBytes(advancedMetrics.memory.slab)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Swap Details */}
        {basicMetrics?.memory?.swapTotalMb > 0 && (
          <div className="overview-card">
            <h3 className="overview-card-title">Swap Memory</h3>
            <div className="overview-details">
              <div className="overview-detail-row">
                <span className="detail-label">Total</span>
                <span className="detail-value">{formatBytes(basicMetrics.memory.swapTotalMb * 1024 * 1024)}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Used</span>
                <span className="detail-value">{formatBytes(basicMetrics.memory.swapUsedMb * 1024 * 1024)}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Free</span>
                <span className="detail-value">{formatBytes((basicMetrics.memory.swapTotalMb - basicMetrics.memory.swapUsedMb) * 1024 * 1024)}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Usage</span>
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
            <h3 className="overview-card-title">TCP Connections</h3>
            <div className="overview-details">
              <div className="overview-detail-row">
                <span className="detail-label">Established</span>
                <span className="detail-value">{advancedMetrics.tcp.established}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Time Wait</span>
                <span className="detail-value">{advancedMetrics.tcp.timeWait}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Close Wait</span>
                <span className="detail-value">{advancedMetrics.tcp.closeWait}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Listening</span>
                <span className="detail-value">{advancedMetrics.tcp.listen}</span>
              </div>
            </div>
          </div>
        )}

        {/* Listening Ports Summary */}
        {advancedMetrics?.ports && advancedMetrics.ports.length > 0 && (
          <div className="overview-card">
            <h3 className="overview-card-title">Listening Ports</h3>
            <div className="overview-details">
              <div className="overview-detail-row">
                <span className="detail-label">Total Ports</span>
                <span className="detail-value">{advancedMetrics.ports.length}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">TCP Ports</span>
                <span className="detail-value">{advancedMetrics.ports.filter(p => p.protocol === 'tcp').length}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">UDP Ports</span>
                <span className="detail-value">{advancedMetrics.ports.filter(p => p.protocol === 'udp').length}</span>
              </div>
              <div className="overview-detail-row">
                <span className="detail-label">Common Ports</span>
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
            <h3 className="overview-card-title">Hardware Specifications</h3>
            <div className="specs-grid">
              <div className="spec-detail">
                <span className="spec-label">CPU Model</span>
                <span className="spec-value">{basicMetrics.specs.cpuModel || '-'}</span>
              </div>
              <div className="spec-detail">
                <span className="spec-label">CPU Cores</span>
                <span className="spec-value">{basicMetrics.specs.cpuCores} cores / {basicMetrics.specs.cpuThreads} threads</span>
              </div>
              <div className="spec-detail">
                <span className="spec-label">Max Frequency</span>
                <span className="spec-value">{basicMetrics.specs.cpuMaxMhz.toFixed(0)} MHz</span>
              </div>
              <div className="spec-detail">
                <span className="spec-label">Total RAM</span>
                <span className="spec-value">{formatBytes(basicMetrics.specs.totalRamMb * 1024 * 1024)}</span>
              </div>
            </div>
          </div>
        )}

        {/* All Disks Summary */}
        {basicMetrics?.disks && basicMetrics.disks.length > 0 && (
          <div className="overview-card overview-card-wide">
            <h3 className="overview-card-title">Storage Overview</h3>
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

        {/* Network Interfaces Summary */}
        {basicMetrics?.network && basicMetrics.network.length > 0 && (
          <div className="overview-card overview-card-wide">
            <h3 className="overview-card-title">Network Interfaces Activity</h3>
            <div className="network-interfaces-grid">
              {basicMetrics.network.map((iface) => (
                <div key={iface.interface} className="network-interface-item">
                  <div className="network-interface-name">{iface.interface}</div>
                  <div className="network-interface-stats">
                    <div className="network-stat">
                      <span className="network-stat-label">RX</span>
                      <span className="network-stat-value rx">{formatSpeed(iface.rxBytes)}</span>
                      <span className="network-stat-total">{formatBytes(iface.rxBytes)} total</span>
                    </div>
                    <div className="network-stat">
                      <span className="network-stat-label">TX</span>
                      <span className="network-stat-value tx">{formatSpeed(iface.txBytes)}</span>
                      <span className="network-stat-total">{formatBytes(iface.txBytes)} total</span>
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
