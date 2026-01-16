import { useTranslation } from '../../../../../../hooks/useTranslation.jsx'
import { formatBytes, getUsageColor } from '../../../../../../utils/metricsUtils.js'
import '../../SystemSection.css'

function MemoryTab({ metrics, basicMetrics, loading }) {
  const { t } = useTranslation()

  if (!metrics && !basicMetrics && !loading) {
    return (
      <div className="no-data">
        <p>{t('monitoring.noData')}</p>
      </div>
    )
  }

  // Calculate RAM usage
  const totalMb = basicMetrics?.memory?.totalMb || 0
  const usedMb = basicMetrics?.memory?.usedMb || 0
  const freeMb = basicMetrics?.memory?.freeMb || 0
  const availableMb = basicMetrics?.memory?.availableMb || 0
  const usagePercent = basicMetrics?.memory?.usagePercent || (totalMb > 0 ? (usedMb / totalMb) * 100 : 0)
  const usageColor = getUsageColor(usagePercent)

  // Swap
  const swapTotalMb = basicMetrics?.memory?.swapTotalMb || 0
  const swapUsedMb = basicMetrics?.memory?.swapUsedMb || 0
  const swapPercent = basicMetrics?.memory?.swapPercent || (swapTotalMb > 0 ? (swapUsedMb / swapTotalMb) * 100 : 0)
  const swapColor = getUsageColor(swapPercent)

  // Memory breakdown for chart
  const totalBytes = totalMb * 1024 * 1024
  const usedBytes = usedMb * 1024 * 1024
  const buffersBytes = metrics?.buffers || 0
  const cachedBytes = metrics?.cached || 0
  const availableBytes = availableMb * 1024 * 1024

  return (
    <div className="tab-container">
      {/* Main Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">RAM {t('memory.usage')}</span>
          </div>
          <div className="stat-value" style={{ color: usageColor }}>
            {usagePercent.toFixed(1)}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-detail">
            {formatBytes(usedBytes)} / {formatBytes(totalBytes)}
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
            <span className="stat-label">{t('memory.used')}</span>
          </div>
          <div className="stat-value">
            {formatBytes(usedBytes)}
          </div>
          <div className="stat-detail">Actually used memory</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('memory.available')}</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--status-success)' }}>
            {formatBytes(availableBytes)}
          </div>
          <div className="stat-detail">Available for apps</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('memory.free')}</span>
          </div>
          <div className="stat-value">
            {formatBytes(freeMb * 1024 * 1024)}
          </div>
          <div className="stat-detail">Completely unused</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('memory.buffers')}</span>
          </div>
          <div className="stat-value" style={{ color: '#64ffda' }}>
            {formatBytes(buffersBytes)}
          </div>
          <div className="stat-detail">Temporary storage</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('memory.cached')}</span>
          </div>
          <div className="stat-value" style={{ color: '#5ccfe6' }}>
            {formatBytes(cachedBytes)}
          </div>
          <div className="stat-detail">File cache</div>
        </div>

        {swapTotalMb > 0 && (
          <>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">{t('memory.swap')} {t('memory.usage')}</span>
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
                <span className="stat-label">{t('memory.swapCached')}</span>
              </div>
              <div className="stat-value">
                {formatBytes(metrics?.swapCached || 0)}
              </div>
              <div className="stat-detail">Cached in swap</div>
            </div>
          </>
        )}
      </div>

      {/* Memory Distribution */}
      {totalBytes > 0 && (
        <div className="breakdown-container">
          <div className="breakdown-title">{t('memory.distribution')}</div>
          <div className="breakdown-bar">
            {usedBytes > 0 && (
              <div
                className="breakdown-segment"
                style={{ 
                  width: `${(usedBytes / totalBytes) * 100}%`, 
                  background: '#ff5370',
                }}
                title={`${t('memory.used')}: ${formatBytes(usedBytes)}`}
              />
            )}
            {buffersBytes > 0 && (
              <div
                className="breakdown-segment"
                style={{ 
                  width: `${(buffersBytes / totalBytes) * 100}%`, 
                  background: '#64ffda',
                }}
                title={`${t('memory.buffers')}: ${formatBytes(buffersBytes)}`}
              />
            )}
            {cachedBytes > 0 && (
              <div
                className="breakdown-segment"
                style={{ 
                  width: `${(cachedBytes / totalBytes) * 100}%`, 
                  background: '#5ccfe6',
                }}
                title={`${t('memory.cached')}: ${formatBytes(cachedBytes)}`}
              />
            )}
            {availableBytes > 0 && (
              <div
                className="breakdown-segment"
                style={{ 
                  width: `${(availableBytes / totalBytes) * 100}%`, 
                  background: 'rgba(100, 255, 218, 0.2)',
                }}
                title={`${t('memory.available')}: ${formatBytes(availableBytes)}`}
              />
            )}
          </div>
          <div className="breakdown-legend">
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#ff5370' }} />
              <span>{t('memory.used')}: {formatBytes(usedBytes)}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#64ffda' }} />
              <span>{t('memory.buffers')}: {formatBytes(buffersBytes)}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#5ccfe6' }} />
              <span>{t('memory.cached')}: {formatBytes(cachedBytes)}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: 'rgba(100, 255, 218, 0.2)' }} />
              <span>{t('memory.available')}: {formatBytes(availableBytes)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Memory Info */}
      {metrics && (
        <div className="data-table-container">
          <div className="data-table-title">{t('memory.details')}</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="numeric">Value</th>
                <th className="numeric">Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{t('memory.active')}</td>
                <td className="numeric">{formatBytes(metrics.active || 0)}</td>
                <td className="numeric">{totalBytes > 0 ? ((metrics.active || 0) / totalBytes * 100).toFixed(2) : 0}%</td>
              </tr>
              <tr>
                <td>{t('memory.inactive')}</td>
                <td className="numeric">{formatBytes(metrics.inactive || 0)}</td>
                <td className="numeric">{totalBytes > 0 ? ((metrics.inactive || 0) / totalBytes * 100).toFixed(2) : 0}%</td>
              </tr>
              <tr>
                <td>{t('memory.dirty')}</td>
                <td className="numeric">{formatBytes(metrics.dirty || 0)}</td>
                <td className="numeric">{totalBytes > 0 ? ((metrics.dirty || 0) / totalBytes * 100).toFixed(2) : 0}%</td>
              </tr>
              <tr>
                <td>{t('memory.writeback')}</td>
                <td className="numeric">{formatBytes(metrics.writeback || 0)}</td>
                <td className="numeric">{totalBytes > 0 ? ((metrics.writeback || 0) / totalBytes * 100).toFixed(2) : 0}%</td>
              </tr>
              <tr>
                <td>{t('memory.mapped')}</td>
                <td className="numeric">{formatBytes(metrics.mapped || 0)}</td>
                <td className="numeric">{totalBytes > 0 ? ((metrics.mapped || 0) / totalBytes * 100).toFixed(2) : 0}%</td>
              </tr>
              <tr>
                <td>{t('memory.shmem')}</td>
                <td className="numeric">{formatBytes(metrics.shmem || 0)}</td>
                <td className="numeric">{totalBytes > 0 ? ((metrics.shmem || 0) / totalBytes * 100).toFixed(2) : 0}%</td>
              </tr>
              <tr>
                <td>{t('memory.slab')}</td>
                <td className="numeric">{formatBytes(metrics.slab || 0)}</td>
                <td className="numeric">{totalBytes > 0 ? ((metrics.slab || 0) / totalBytes * 100).toFixed(2) : 0}%</td>
              </tr>
              <tr>
                <td>{t('memory.sreclaimable')}</td>
                <td className="numeric">{formatBytes(metrics.sreclaimable || 0)}</td>
                <td className="numeric">{totalBytes > 0 ? ((metrics.sreclaimable || 0) / totalBytes * 100).toFixed(2) : 0}%</td>
              </tr>
              <tr>
                <td>{t('memory.sunreclaim')}</td>
                <td className="numeric">{formatBytes(metrics.sunreclaim || 0)}</td>
                <td className="numeric">{totalBytes > 0 ? ((metrics.sunreclaim || 0) / totalBytes * 100).toFixed(2) : 0}%</td>
              </tr>
              <tr>
                <td>{t('memory.pageTables')}</td>
                <td className="numeric">{formatBytes(metrics.pageTables || 0)}</td>
                <td className="numeric">{totalBytes > 0 ? ((metrics.pageTables || 0) / totalBytes * 100).toFixed(2) : 0}%</td>
              </tr>
              {metrics.hugepagesTotal > 0 && (
                <>
                  <tr>
                    <td>{t('memory.hugepagesTotal')}</td>
                    <td className="numeric" colSpan="2">{metrics.hugepagesTotal}</td>
                  </tr>
                  <tr>
                    <td>{t('memory.hugepagesFree')}</td>
                    <td className="numeric" colSpan="2">{metrics.hugepagesFree}</td>
                  </tr>
                  <tr>
                    <td>{t('memory.hugepagesSize')}</td>
                    <td className="numeric" colSpan="2">{metrics.hugepagesSizeKb} KB</td>
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
