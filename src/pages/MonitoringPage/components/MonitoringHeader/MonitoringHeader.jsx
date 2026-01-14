import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './MonitoringHeader.css'

// Sub-tabs disponibles para System
export const SYSTEM_TABS = ['overview', 'cpu', 'memory', 'disk', 'processes']

function MonitoringHeader({ 
  view, 
  onViewChange, 
  systemTab,
  onSystemTabChange,
  onBack, 
  onOpenAlerts, 
  onOpenReports, 
  connectionLabel 
}) {
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
        {/* Main navigation tabs */}
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
            aria-selected={view === 'network'}
            className={`view-tab ${view === 'network' ? 'is-active' : ''}`}
            onClick={() => onViewChange('network')}
          >
            {t('monitoring.network')}
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

      {/* Sub-tabs for System view */}
      {view === 'system' && (
        <div className="system-subtabs">
          <div className="subtabs-toggle" role="tablist">
            {SYSTEM_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={systemTab === tab}
                className={`subtab ${systemTab === tab ? 'is-active' : ''}`}
                onClick={() => onSystemTabChange(tab)}
              >
                {t(`monitoring.${tab === 'overview' ? 'system' : tab}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

export default MonitoringHeader
