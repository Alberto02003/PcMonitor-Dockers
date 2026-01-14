import { useState } from 'react'
import { useTranslation } from '../../../../../../hooks/useTranslation.jsx'
import { formatBytes, formatSpeed, getUsageColor } from '../../../../hooks/useAdvancedMetrics.js'
import '../../SystemSection.css'

function DiskTab({ disks, basicDisks, loading }) {
  const { t } = useTranslation()
  const [selectedDevice, setSelectedDevice] = useState(null)

  // Usar los discos avanzados si estan disponibles
  const diskList = disks?.length ? disks : basicDisks || []

  if (!diskList.length && !loading) {
    return (
      <div className="no-data">
        <div className="no-data-icon">💾</div>
        <p>{t('monitoring.noData')}</p>
      </div>
    )
  }

  // Seleccionar el primer disco si no hay seleccion
  const activeDisk = selectedDevice 
    ? diskList.find(d => d.device === selectedDevice) 
    : diskList[0]

  return (
    <div className="tab-container">
      {/* Disk Selector */}
      {diskList.length > 1 && (
        <div className="disk-selector">
          {diskList.map((disk) => (
            <button
              key={disk.device || disk.filesystem}
              type="button"
              className={`disk-selector-btn ${(disk.device || disk.filesystem) === (activeDisk?.device || activeDisk?.filesystem) ? 'is-active' : ''}`}
              onClick={() => setSelectedDevice(disk.device || disk.filesystem)}
            >
              <span className="disk-name">{disk.device || disk.filesystem}</span>
              <span className="disk-mount">{disk.mountPoint || disk.mount_point}</span>
            </button>
          ))}
        </div>
      )}

      {/* Active Disk Details */}
      {activeDisk && (
        <>
          {/* Main Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Usage</span>
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

            {/* I/O Stats (solo si hay datos avanzados) */}
            {activeDisk.readOpsPerSec !== undefined && (
              <>
                <div className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-label">Read</span>
                  </div>
                  <div className="stat-value">
                    {formatSpeed(activeDisk.readBytesPerSec || 0)}
                  </div>
                  <div className="stat-detail">
                    {(activeDisk.readOpsPerSec || 0).toFixed(0)} ops/s
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-label">Write</span>
                  </div>
                  <div className="stat-value">
                    {formatSpeed(activeDisk.writeBytesPerSec || 0)}
                  </div>
                  <div className="stat-detail">
                    {(activeDisk.writeOpsPerSec || 0).toFixed(0)} ops/s
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-label">Utilization</span>
                  </div>
                  <div className="stat-value" style={{ color: getUsageColor(activeDisk.utilizationPercent || 0) }}>
                    {(activeDisk.utilizationPercent || 0).toFixed(1)}
                    <span className="stat-unit">%</span>
                  </div>
                </div>
              </>
            )}

            {/* Inodes (si disponible) */}
            {activeDisk.inodesPercent !== undefined && (
              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-label">Inodes</span>
                </div>
                <div className="stat-value" style={{ color: getUsageColor(activeDisk.inodesPercent || 0) }}>
                  {(activeDisk.inodesPercent || 0).toFixed(1)}
                  <span className="stat-unit">%</span>
                </div>
                <div className="stat-detail">
                  {formatNumber(activeDisk.inodesUsed || 0)} / {formatNumber(activeDisk.inodesTotal || 0)}
                </div>
              </div>
            )}
          </div>

          {/* All Disks Table */}
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Mount</th>
                  <th>Type</th>
                  <th className="numeric">Size</th>
                  <th className="numeric">Used</th>
                  <th className="numeric">Usage</th>
                  {disks?.length > 0 && (
                    <>
                      <th className="numeric">Read</th>
                      <th className="numeric">Write</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {diskList.map((disk, idx) => (
                  <tr 
                    key={disk.device || disk.filesystem || idx}
                    className={(disk.device || disk.filesystem) === (activeDisk?.device || activeDisk?.filesystem) ? 'is-selected' : ''}
                  >
                    <td className="mono">{disk.device || disk.filesystem}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

export default DiskTab
