import { useTranslation } from '../../../../../../hooks/useTranslation.jsx'
import { formatBytes, getUsageColor } from '../../../../hooks/useAdvancedMetrics.js'
import '../../SystemSection.css'

function MemoryTab({ metrics, basicMetrics, loading }) {
  const { t } = useTranslation()

  if (!metrics && !basicMetrics && !loading) {
    return (
      <div className="no-data">
        <div className="no-data-icon">📊</div>
        <p>{t('monitoring.noData')}</p>
      </div>
    )
  }

  // Calcular uso de RAM
  const totalMb = basicMetrics?.totalMb || 0
  const usedMb = basicMetrics?.usedMb || 0
  const usagePercent = basicMetrics?.usagePercent || (totalMb > 0 ? (usedMb / totalMb) * 100 : 0)
  const usageColor = getUsageColor(usagePercent)

  // Swap
  const swapTotalMb = basicMetrics?.swapTotalMb || 0
  const swapUsedMb = basicMetrics?.swapUsedMb || 0
  const swapPercent = basicMetrics?.swapPercent || (swapTotalMb > 0 ? (swapUsedMb / swapTotalMb) * 100 : 0)
  const swapColor = getUsageColor(swapPercent)

  // Memory breakdown para el chart
  const breakdown = [
    { key: 'used', label: 'Used', value: usedMb * 1024 * 1024, color: '#ff5370' },
    { key: 'buffers', label: 'Buffers', value: metrics?.buffers || 0, color: '#64ffda' },
    { key: 'cached', label: 'Cached', value: metrics?.cached || 0, color: '#5ccfe6' },
    { key: 'available', label: 'Available', value: (basicMetrics?.availableMb || 0) * 1024 * 1024, color: 'rgba(100, 255, 218, 0.2)' },
  ]

  const totalBytes = totalMb * 1024 * 1024

  return (
    <div className="tab-container">
      {/* Main Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">RAM Usage</span>
          </div>
          <div className="stat-value" style={{ color: usageColor }}>
            {usagePercent.toFixed(1)}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-detail">
            {formatBytes(usedMb * 1024 * 1024)} / {formatBytes(totalMb * 1024 * 1024)}
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${usagePercent}%`, background: usageColor }}
              />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Swap Usage</span>
          </div>
          <div className="stat-value" style={{ color: swapColor }}>
            {swapPercent.toFixed(1)}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-detail">
            {formatBytes(swapUsedMb * 1024 * 1024)} / {formatBytes(swapTotalMb * 1024 * 1024)}
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${swapPercent}%`, background: swapColor }}
              />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Buffers</span>
          </div>
          <div className="stat-value">
            {formatBytes(metrics?.buffers || 0)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Cached</span>
          </div>
          <div className="stat-value">
            {formatBytes(metrics?.cached || 0)}
          </div>
        </div>
      </div>

      {/* Memory Breakdown */}
      {totalBytes > 0 && (
        <div className="breakdown-container">
          <div className="breakdown-title">Memory Distribution</div>
          <div className="breakdown-bar">
            {breakdown.filter(b => b.value > 0).map(item => (
              <div
                key={item.key}
                className="breakdown-segment"
                style={{ 
                  width: `${(item.value / totalBytes) * 100}%`, 
                  background: item.color,
                }}
                title={`${item.label}: ${formatBytes(item.value)}`}
              />
            ))}
          </div>
          <div className="breakdown-legend">
            {breakdown.filter(b => b.value > 0).map(item => (
              <div key={item.key} className="legend-item">
                <div className="legend-color" style={{ background: item.color }} />
                <span>{item.label}: {formatBytes(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Memory Info */}
      {metrics && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="numeric">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Active</td>
                <td className="numeric">{formatBytes(metrics.active || 0)}</td>
              </tr>
              <tr>
                <td>Inactive</td>
                <td className="numeric">{formatBytes(metrics.inactive || 0)}</td>
              </tr>
              <tr>
                <td>Dirty</td>
                <td className="numeric">{formatBytes(metrics.dirty || 0)}</td>
              </tr>
              <tr>
                <td>Writeback</td>
                <td className="numeric">{formatBytes(metrics.writeback || 0)}</td>
              </tr>
              <tr>
                <td>Mapped</td>
                <td className="numeric">{formatBytes(metrics.mapped || 0)}</td>
              </tr>
              <tr>
                <td>Shared Memory</td>
                <td className="numeric">{formatBytes(metrics.shmem || 0)}</td>
              </tr>
              <tr>
                <td>Slab</td>
                <td className="numeric">{formatBytes(metrics.slab || 0)}</td>
              </tr>
              <tr>
                <td>Page Tables</td>
                <td className="numeric">{formatBytes(metrics.pageTables || 0)}</td>
              </tr>
              {metrics.hugepagesTotal > 0 && (
                <>
                  <tr>
                    <td>Huge Pages Total</td>
                    <td className="numeric">{metrics.hugepagesTotal}</td>
                  </tr>
                  <tr>
                    <td>Huge Pages Free</td>
                    <td className="numeric">{metrics.hugepagesFree}</td>
                  </tr>
                  <tr>
                    <td>Huge Page Size</td>
                    <td className="numeric">{metrics.hugepagesSizeKb} KB</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MemoryTab
