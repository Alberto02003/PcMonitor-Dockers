import { useState, useEffect, useRef } from 'react'
import { AnimatedPercent, AnimatedBytes, Sparkline } from '../../../../components'
import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './CoreGridWidget.css'

// Hook para mantener historial de valores para sparklines
function useMetricsHistory(value, maxLength = 20) {
  const [history, setHistory] = useState([])
  const prevValue = useRef(value)

  useEffect(() => {
    if (value !== null && value !== undefined && value !== prevValue.current) {
      setHistory(prev => {
        const newHistory = [...prev, value]
        if (newHistory.length > maxLength) {
          return newHistory.slice(-maxLength)
        }
        return newHistory
      })
      prevValue.current = value
    }
  }, [value, maxLength])

  return history
}

function CoreGridWidget({ metrics }) {
  const { t } = useTranslation()
  const cpu = metrics?.cpu || {}
  const memory = metrics?.memory || {}
  const disk = metrics?.disks?.[0] || {}
  const network = metrics?.network?.[0] || {}

  // Historial para sparklines
  const cpuHistory = useMetricsHistory(cpu.usagePercent)
  const memoryHistory = useMetricsHistory(memory.usagePercent)
  const diskHistory = useMetricsHistory(disk.usagePercent)

  const formatMb = (mb) => {
    if (!mb && mb !== 0) return '--'
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${Math.round(mb)} MB`
  }

  const formatGb = (gb) => {
    if (!gb && gb !== 0) return '--'
    return `${Math.round(gb)} GB`
  }

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '--'
    const mb = bytes / 1024 / 1024
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb.toFixed(1)} MB`
  }

  // Determinar color segun porcentaje
  const getProgressColor = (percent) => {
    if (percent >= 90) return 'var(--color-error)'
    if (percent >= 70) return 'var(--color-warning)'
    return 'var(--color-success)'
  }

  return (
    <div className="monitoring-grid">
      <section className="monitoring-card glass hover-lift animate-fade-in-up">
        <div className="card-header">
          <h2>CPU</h2>
          <span className="card-value">
            <AnimatedPercent value={cpu.usagePercent || 0} />
          </span>
        </div>
        <div className="card-visual">
          <div className="progress">
            <span 
              style={{ 
                width: `${cpu.usagePercent || 0}%`,
                backgroundColor: getProgressColor(cpu.usagePercent || 0)
              }} 
            />
          </div>
          {cpuHistory.length >= 2 && (
            <Sparkline
              data={cpuHistory}
              width={80}
              height={24}
              color={getProgressColor(cpu.usagePercent || 0)}
              strokeWidth={1.5}
              showDot={false}
            />
          )}
        </div>
        <p className="card-footnote">
          {cpu.cores || '--'} cores - {cpu.frequencyMhz ? `${(cpu.frequencyMhz / 1000).toFixed(1)} GHz` : '--'}
        </p>
      </section>

      <section className="monitoring-card glass hover-lift animate-fade-in-up">
        <div className="card-header">
          <h2>{t('core.memory')}</h2>
          <span className="card-value">
            {formatMb(memory.usedMb)} / {formatMb(memory.totalMb)}
          </span>
        </div>
        <div className="card-visual">
          <div className="progress">
            <span 
              style={{ 
                width: `${memory.usagePercent || 0}%`,
                backgroundColor: getProgressColor(memory.usagePercent || 0)
              }} 
            />
          </div>
          {memoryHistory.length >= 2 && (
            <Sparkline
              data={memoryHistory}
              width={80}
              height={24}
              color={getProgressColor(memory.usagePercent || 0)}
              strokeWidth={1.5}
              showDot={false}
            />
          )}
        </div>
        <p className="card-footnote">Swap {formatMb(memory.swapUsedMb)}</p>
      </section>

      <section className="monitoring-card glass hover-lift animate-fade-in-up">
        <div className="card-header">
          <h2>{t('core.disk')}</h2>
          <span className="card-value">
            {formatGb(disk.usedGb)} / {formatGb(disk.totalGb)}
          </span>
        </div>
        <div className="card-visual">
          <div className="progress">
            <span 
              style={{ 
                width: `${disk.usagePercent || 0}%`,
                backgroundColor: getProgressColor(disk.usagePercent || 0)
              }} 
            />
          </div>
          {diskHistory.length >= 2 && (
            <Sparkline
              data={diskHistory}
              width={80}
              height={24}
              color={getProgressColor(disk.usagePercent || 0)}
              strokeWidth={1.5}
              showDot={false}
            />
          )}
        </div>
        <p className="card-footnote">{disk.mountPoint || '--'}</p>
      </section>

      <section className="monitoring-card glass hover-lift animate-fade-in-up">
        <div className="card-header">
          <h2>{t('core.network')}</h2>
          <span className="card-value">{network.interface || '--'}</span>
        </div>
        <div className="card-visual card-visual--network">
          <div className="network-stats">
            <span className="network-stat">
              <span className="network-label">RX</span>
              <AnimatedBytes bytes={(network.rxBytes || 0)} decimals={1} />
            </span>
            <span className="network-stat">
              <span className="network-label">TX</span>
              <AnimatedBytes bytes={(network.txBytes || 0)} decimals={1} />
            </span>
          </div>
        </div>
        <p className="card-footnote">
          RX {formatBytes(network.rxBytes)} - TX {formatBytes(network.txBytes)}
        </p>
      </section>
    </div>
  )
}

export default CoreGridWidget
