import { useMemo } from 'react'
import './HeroWidget.css'

function HeroWidget({ metrics, lastUpdate }) {
  const systemInfo = metrics?.systemInfo || {}
  const cpu = metrics?.cpu || {}
  
  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return '--'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '--'
    return num.toFixed(decimals)
  }
  
  const formatUptime = (uptime) => {
    if (!uptime) return '--'
    return uptime.replace('up ', '')
  }
  
  const lastUpdateLabel = useMemo(() => {
    if (!lastUpdate) return '--'
    const now = new Date()
    const seconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000)
    if (seconds < 5) return 'ahora'
    if (seconds < 60) return `hace ${seconds}s`
    return `hace ${Math.floor(seconds / 60)}m`
  }, [lastUpdate])

  return (
    <section className="monitoring-hero">
      <div className="hero-main">
        <div className="hero-card">
          <span className="hero-label">Estado</span>
          <p className="hero-value">{metrics ? 'En linea' : 'Cargando...'}</p>
          <span className="hero-subtle">Ultima actualizacion: {lastUpdateLabel}</span>
        </div>
        <div className="hero-card">
          <span className="hero-label">Tiempo activo</span>
          <p className="hero-value">{formatUptime(systemInfo.uptime)}</p>
          <span className="hero-subtle">Desde ultimo reinicio</span>
        </div>
      </div>
      <div className="hero-side">
        <div className="hero-card hero-card--accent">
          <span className="hero-label">Carga promedio</span>
          <p className="hero-value">{formatNumber(cpu.loadAvg1m)}</p>
          <span className="hero-subtle">
            {formatNumber(cpu.loadAvg1m)} - {formatNumber(cpu.loadAvg5m)} - {formatNumber(cpu.loadAvg15m)}
          </span>
        </div>
        <div className="hero-card">
          <span className="hero-label">IP privada</span>
          <p className="hero-value">{systemInfo.privateIp || '--'}</p>
          <span className="hero-subtle">Publica: {systemInfo.publicIp || 'N/A'}</span>
        </div>
      </div>
    </section>
  )
}

export default HeroWidget
