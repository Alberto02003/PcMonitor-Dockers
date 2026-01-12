import './ExtendedGridWidget.css'

function ExtendedGridWidget({ metrics }) {
  const gpu = metrics?.gpu || null
  const temps = metrics?.temperatures || {}
  const memory = metrics?.memory || {}
  const topProcess = metrics?.topProcesses?.[0] || {}

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

  const gpuTemp = temps.gpuTempC || gpu?.temperatureC || 0

  return (
    <div className="monitoring-grid">
      <section className="monitoring-card">
        <div className="card-header">
          <h2>GPU</h2>
          <span className="card-value">{gpu ? `${formatNumber(gpu.usagePercent)}%` : 'N/A'}</span>
        </div>
        <div className="progress">
          <span style={{ width: `${gpu?.usagePercent || 0}%` }} />
        </div>
        <p className="card-footnote">
          {gpu ? `VRAM ${formatMb(gpu.memoryUsedMb)} / ${formatMb(gpu.memoryTotalMb)}` : 'GPU no detectada'}
        </p>
      </section>

      <section className="monitoring-card">
        <div className="card-header">
          <h2>Temperaturas</h2>
          <span className="card-value">CPU {formatNumber(temps.cpuTempC)}C</span>
        </div>
        <div className="temp-bars">
          <div>
            <span>CPU</span>
            <div className="hbar">
              <span style={{ width: `${Math.min(temps.cpuTempC || 0, 100)}%` }} />
            </div>
          </div>
          <div>
            <span>GPU</span>
            <div className="hbar">
              <span style={{ width: `${Math.min(gpuTemp, 100)}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="monitoring-card">
        <div className="card-header">
          <h2>Procesos</h2>
          <span className="card-value">{metrics?.topProcesses?.length || '--'}</span>
        </div>
        <div className="status-badges">
          <span className={`badge ${metrics?.topProcesses?.length > 0 ? 'ok' : 'warn'}`}>
            {metrics?.topProcesses?.length > 0 ? 'OK' : 'Sin datos'}
          </span>
        </div>
        <p className="card-footnote">
          Top CPU: {topProcess.name || '--'} ({formatNumber(topProcess.cpuPercent)}%)
        </p>
      </section>

      <section className="monitoring-card">
        <div className="card-header">
          <h2>Swap</h2>
          <span className="card-value">
            {formatMb(memory.swapUsedMb)} / {formatMb(memory.swapTotalMb)}
          </span>
        </div>
        <div className="progress">
          <span style={{ width: `${memory.swapPercent || 0}%` }} />
        </div>
        <p className="card-footnote">Uso: {formatNumber(memory.swapPercent)}%</p>
      </section>
    </div>
  )
}

export default ExtendedGridWidget
