import { useTranslation } from '../../../../../../hooks/useTranslation.jsx'
import { getUsageColor } from '../../../../hooks/useAdvancedMetrics.js'
import '../../SystemSection.css'

function CpuTab({ metrics, basicMetrics, loading }) {
  const { t } = useTranslation()

  if (!metrics && !loading) {
    return (
      <div className="no-data">
        <div className="no-data-icon">📊</div>
        <p>{t('monitoring.noData')}</p>
      </div>
    )
  }

  const totalUsage = 100 - (metrics?.idlePercent || 0)
  const usageColor = getUsageColor(totalUsage)

  // CPU Breakdown data
  const breakdown = [
    { key: 'user', label: 'User', value: metrics?.userPercent || 0, color: '#64ffda' },
    { key: 'system', label: 'System', value: metrics?.systemPercent || 0, color: '#5ccfe6' },
    { key: 'iowait', label: 'I/O Wait', value: metrics?.iowaitPercent || 0, color: '#f78c6c' },
    { key: 'nice', label: 'Nice', value: metrics?.nicePercent || 0, color: '#c3e88d' },
    { key: 'irq', label: 'IRQ', value: metrics?.irqPercent || 0, color: '#ff5370' },
    { key: 'softirq', label: 'Soft IRQ', value: metrics?.softirqPercent || 0, color: '#ffcb6b' },
    { key: 'steal', label: 'Steal', value: metrics?.stealPercent || 0, color: '#c792ea' },
    { key: 'idle', label: 'Idle', value: metrics?.idlePercent || 0, color: 'rgba(100, 255, 218, 0.2)' },
  ]

  return (
    <div className="tab-container">
      {/* Header Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('monitoring.cpu')} Total</span>
          </div>
          <div className="stat-value" style={{ color: usageColor }}>
            {totalUsage.toFixed(1)}
            <span className="stat-unit">%</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${totalUsage}%`, background: usageColor }}
              />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('monitoring.processes')}</span>
          </div>
          <div className="stat-value">
            {metrics?.processesRunning || 0}
            <span className="stat-unit">running</span>
          </div>
          <div className="stat-detail">
            {metrics?.processesBlocked || 0} blocked
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Context Switches</span>
          </div>
          <div className="stat-value">
            {formatNumber(metrics?.contextSwitchesPerSec || 0)}
            <span className="stat-unit">/s</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Interrupts</span>
          </div>
          <div className="stat-value">
            {formatNumber(metrics?.interruptsPerSec || 0)}
            <span className="stat-unit">/s</span>
          </div>
        </div>
      </div>

      {/* CPU Breakdown */}
      <div className="breakdown-container">
        <div className="breakdown-title">CPU Breakdown</div>
        <div className="breakdown-bar">
          {breakdown.filter(b => b.key !== 'idle').map(item => (
            <div
              key={item.key}
              className="breakdown-segment"
              style={{ 
                width: `${item.value}%`, 
                background: item.color,
              }}
              title={`${item.label}: ${item.value.toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="breakdown-legend">
          {breakdown.filter(b => b.value > 0).map(item => (
            <div key={item.key} className="legend-item">
              <div className="legend-color" style={{ background: item.color }} />
              <span>{item.label}: {item.value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Core Usage */}
      {metrics?.cores?.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Per-Core Usage ({metrics.cores.length} cores)
          </h4>
          <div className="cores-grid">
            {metrics.cores.map((core) => {
              const coreColor = getUsageColor(core.usage)
              return (
                <div key={core.core} className="core-card">
                  <div className="core-label">Core {core.core}</div>
                  <div className="core-value" style={{ color: coreColor }}>
                    {core.usage.toFixed(0)}%
                  </div>
                  <div className="core-bar">
                    <div 
                      className="core-bar-fill" 
                      style={{ width: `${core.usage}%`, background: coreColor }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toFixed(0)
}

export default CpuTab
