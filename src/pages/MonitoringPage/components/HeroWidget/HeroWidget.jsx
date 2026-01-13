import { LastUpdate, AnimatedValue } from '../../../../components'
import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './HeroWidget.css'

function HeroWidget({ metrics, lastUpdate }) {
  const { t } = useTranslation()
  const systemInfo = metrics?.systemInfo || {}
  const cpu = metrics?.cpu || {}
  
  const formatUptime = (uptime) => {
    if (!uptime) return '--'
    return uptime.replace('up ', '')
  }

  // Determinar estado y color
  const isOnline = !!metrics
  const statusClass = isOnline ? 'hero-status--online' : 'hero-status--loading'

  return (
    <section className="monitoring-hero">
      <div className="hero-main">
        <div className="hero-card">
          <span className="hero-label">{t('hero.status')}</span>
          <p className={`hero-value ${statusClass}`}>
            {isOnline && <span className="hero-status-dot" />}
            {metrics ? t('hero.online') : t('hero.loading')}
          </p>
          <span className="hero-subtle">
            {t('hero.lastUpdate')} <LastUpdate timestamp={lastUpdate} />
          </span>
        </div>
        <div className="hero-card">
          <span className="hero-label">{t('hero.uptime')}</span>
          <p className="hero-value">{formatUptime(systemInfo.uptime)}</p>
          <span className="hero-subtle">{t('hero.sinceRestart')}</span>
        </div>
      </div>
      <div className="hero-side">
        <div className="hero-card hero-card--accent">
          <span className="hero-label">{t('hero.loadAverage')}</span>
          <p className="hero-value">
            <AnimatedValue 
              value={cpu.loadAvg1m || 0} 
              decimals={2}
              colorChange={true}
            />
          </p>
          <span className="hero-subtle hero-load-avg">
            <span>1m: <AnimatedValue value={cpu.loadAvg1m || 0} decimals={2} /></span>
            <span>5m: <AnimatedValue value={cpu.loadAvg5m || 0} decimals={2} /></span>
            <span>15m: <AnimatedValue value={cpu.loadAvg15m || 0} decimals={2} /></span>
          </span>
        </div>
        <div className="hero-card">
          <span className="hero-label">{t('hero.privateIp')}</span>
          <p className="hero-value hero-value--mono">{systemInfo.privateIp || '--'}</p>
          <span className="hero-subtle">{t('hero.publicIp')} {systemInfo.publicIp || 'N/A'}</span>
        </div>
      </div>
    </section>
  )
}

export default HeroWidget
