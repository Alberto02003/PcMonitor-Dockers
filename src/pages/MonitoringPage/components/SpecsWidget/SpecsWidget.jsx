import './SpecsWidget.css'

function SpecsWidget({ metrics }) {
  const specs = metrics?.specs || {}
  const systemInfo = metrics?.systemInfo || {}

  const formatValue = (value, suffix = '') => {
    if (value === null || value === undefined || value === '') return '--'
    return `${value}${suffix}`
  }

  const formatFrequency = (mhz) => {
    if (!mhz && mhz !== 0) return '--'
    return `${(mhz / 1000).toFixed(1)} GHz`
  }

  return (
    <section className="monitoring-card system-specs">
      <div className="card-header">
        <h2>Especificaciones</h2>
        <span className="card-value">Hardware</span>
      </div>
      <div className="specs-grid">
        <div className="spec-item spec-item-wide">
          <span>CPU</span>
          <strong>{specs.cpuModel || '--'}</strong>
        </div>
        <div className="spec-item">
          <span>Cores / Threads</span>
          <strong>
            {formatValue(specs.cpuCores)} / {formatValue(specs.cpuThreads)}
          </strong>
        </div>
        <div className="spec-item">
          <span>Frecuencia Max</span>
          <strong>{formatFrequency(specs.cpuMaxMhz)}</strong>
        </div>
        <div className="spec-item spec-item-wide">
          <span>GPU</span>
          <strong>{specs.gpuName || 'No detectada'}</strong>
        </div>
        <div className="spec-item">
          <span>VRAM</span>
          <strong>{specs.gpuVramGb ? `${specs.gpuVramGb} GB` : '--'}</strong>
        </div>
        <div className="spec-item">
          <span>RAM</span>
          <strong>
            {specs.ramTotalGb ? `${specs.ramTotalGb} GB` : '--'}
            {specs.ramType ? ` ${specs.ramType}` : ''}
          </strong>
        </div>
        <div className="spec-item">
          <span>Disco</span>
          <strong>
            {specs.diskTotalGb ? `${specs.diskTotalGb} GB` : '--'}
            {specs.diskType ? ` ${specs.diskType}` : ''}
          </strong>
        </div>
        <div className="spec-item">
          <span>Sistema Operativo</span>
          <strong>
            {specs.osName || systemInfo.os || '--'}
            {specs.osVersion ? ` ${specs.osVersion}` : ''}
          </strong>
        </div>
        <div className="spec-item">
          <span>Kernel</span>
          <strong>{specs.kernelVersion || systemInfo.kernel || '--'}</strong>
        </div>
        <div className="spec-item">
          <span>Arquitectura</span>
          <strong>{formatValue(specs.architecture)}</strong>
        </div>
        <div className="spec-item">
          <span>Docker</span>
          <strong>{specs.dockerVersion ? `v${specs.dockerVersion}` : 'No instalado'}</strong>
        </div>
        <div className="spec-item">
          <span>Hostname</span>
          <strong>{systemInfo.hostname || '--'}</strong>
        </div>
      </div>
    </section>
  )
}

export default SpecsWidget
