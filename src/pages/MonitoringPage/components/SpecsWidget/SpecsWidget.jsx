import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './SpecsWidget.css'

function SpecsWidget({ metrics }) {
  const { t } = useTranslation()
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
        <h2>{t('specs.title')}</h2>
        <span className="card-value">{t('specs.hardware')}</span>
      </div>
      <div className="specs-grid">
        <div className="spec-item spec-item-wide">
          <span>CPU</span>
          <strong>{specs.cpuModel || '--'}</strong>
        </div>
        <div className="spec-item">
          <span>{t('specs.coresThreads')}</span>
          <strong>
            {formatValue(specs.cpuCores)} / {formatValue(specs.cpuThreads)}
          </strong>
        </div>
        <div className="spec-item">
          <span>{t('specs.maxFrequency')}</span>
          <strong>{formatFrequency(specs.cpuMaxMhz)}</strong>
        </div>
        <div className="spec-item spec-item-wide">
          <span>GPU</span>
          <strong>{specs.gpuName || t('specs.notDetected')}</strong>
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
          <span>{t('monitoring.disk')}</span>
          <strong>
            {specs.diskTotalGb ? `${specs.diskTotalGb} GB` : '--'}
            {specs.diskType ? ` ${specs.diskType}` : ''}
          </strong>
        </div>
        <div className="spec-item">
          <span>{t('specs.os')}</span>
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
          <span>{t('specs.architecture')}</span>
          <strong>{formatValue(specs.architecture)}</strong>
        </div>
        <div className="spec-item">
          <span>Docker</span>
          <strong>{specs.dockerVersion ? `v${specs.dockerVersion}` : t('specs.notInstalled')}</strong>
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
