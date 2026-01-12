import './MonitoringHeader.css'

function MonitoringHeader({ view, onViewChange, onBack, onOpenAlerts, connectionLabel }) {
  return (
    <header className="monitoring-header">
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        Volver a seleccion
      </button>
      <div className="monitoring-header-main">
        <p className="monitoring-title">Monitorizacion</p>
        <p className="monitoring-subtitle">{connectionLabel}</p>
      </div>
      <div className="monitoring-header-actions">
        <div className="view-toggle" role="tablist" aria-label="Cambiar vista">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'system'}
            className={`view-tab ${view === 'system' ? 'is-active' : ''}`}
            onClick={() => onViewChange('system')}
          >
            Sistema
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'dockers'}
            className={`view-tab ${view === 'dockers' ? 'is-active' : ''}`}
            onClick={() => onViewChange('dockers')}
          >
            Dockers
          </button>
        </div>
        <button type="button" className="btn btn-outline">
          Reiniciar
        </button>
        <button type="button" className="btn btn-accent" onClick={onOpenAlerts}>
          Alertas
        </button>
      </div>
    </header>
  )
}

export default MonitoringHeader
