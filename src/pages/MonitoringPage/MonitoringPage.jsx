import { useState } from 'react'
import './MonitoringPage.css'

function MonitoringPage({ connection, onBack }) {
  const [view, setView] = useState('system')
  const connectionLabel = connection
    ? `${connection.name} - ${connection.username}@${connection.host}:${connection.port || 22}`
    : 'Sin conexion activa'

  return (
    <div className="monitoring-page">
      <header className="monitoring-header">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Volver
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
              onClick={() => setView('system')}
            >
              Sistema
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'dockers'}
              className={`view-tab ${view === 'dockers' ? 'is-active' : ''}`}
              onClick={() => setView('dockers')}
            >
              Dockers
            </button>
          </div>
          <button type="button" className="btn btn-outline">
            Reiniciar
          </button>
          <button type="button" className="btn btn-accent">
            Refrescar
          </button>
        </div>
      </header>

      {view === 'system' ? (
        <>
          <section className="monitoring-hero">
            <div className="hero-main">
              <div className="hero-card">
                <span className="hero-label">Estado</span>
                <p className="hero-value">En linea</p>
                <span className="hero-subtle">Ultima actualizacion: ahora</span>
              </div>
              <div className="hero-card">
                <span className="hero-label">Tiempo activo</span>
                <p className="hero-value">3d 04h</p>
                <span className="hero-subtle">Desde ultimo reinicio</span>
              </div>
            </div>
            <div className="hero-side">
              <div className="hero-card hero-card--accent">
                <span className="hero-label">Carga promedio</span>
                <p className="hero-value">0.62</p>
                <span className="hero-subtle">1m - 5m - 15m</span>
              </div>
              <div className="hero-card">
                <span className="hero-label">IP publica</span>
                <p className="hero-value">192.168.0.12</p>
                <span className="hero-subtle">Latencia: 12ms</span>
              </div>
            </div>
          </section>

          <div className="monitoring-grid">
            <section className="monitoring-card">
              <div className="card-header">
                <h2>CPU</h2>
                <span className="card-value">42%</span>
              </div>
              <div className="sparkline" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <p className="card-footnote">4 cores - 2.8 GHz</p>
            </section>

            <section className="monitoring-card">
              <div className="card-header">
                <h2>Memoria</h2>
                <span className="card-value">6.2 / 16 GB</span>
              </div>
              <div className="progress">
                <span style={{ width: '39%' }} />
              </div>
              <p className="card-footnote">Swap 1.2 GB</p>
            </section>

            <section className="monitoring-card">
              <div className="card-header">
                <h2>Disco</h2>
                <span className="card-value">120 / 512 GB</span>
              </div>
              <div className="progress">
                <span style={{ width: '23%' }} />
              </div>
              <p className="card-footnote">IO: 120 MB/s</p>
            </section>

            <section className="monitoring-card">
              <div className="card-header">
                <h2>Red</h2>
                <span className="card-value">12 Mb/s</span>
              </div>
              <div className="sparkline" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <p className="card-footnote">Entrada 8 Mb/s - Salida 4 Mb/s</p>
            </section>
          </div>
        </>
      ) : (
        <section className="monitoring-docker">
          <div className="card-header">
            <h2>Dockers</h2>
            <span className="card-value">4 activos</span>
          </div>
          <div className="docker-list">
            {['web-api', 'db-main', 'cache', 'worker'].map((name) => (
              <div key={name} className="docker-item">
                <div>
                  <p className="docker-name">{name}</p>
                  <p className="docker-meta">Up 3h - 0.2 CPU</p>
                </div>
                <button type="button" className="btn btn-outline">
                  Reiniciar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default MonitoringPage
