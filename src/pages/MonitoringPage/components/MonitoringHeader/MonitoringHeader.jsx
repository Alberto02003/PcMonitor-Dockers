import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './MonitoringHeader.css'

function MonitoringHeader({ view, onViewChange, onBack, onOpenAlerts, onOpenReports, connectionLabel }) {
  const { t } = useTranslation()

  return (
    <header className="monitoring-header">
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        {t('monitoring.backToSelection')}
      </button>
      <div className="monitoring-header-main">
        <p className="monitoring-title">{t('monitoring.title')}</p>
        <p className="monitoring-subtitle">{connectionLabel}</p>
      </div>
      <div className="monitoring-header-actions">
        <div className="view-toggle" role="tablist" aria-label={t('monitoring.changeView')}>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'system'}
            className={`view-tab ${view === 'system' ? 'is-active' : ''}`}
            onClick={() => onViewChange('system')}
          >
            {t('monitoring.system')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'dockers'}
            className={`view-tab ${view === 'dockers' ? 'is-active' : ''}`}
            onClick={() => onViewChange('dockers')}
          >
            {t('monitoring.dockers')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'terminal'}
            className={`view-tab ${view === 'terminal' ? 'is-active' : ''}`}
            onClick={() => onViewChange('terminal')}
          >
            {t('monitoring.terminal')}
          </button>
        </div>
        <button type="button" className="btn btn-primary" onClick={onOpenReports}>
          {t('monitoring.reports')}
        </button>
        <button type="button" className="btn btn-accent" onClick={onOpenAlerts}>
          {t('monitoring.alerts')}
        </button>
      </div>
    </header>
  )
}

export default MonitoringHeader
