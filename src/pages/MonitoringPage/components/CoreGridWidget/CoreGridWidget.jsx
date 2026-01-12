import './CoreGridWidget.css'

function CoreGridWidget({ metrics }) {
  const cpu = metrics?.cpu || {}
  const memory = metrics?.memory || {}
  const disk = metrics?.disks?.[0] || {}
  const network = metrics?.network?.[0] || {}

  const formatNumber = (value, decimals = 0) => {
    if (value === null || value === undefined) return '--'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '--'
    return num.toFixed(decimals)
  }

  const formatMb = (mb) => {
    if (!mb && mb !== 0) return '--'
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${Math.round(mb)} MB`
  }

  const formatGb = (gb) => {
    if (!gb && gb !== 0) return '--'
    return `${formatNumber(gb, 0)} GB`
  }

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '--'
    const mb = bytes / 1024 / 1024
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div className="monitoring-grid">
      <section className="monitoring-card">
        <div className="card-header">
          <h2>CPU</h2>
          <span className="card-value">{formatNumber(cpu.usagePercent)}%</span>
        </div>
        <div className="progress">
          <span style={{ width: `${cpu.usagePercent || 0}%` }} />
        </div>
        <p className="card-footnote">
          {cpu.cores || '--'} cores - {cpu.frequencyMhz ? `${(cpu.frequencyMhz / 1000).toFixed(1)} GHz` : '--'}
        </p>
      </section>

      <section className="monitoring-card">
        <div className="card-header">
          <h2>Memoria</h2>
          <span className="card-value">
            {formatMb(memory.usedMb)} / {formatMb(memory.totalMb)}
          </span>
        </div>
        <div className="progress">
          <span style={{ width: `${memory.usagePercent || 0}%` }} />
        </div>
        <p className="card-footnote">Swap {formatMb(memory.swapUsedMb)}</p>
      </section>

      <section className="monitoring-card">
        <div className="card-header">
          <h2>Disco</h2>
          <span className="card-value">
            {formatGb(disk.usedGb)} / {formatGb(disk.totalGb)}
          </span>
        </div>
        <div className="progress">
          <span style={{ width: `${disk.usagePercent || 0}%` }} />
        </div>
        <p className="card-footnote">{disk.mountPoint || '--'}</p>
      </section>

      <section className="monitoring-card">
        <div className="card-header">
          <h2>Red</h2>
          <span className="card-value">{network.interface || '--'}</span>
        </div>
        <div className="progress">
          <span style={{ width: `${network.rxBytes && network.txBytes ? 50 : 0}%` }} />
        </div>
        <p className="card-footnote">
          RX {formatBytes(network.rxBytes)} - TX {formatBytes(network.txBytes)}
        </p>
      </section>
    </div>
  )
}

export default CoreGridWidget
