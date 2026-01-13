import { useState, useCallback } from 'react'
import { isTauri } from '../../../../services/tauri.js'
import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './ReportsModal.css'

function ReportsModal({ open, connection, onClose, onGenerate, isGenerating }) {
  const { t, lang } = useTranslation()
  const [periodType, setPeriodType] = useState('last_24h')
  const [customHours, setCustomHours] = useState(48)
  const [result, setResult] = useState(null)

  const periodOptions = [
    { value: 'last_hour', label: t('reports.lastHour'), icon: '60m' },
    { value: 'last_24h', label: t('reports.last24Hours'), icon: '24h' },
    { value: 'last_7d', label: t('reports.last7Days'), icon: '7d' },
    { value: 'last_30d', label: t('reports.last30Days'), icon: '30d' },
    { value: 'custom', label: t('reports.custom'), icon: '...' },
  ]

  const calculatePeriod = useCallback(() => {
    const now = new Date()
    const end = now.toISOString().slice(0, 19).replace('T', ' ')
    
    let start
    switch (periodType) {
      case 'last_hour':
        start = new Date(now - 60 * 60 * 1000)
        break
      case 'last_24h':
        start = new Date(now - 24 * 60 * 60 * 1000)
        break
      case 'last_7d':
        start = new Date(now - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last_30d':
        start = new Date(now - 30 * 24 * 60 * 60 * 1000)
        break
      case 'custom':
        start = new Date(now - customHours * 60 * 60 * 1000)
        break
      default:
        start = new Date(now - 24 * 60 * 60 * 1000)
    }
    
    return {
      start: start.toISOString().slice(0, 19).replace('T', ' '),
      end,
    }
  }, [periodType, customHours])

  const handleGenerate = useCallback(async () => {
    if (!connection) return
    setResult(null)

    const { start, end } = calculatePeriod()
    
    // En Tauri, abrir dialogo para seleccionar ubicacion
    let outputPath = ''
    if (isTauri()) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog')
        const selected = await save({
          defaultPath: `informe_${connection.name}_${new Date().toISOString().slice(0, 10)}.pdf`,
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        })
        
        if (!selected) {
          return // Usuario cancelo
        }
        outputPath = selected
      } catch (error) {
        console.error('Error selecting file:', error)
        setResult({ success: false, error: t('reports.errorSelectingLocation') })
        return
      }
    } else {
      outputPath = `./report_${Date.now()}.pdf`
    }

    const config = {
      connection_id: connection.id,
      period_start: start,
      period_end: end,
      include_charts: true,
      include_recommendations: true,
      language: lang,
      output_path: outputPath,
    }

    const res = await onGenerate(config)
    setResult(res)
  }, [connection, calculatePeriod, onGenerate, lang, t])

  const handleClose = useCallback(() => {
    setResult(null)
    onClose()
  }, [onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-panel reports-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <span className="modal-icon">&#128196;</span>
            <h3>{t('reports.title')}</h3>
          </div>
          <button type="button" className="icon-button" onClick={handleClose} title={t('common.close')}>
            x
          </button>
        </div>

        <div className="modal-body">
          {/* Server info */}
          <div className="reports-server-info">
            <span className="server-label">{t('reports.server')}</span>
            <span className="server-name">{connection?.name || t('reports.noConnection')}</span>
            <span className="server-host">{connection?.host}:{connection?.port || 22}</span>
          </div>

          {/* Period selector */}
          <div className="reports-section">
            <span className="section-title">{t('reports.reportPeriod')}</span>
            <div className="period-grid">
              {periodOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`period-btn ${periodType === opt.value ? 'is-active' : ''}`}
                  onClick={() => setPeriodType(opt.value)}
                >
                  <span className="period-icon">{opt.icon}</span>
                  <span className="period-label">{opt.label}</span>
                </button>
              ))}
            </div>

            {periodType === 'custom' && (
              <div className="custom-hours">
                <label>{t('reports.hoursBack')}</label>
                <input
                  type="number"
                  min="1"
                  max="8760"
                  value={customHours}
                  onChange={(e) => setCustomHours(parseInt(e.target.value) || 24)}
                />
                <span className="hours-hint">
                  {customHours >= 24 ? `${Math.floor(customHours / 24)} ${t('reports.days')}` : `${customHours} ${t('reports.hours')}`}
                </span>
              </div>
            )}
          </div>

          {/* Report contents preview */}
          <div className="reports-section">
            <span className="section-title">{t('reports.reportContent')}</span>
            <div className="report-contents">
              <div className="content-item">
                <span className="content-icon">&#128202;</span>
                <span>{t('reports.systemMetrics')}</span>
              </div>
              <div className="content-item">
                <span className="content-icon">&#128230;</span>
                <span>{t('reports.dockerStatus')}</span>
              </div>
              <div className="content-item">
                <span className="content-icon">&#128276;</span>
                <span>{t('reports.alertHistory')}</span>
              </div>
              <div className="content-item">
                <span className="content-icon">&#128200;</span>
                <span>{t('reports.hourlySummary')}</span>
              </div>
            </div>
          </div>

          {/* Result message */}
          {result && (
            <div className={`report-result ${result.success ? 'is-success' : 'is-error'}`}>
              {result.success ? (
                <>
                  <span className="result-icon">&#10003;</span>
                  <div className="result-content">
                    <p className="result-title">{t('reports.reportGenerated')}</p>
                    <p className="result-path">{result.file_path}</p>
                    <p className="result-meta">
                      {(result.file_size / 1024).toFixed(1)} KB en {result.generation_time_ms}ms
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="result-icon">&#10007;</span>
                  <div className="result-content">
                    <p className="result-title">{t('reports.errorGenerating')}</p>
                    <p className="result-error">{result.error}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={handleClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-generate"
            disabled={isGenerating || !connection}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <>
                <span className="spinner"></span>
                {t('reports.generating')}
              </>
            ) : (
              <>
                <span className="btn-icon">&#128196;</span>
                {t('reports.generatePdf')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportsModal
