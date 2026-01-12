import HeroWidget from '../HeroWidget/HeroWidget.jsx'
import CoreGridWidget from '../CoreGridWidget/CoreGridWidget.jsx'
import ExtendedGridWidget from '../ExtendedGridWidget/ExtendedGridWidget.jsx'
import DetailsWidget from '../DetailsWidget/DetailsWidget.jsx'
import SpecsWidget from '../SpecsWidget/SpecsWidget.jsx'
import './SystemWidgets.css'

function SystemWidgets({ 
  widgetOrder, 
  draggingId, 
  dragOverId, 
  onDragStart, 
  onDragEnter,
  metrics,
  metricsLoading,
  metricsError,
  lastUpdate 
}) {
  function renderWidget(id) {
    switch (id) {
      case 'hero':
        return <HeroWidget metrics={metrics} lastUpdate={lastUpdate} />
      case 'core-grid':
        return <CoreGridWidget metrics={metrics} />
      case 'extended-grid':
        return <ExtendedGridWidget metrics={metrics} />
      case 'details':
        return <DetailsWidget metrics={metrics} lastUpdate={lastUpdate} />
      case 'specs':
        return <SpecsWidget metrics={metrics} />
      default:
        return null
    }
  }

  if (metricsError) {
    return (
      <div className="widgets">
        <div className="widget-card widget-error">
          <p>Error al obtener metricas: {metricsError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="widgets">
      {widgetOrder.map((id) => (
        <div
          key={id}
          className={`widget-card ${draggingId === id ? 'is-dragging' : ''} ${dragOverId === id ? 'is-over' : ''} ${metricsLoading && !metrics ? 'is-loading' : ''}`}
          onPointerEnter={() => onDragEnter(id)}
        >
          <div className="widget-handle" onPointerDown={() => onDragStart(id)} title="Arrastrar">
            ::
          </div>
          {renderWidget(id)}
        </div>
      ))}
    </div>
  )
}

export default SystemWidgets
