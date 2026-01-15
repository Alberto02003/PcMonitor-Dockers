import { useState } from 'react'
import { useTranslation } from '../../../../../../hooks/useTranslation.jsx'
import { formatBytes, formatSpeed, getUsageColor } from '../../../../hooks/useAdvancedMetrics.js'
import '../../SystemSection.css'

function DiskTab({ disks, basicDisks, loading }) {
  const { t } = useTranslation()
  const [selectedDevice, setSelectedDevice] = useState(null)

  // Use advanced disks if available, otherwise basic disks
  const diskList = disks?.length ? disks : basicDisks || []

  if (!diskList.length && !loading) {
    return (
      <div className="no-data">
        <p>{t('monitoring.noData')}</p>
      </div>
    )
  }

  // Select first disk if no selection
  const activeDisk = selectedDevice 
    ? diskList.find(d => (d.device || d.filesystem) === selectedDevice) 
    : diskList[0]

  return (
    <div className="tab-container">
      {/* Disk Tabs - Horizontal selector */}
      <div className="disk-tabs-container">
        {diskList.map((disk) => {
          const diskId = disk.device || disk.filesystem
          const isActive = diskId === (activeDisk?.device || activeDisk?.filesystem)
          const usage = disk.usagePercent || 0
          
          return (
            <button
              key={diskId}
              type="button"
              className={`disk-tab ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedDevice(diskId)}
            >
              <div className="disk-tab-device">{diskId}</div>
              <div className="disk-tab-mount">{disk.mountPoint || disk.mount_point || '/'}</div>
              <div className="disk-tab-usage" style={{ color: getUsageColor(usage) }}>
                {usage.toFixed(1)}%
              </div>
            </button>
          )
        })}
      </div>

      {/* Active Disk Details */}
      {activeDisk && (
        <>
          {/* Main Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">{t('disk.usage')}</span>
              </div>
              <div className="stat-value" style={{ color: getUsageColor(activeDisk.usagePercent || 0) }}>
                {(activeDisk.usagePercent || 0).toFixed(1)}
                <span className="stat-unit">%</span>
              </div>
              <div className="stat-detail">
                {formatBytes((activeDisk.usedGb || 0) * 1024 * 1024 * 1024)} / {formatBytes((activeDisk.totalGb || 0) * 1024 * 1024 * 1024)}
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${activeDisk.usagePercent || 0}%`, 
                      background: getUsageColor(activeDisk.usagePercent || 0) 
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">{t('disk.used')}</span>
              </div>
              <div className="stat-value">
                {formatBytes((activeDisk.usedGb || 0) * 1024 * 1024 * 1024)}
              </div>
              <div className="stat-detail">{activeDisk.filesystemType || activeDisk.filesystem || 'Unknown'}</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">{t('disk.free')}</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--status-success)' }}>
                {formatBytes(((activeDisk.totalGb || 0) - (activeDisk.usedGb || 0)) * 1024 * 1024 * 1024)}
              </div>
              <div className="stat-detail">{t('disk.available')}</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">{t('disk.size')}</span>
              </div>
              <div className="stat-value">
                {formatBytes((activeDisk.totalGb || 0) * 1024 * 1024 * 1024)}
              </div>
              <div className="stat-detail">Total capacity</div>
            </div>
          </div>

          {/* I/O Stats (if advanced metrics available) */}
          {activeDisk.readOpsPerSec !== undefined && (
            <>
              <div className="breakdown-container">
                <div className="breakdown-title">{t('disk.ioMetrics')}</div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-label">{t('disk.readSpeed')}</span>
                  </div>
                  <div className="stat-value" style={{ color: '#64ffda' }}>
                    {formatSpeed(activeDisk.readBytesPerSec || 0)}
                  </div>
                  <div className="stat-detail">
                    {(activeDisk.readOpsPerSec || 0).toFixed(1)} ops/s
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-label">{t('disk.writeSpeed')}</span>
                  </div>
                  <div className="stat-value" style={{ color: '#c792ea' }}>
                    {formatSpeed(activeDisk.writeBytesPerSec || 0)}
                  </div>
                  <div className="stat-detail">
                    {(activeDisk.writeOpsPerSec || 0).toFixed(1)} ops/s
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-label">{t('disk.utilization')}</span>
                  </div>
                  <div className="stat-value" style={{ color: getUsageColor(activeDisk.utilizationPercent || 0) }}>
                    {(activeDisk.utilizationPercent || 0).toFixed(1)}
                    <span className="stat-unit">%</span>
                  </div>
                  <div className="stat-detail">Disk busy time</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-label">{t('disk.ioInProgress')}</span>
                  </div>
                  <div className="stat-value">
                    {activeDisk.ioInProgress || 0}
                  </div>
                  <div className="stat-detail">Current operations</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-label">{t('disk.avgQueueSize')}</span>
                  </div>
                  <div className="stat-value">
                    {(activeDisk.avgQueueSize || 0).toFixed(2)}
                  </div>
                  <div className="stat-detail">Pending requests</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-label">{t('disk.avgWaitTime')}</span>
                  </div>
                  <div className="stat-value">
                    {(activeDisk.avgWaitMs || 0).toFixed(2)}
                    <span className="stat-unit">ms</span>
                  </div>
                  <div className="stat-detail">Average latency</div>
                </div>
              </div>
            </>
          )}

          {/* Inodes (if available) */}
          {activeDisk.inodesPercent !== undefined && activeDisk.inodesTotal > 0 && (
            <div className="breakdown-container">
              <div className="breakdown-title">{t('disk.inodes')}</div>
              <div className="inodes-info">
                <div className="inodes-stats">
                  <div className="inodes-stat-item">
                    <span className="inodes-label">{t('disk.inodesUsed')}</span>
                    <span className="inodes-value">{formatNumber(activeDisk.inodesUsed || 0)}</span>
                  </div>
                  <div className="inodes-stat-item">
                    <span className="inodes-label">{t('disk.inodesTotal')}</span>
                    <span className="inodes-value">{formatNumber(activeDisk.inodesTotal || 0)}</span>
                  </div>
                  <div className="inodes-stat-item">
                    <span className="inodes-label">{t('disk.usage')}</span>
                    <span className="inodes-value" style={{ color: getUsageColor(activeDisk.inodesPercent || 0) }}>
                      {(activeDisk.inodesPercent || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="progress-bar-container" style={{ marginTop: '0.75rem' }}>
                  <div className="progress-bar">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${activeDisk.inodesPercent || 0}%`, 
                        background: getUsageColor(activeDisk.inodesPercent || 0) 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Disk Details Table */}
          <div className="data-table-container">
            <div className="data-table-title">{t('disk.diskDetails')}</div>
            <table className="data-table">
              <tbody>
                <tr>
                  <td>{t('disk.device')}</td>
                  <td className="mono">{activeDisk.device || activeDisk.filesystem}</td>
                </tr>
                <tr>
                  <td>{t('disk.mount')}</td>
                  <td className="mono">{activeDisk.mountPoint || activeDisk.mount_point}</td>
                </tr>
                <tr>
                  <td>{t('disk.type')}</td>
                  <td>{activeDisk.filesystemType || activeDisk.filesystem || '-'}</td>
                </tr>
                <tr>
                  <td>{t('disk.size')}</td>
                  <td>{formatBytes((activeDisk.totalGb || 0) * 1024 * 1024 * 1024)}</td>
                </tr>
                <tr>
                  <td>{t('disk.used')}</td>
                  <td>{formatBytes((activeDisk.usedGb || 0) * 1024 * 1024 * 1024)}</td>
                </tr>
                <tr>
                  <td>{t('disk.free')}</td>
                  <td>{formatBytes(((activeDisk.totalGb || 0) - (activeDisk.usedGb || 0)) * 1024 * 1024 * 1024)}</td>
                </tr>
                <tr>
                  <td>{t('disk.usage')}</td>
                  <td style={{ color: getUsageColor(activeDisk.usagePercent || 0) }}>
                    {(activeDisk.usagePercent || 0).toFixed(2)}%
                  </td>
                </tr>
                {activeDisk.readOpsPerSec !== undefined && (
                  <>
                    <tr>
                      <td>{t('disk.readOps')}</td>
                      <td>{(activeDisk.readOpsPerSec || 0).toFixed(2)} ops/s</td>
                    </tr>
                    <tr>
                      <td>{t('disk.writeOps')}</td>
                      <td>{(activeDisk.writeOpsPerSec || 0).toFixed(2)} ops/s</td>
                    </tr>
                    <tr>
                      <td>{t('disk.ioTime')}</td>
                      <td>{(activeDisk.ioTimeMs || 0).toFixed(0)} ms</td>
                    </tr>
                    <tr>
                      <td>Weighted I/O Time</td>
                      <td>{(activeDisk.weightedIoTimeMs || 0).toFixed(0)} ms</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* All Disks Comparison Table */}
          {diskList.length > 1 && (
            <div className="data-table-container">
              <div className="data-table-title">{t('disk.allDisks')}</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('disk.device')}</th>
                    <th>{t('disk.mount')}</th>
                    <th>{t('disk.type')}</th>
                    <th className="numeric">{t('disk.size')}</th>
                    <th className="numeric">{t('disk.used')}</th>
                    <th className="numeric">{t('disk.usage')}</th>
                    {disks?.length > 0 && (
                      <>
                        <th className="numeric">{t('disk.read')}</th>
                        <th className="numeric">{t('disk.write')}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {diskList.map((disk, idx) => {
                    const diskId = disk.device || disk.filesystem
                    const isSelected = diskId === (activeDisk?.device || activeDisk?.filesystem)
                    
                    return (
                      <tr 
                        key={diskId || idx}
                        className={isSelected ? 'is-selected' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedDevice(diskId)}
                      >
                        <td className="mono">{diskId}</td>
                        <td>{disk.mountPoint || disk.mount_point}</td>
                        <td>{disk.filesystemType || disk.filesystem || '-'}</td>
                        <td className="numeric">{formatBytes((disk.totalGb || 0) * 1024 * 1024 * 1024)}</td>
                        <td className="numeric">{formatBytes((disk.usedGb || 0) * 1024 * 1024 * 1024)}</td>
                        <td className="numeric" style={{ color: getUsageColor(disk.usagePercent || 0) }}>
                          {(disk.usagePercent || 0).toFixed(1)}%
                        </td>
                        {disks?.length > 0 && (
                          <>
                            <td className="numeric">{formatSpeed(disk.readBytesPerSec || 0)}</td>
                            <td className="numeric">{formatSpeed(disk.writeBytesPerSec || 0)}</td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function formatNumber(num) {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

export default DiskTab
