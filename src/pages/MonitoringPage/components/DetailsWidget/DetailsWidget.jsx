import { Fragment, useMemo } from 'react'
import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './DetailsWidget.css'

function DetailsWidget({ metrics, lastUpdate }) {
  const { t } = useTranslation()
  const processes = metrics?.topProcesses || []
  const disks = metrics?.disks || []
  const networks = metrics?.network || []

  const formatNumber = (value, decimals = 0) => {
    if (value === null || value === undefined) return '--'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '--'
    return num.toFixed(decimals)
  }

  const lastUpdateLabel = useMemo(() => {
    if (!lastUpdate) return '--'
    const now = new Date()
    const seconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m`
  }, [lastUpdate])

  return (
    <section className="monitoring-card system-details">
      <div className="card-header">
        <h2>{t('details.title')}</h2>
        <span className="card-value">{t('details.updated')} {lastUpdateLabel}</span>
      </div>
      <div className="system-columns">
        <div className="mini-table">
          <div>{t('details.processes')}</div>
          <div>CPU</div>
          <div>RAM</div>
          {processes.length > 0 ? (
            processes.slice(0, 3).map((proc, index) => (
              <Fragment key={index}>
                <div>{proc.name || '--'}</div>
                <div>{formatNumber(proc.cpuPercent)}%</div>
                <div>{formatNumber(proc.memoryMb)}MB</div>
              </Fragment>
            ))
          ) : (
            <Fragment>
              <div>--</div>
              <div>--</div>
              <div>--</div>
            </Fragment>
          )}
        </div>
        <div className="system-services">
          <div>
            <p>{t('details.hostname')}</p>
            <small>{metrics?.systemInfo?.hostname || '--'}</small>
          </div>
          <div>
            <p>{t('details.mountedDisks')}</p>
            <small>{disks.length > 0 ? disks.map(d => d.mountPoint).join(', ') : '--'}</small>
          </div>
          <div>
            <p>{t('details.networkInterfaces')}</p>
            <small>{networks.length > 0 ? networks.map(n => n.interface).join(', ') : '--'}</small>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DetailsWidget
