/**
 * MetricsCharts Component - Gráficos de métricas con selector de tiempo
 * 
 * Fase 6.1 - Gráficos de Métricas Históricas
 * 
 * Features:
 * - Múltiples gráficos (CPU, RAM, Network)
 * - Selector de rango temporal
 * - Estadísticas en tiempo real
 * - Integración con useMetricsHistory
 */

import { useState, useMemo } from 'react'
import ChartWidget from '../ChartWidget/ChartWidget'
import './MetricsCharts.css'

// Rangos de tiempo disponibles
const TIME_RANGES = [
  { label: '1h', value: 60 * 60 * 1000, description: '1 hora' },
  { label: '6h', value: 6 * 60 * 60 * 1000, description: '6 horas' },
  { label: '24h', value: 24 * 60 * 60 * 1000, description: '24 horas' },
  { label: '7d', value: 7 * 24 * 60 * 60 * 1000, description: '7 días' },
]

/**
 * MetricsCharts - Componente de gráficos de métricas
 * @param {Object} props
 * @param {Object} props.metricsHistory - Hook useMetricsHistory
 */
export function MetricsCharts({ metricsHistory }) {
  const [selectedRange, setSelectedRange] = useState(TIME_RANGES[1].value) // Default: 6h

  // Obtener datos de series temporales
  const cpuData = useMemo(() => {
    if (!metricsHistory) return []
    return metricsHistory.getTimeSeries('cpu.usage', selectedRange)
  }, [metricsHistory, selectedRange])

  const ramData = useMemo(() => {
    if (!metricsHistory) return []
    return metricsHistory.getTimeSeries('memory.usedPercentage', selectedRange)
  }, [metricsHistory, selectedRange])

  const networkInData = useMemo(() => {
    if (!metricsHistory) return []
    return metricsHistory.getTimeSeries('network.bytesRecv', selectedRange)
      .map(point => ({
        timestamp: point.timestamp,
        value: point.value / (1024 * 1024) // Convertir a MB/s
      }))
  }, [metricsHistory, selectedRange])

  const networkOutData = useMemo(() => {
    if (!metricsHistory) return []
    return metricsHistory.getTimeSeries('network.bytesSent', selectedRange)
      .map(point => ({
        timestamp: point.timestamp,
        value: point.value / (1024 * 1024) // Convertir a MB/s
      }))
  }, [metricsHistory, selectedRange])

  // Obtener estadísticas
  const cpuStats = useMemo(() => {
    if (!metricsHistory) return null
    return metricsHistory.getStats('cpu.usage', selectedRange)
  }, [metricsHistory, selectedRange])

  const ramStats = useMemo(() => {
    if (!metricsHistory) return null
    return metricsHistory.getStats('memory.usedPercentage', selectedRange)
  }, [metricsHistory, selectedRange])

  const networkInStats = useMemo(() => {
    if (!metricsHistory || networkInData.length === 0) return null
    const values = networkInData.map(p => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length
    return {
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      avg: parseFloat(avg.toFixed(2)),
      count: values.length
    }
  }, [networkInData])

  const networkOutStats = useMemo(() => {
    if (!metricsHistory || networkOutData.length === 0) return null
    const values = networkOutData.map(p => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length
    return {
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      avg: parseFloat(avg.toFixed(2)),
      count: values.length
    }
  }, [networkOutData])

  // Calcular valor máximo para network (auto-scale)
  const networkMaxValue = useMemo(() => {
    const allValues = [...networkInData, ...networkOutData].map(p => p.value)
    if (allValues.length === 0) return 100
    const max = Math.max(...allValues)
    // Redondear al siguiente múltiplo de 10
    return Math.ceil(max / 10) * 10 || 100
  }, [networkInData, networkOutData])

  if (!metricsHistory) {
    return (
      <div className="metrics-charts">
        <div className="charts-empty">
          <p>No hay histórico de métricas disponible</p>
        </div>
      </div>
    )
  }

  return (
    <div className="metrics-charts">
      <div className="charts-header">
        <h2 className="charts-title">Histórico de Métricas</h2>
        <div className="time-range-selector">
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              className={`time-range-btn ${selectedRange === range.value ? 'active' : ''}`}
              onClick={() => setSelectedRange(range.value)}
              title={range.description}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="charts-grid">
        <ChartWidget
          data={cpuData}
          title="CPU"
          label="CPU"
          color="#3b82f6"
          unit="%"
          maxValue={100}
          stats={cpuStats}
        />

        <ChartWidget
          data={ramData}
          title="RAM"
          label="RAM"
          color="#10b981"
          unit="%"
          maxValue={100}
          stats={ramStats}
        />

        <ChartWidget
          data={networkInData}
          title="Red - Entrada"
          label="Entrada"
          color="#8b5cf6"
          unit=" MB/s"
          maxValue={networkMaxValue}
          stats={networkInStats}
        />

        <ChartWidget
          data={networkOutData}
          title="Red - Salida"
          label="Salida"
          color="#f59e0b"
          unit=" MB/s"
          maxValue={networkMaxValue}
          stats={networkOutStats}
        />
      </div>

      {metricsHistory.size === 0 && (
        <div className="charts-info">
          <p>Los gráficos se actualizarán automáticamente cuando se recolecten métricas</p>
          <small>Histórico actual: {metricsHistory.size} puntos</small>
        </div>
      )}
    </div>
  )
}

export default MetricsCharts
