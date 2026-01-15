import { useTranslation } from '../../../../../../hooks/useTranslation.jsx'
import { getUsageColor } from '../../../../hooks/useAdvancedMetrics.js'
import '../../SystemSection.css'

function CpuTab({ metrics, basicMetrics, loading }) {
  const { t } = useTranslation()

  if (!metrics && !loading) {
    return (
      <div className="no-data">
        <p>{t('monitoring.noData')}</p>
      </div>
    )
  }

  const totalUsage = 100 - (metrics?.idlePercent || 0)
  const usageColor = getUsageColor(totalUsage)

  // CPU Breakdown data
  const breakdown = [
    { key: 'user', label: t('cpu.user'), value: metrics?.userPercent || 0, color: '#64ffda' },
    { key: 'system', label: t('cpu.system'), value: metrics?.systemPercent || 0, color: '#5ccfe6' },
    { key: 'iowait', label: t('cpu.iowait'), value: metrics?.iowaitPercent || 0, color: '#f78c6c' },
    { key: 'nice', label: t('cpu.nice'), value: metrics?.nicePercent || 0, color: '#c3e88d' },
    { key: 'irq', label: t('cpu.irq'), value: metrics?.irqPercent || 0, color: '#ff5370' },
    { key: 'softirq', label: t('cpu.softirq'), value: metrics?.softirqPercent || 0, color: '#ffcb6b' },
    { key: 'steal', label: t('cpu.steal'), value: metrics?.stealPercent || 0, color: '#c792ea' },
    { key: 'idle', label: t('cpu.idle'), value: metrics?.idlePercent || 0, color: 'rgba(100, 255, 218, 0.2)' },
  ]

  return (
    <div className="tab-container">
      {/* Header Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('monitoring.cpu')} {t('cpu.total')}</span>
          </div>
          <div className="stat-value" style={{ color: usageColor }}>
            {totalUsage.toFixed(1)}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-detail">
            {basicMetrics?.cpu?.cores || 0} {t('cpu.cores')} • {(basicMetrics?.cpu?.frequencyMhz || 0).toFixed(0)} MHz
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
            <span className="stat-label">{t('cpu.user')}</span>
          </div>
          <div className="stat-value" style={{ color: '#64ffda' }}>
            {(metrics?.userPercent || 0).toFixed(1)}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-detail">User space processes</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('cpu.system')}</span>
          </div>
          <div className="stat-value" style={{ color: '#5ccfe6' }}>
            {(metrics?.systemPercent || 0).toFixed(1)}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-detail">Kernel space processes</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('cpu.iowait')}</span>
          </div>
          <div className="stat-value" style={{ color: '#f78c6c' }}>
            {(metrics?.iowaitPercent || 0).toFixed(1)}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-detail">Waiting for I/O</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('cpu.contextSwitches')}</span>
          </div>
          <div className="stat-value">
            {formatNumber(metrics?.contextSwitchesPerSec || 0)}
            <span className="stat-unit">{t('cpu.perSecond')}</span>
          </div>
          <div className="stat-detail">Task scheduler switches</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('cpu.interrupts')}</span>
          </div>
          <div className="stat-value">
            {formatNumber(metrics?.interruptsPerSec || 0)}
            <span className="stat-unit">{t('cpu.perSecond')}</span>
          </div>
          <div className="stat-detail">Hardware interrupts</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('cpu.processesRunning')}</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--status-success)' }}>
            {metrics?.processesRunning || 0}
          </div>
          <div className="stat-detail">Active processes</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{t('cpu.processesBlocked')}</span>
          </div>
          <div className="stat-value" style={{ color: (metrics?.processesBlocked || 0) > 0 ? 'var(--status-warning)' : 'var(--text-primary)' }}>
            {metrics?.processesBlocked || 0}
          </div>
          <div className="stat-detail">Waiting for I/O</div>
        </div>
      </div>

      {/* Load Average */}
      <div className="breakdown-container">
        <div className="breakdown-title">{t('cpu.loadAverage')}</div>
        <div className="load-average-detailed">
          <div className="load-avg-item">
            <div className="load-avg-time">1 min</div>
            <div className="load-avg-value">{(basicMetrics?.cpu?.loadAvg1m || 0).toFixed(2)}</div>
            <div className="load-avg-bar">
              <div 
                className="load-avg-bar-fill" 
                style={{ 
                  width: `${Math.min(100, ((basicMetrics?.cpu?.loadAvg1m || 0) / (basicMetrics?.cpu?.cores || 1)) * 100)}%`,
                  background: getUsageColor(Math.min(100, ((basicMetrics?.cpu?.loadAvg1m || 0) / (basicMetrics?.cpu?.cores || 1)) * 100))
                }}
              />
            </div>
          </div>
          <div className="load-avg-item">
            <div className="load-avg-time">5 min</div>
            <div className="load-avg-value">{(basicMetrics?.cpu?.loadAvg5m || 0).toFixed(2)}</div>
            <div className="load-avg-bar">
              <div 
                className="load-avg-bar-fill" 
                style={{ 
                  width: `${Math.min(100, ((basicMetrics?.cpu?.loadAvg5m || 0) / (basicMetrics?.cpu?.cores || 1)) * 100)}%`,
                  background: getUsageColor(Math.min(100, ((basicMetrics?.cpu?.loadAvg5m || 0) / (basicMetrics?.cpu?.cores || 1)) * 100))
                }}
              />
            </div>
          </div>
          <div className="load-avg-item">
            <div className="load-avg-time">15 min</div>
            <div className="load-avg-value">{(basicMetrics?.cpu?.loadAvg15m || 0).toFixed(2)}</div>
            <div className="load-avg-bar">
              <div 
                className="load-avg-bar-fill" 
                style={{ 
                  width: `${Math.min(100, ((basicMetrics?.cpu?.loadAvg15m || 0) / (basicMetrics?.cpu?.cores || 1)) * 100)}%`,
                  background: getUsageColor(Math.min(100, ((basicMetrics?.cpu?.loadAvg15m || 0) / (basicMetrics?.cpu?.cores || 1)) * 100))
                }}
              />
            </div>
          </div>
        </div>
        <div className="stat-detail" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
          Load relative to {basicMetrics?.cpu?.cores || 0} CPU cores
        </div>
      </div>

      {/* CPU Breakdown */}
      <div className="breakdown-container">
        <div className="breakdown-title">{t('cpu.breakdown')}</div>
        <div className="breakdown-bar">
          {breakdown.filter(b => b.key !== 'idle' && b.value > 0).map(item => (
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
              <span>{item.label}: {item.value.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Additional CPU Metrics */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {metrics?.nicePercent > 0 && (
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-label">{t('cpu.nice')}</span>
            </div>
            <div className="stat-value" style={{ color: '#c3e88d' }}>
              {(metrics.nicePercent || 0).toFixed(2)}
              <span className="stat-unit">%</span>
            </div>
            <div className="stat-detail">Low priority tasks</div>
          </div>
        )}

        {metrics?.irqPercent > 0 && (
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-label">{t('cpu.irq')}</span>
            </div>
            <div className="stat-value" style={{ color: '#ff5370' }}>
              {(metrics.irqPercent || 0).toFixed(2)}
              <span className="stat-unit">%</span>
            </div>
            <div className="stat-detail">Hardware IRQ</div>
          </div>
        )}

        {metrics?.softirqPercent > 0 && (
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-label">{t('cpu.softirq')}</span>
            </div>
            <div className="stat-value" style={{ color: '#ffcb6b' }}>
              {(metrics.softirqPercent || 0).toFixed(2)}
              <span className="stat-unit">%</span>
            </div>
            <div className="stat-detail">Software IRQ</div>
          </div>
        )}

        {metrics?.stealPercent > 0 && (
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-label">{t('cpu.steal')}</span>
            </div>
            <div className="stat-value" style={{ color: '#c792ea' }}>
              {(metrics.stealPercent || 0).toFixed(2)}
              <span className="stat-unit">%</span>
            </div>
            <div className="stat-detail">Stolen by hypervisor</div>
          </div>
        )}
      </div>

      {/* Per-Core Usage */}
      {metrics?.cores?.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('cpu.perCore')} ({metrics.cores.length} {t('cpu.cores')})
          </h4>
          <div className="cores-grid">
            {metrics.cores.map((core) => {
              const coreColor = getUsageColor(core.usage)
              return (
                <div key={core.core} className="core-card">
                  <div className="core-label">Core {core.core}</div>
                  <div className="core-value" style={{ color: coreColor }}>
                    {core.usage.toFixed(1)}%
                  </div>
                  <div className="core-breakdown">
                    <div className="core-breakdown-item">
                      <span className="core-breakdown-label">User</span>
                      <span className="core-breakdown-value">{core.user.toFixed(1)}%</span>
                    </div>
                    <div className="core-breakdown-item">
                      <span className="core-breakdown-label">Sys</span>
                      <span className="core-breakdown-value">{core.system.toFixed(1)}%</span>
                    </div>
                    <div className="core-breakdown-item">
                      <span className="core-breakdown-label">Idle</span>
                      <span className="core-breakdown-value">{core.idle.toFixed(1)}%</span>
                    </div>
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
