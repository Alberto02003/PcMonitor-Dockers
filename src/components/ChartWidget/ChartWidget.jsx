/**
 * ChartWidget Component - Visualización de métricas históricas
 * 
 * Fase 6.1 - Gráficos de Métricas Históricas
 * 
 * Features:
 * - Gráficos de línea para CPU, RAM, Network
 * - Selector de rango temporal (1h, 6h, 24h, 7d)
 * - Zoom in/out
 * - Tooltips con valores exactos
 * - Integración con useMetricsHistory
 */

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import './ChartWidget.css'

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

/**
 * Formatea timestamp a hora legible
 * @param {number} timestamp 
 * @returns {string}
 */
function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Formatea timestamp a fecha y hora
 * @param {number} timestamp 
 * @returns {string}
 */
function formatDateTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleString('es-ES', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * ChartWidget - Componente de gráfico
 * @param {Object} props
 * @param {Array} props.data - Datos de la serie temporal [{timestamp, value}]
 * @param {string} props.title - Título del gráfico
 * @param {string} props.label - Etiqueta de la serie
 * @param {string} props.color - Color de la línea (hex)
 * @param {string} props.unit - Unidad de medida (%, MB, MB/s, etc.)
 * @param {number} props.maxValue - Valor máximo del eje Y
 * @param {Object} props.stats - Estadísticas {min, max, avg}
 */
export function ChartWidget({
  data = [],
  title = 'Métrica',
  label = 'Valor',
  color = '#3b82f6',
  unit = '',
  maxValue = 100,
  stats = null
}) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: []
      }
    }

    return {
      labels: data.map(point => formatTime(point.timestamp)),
      datasets: [
        {
          label: label,
          data: data.map(point => point.value),
          borderColor: color,
          backgroundColor: `${color}20`, // 20 = 12.5% opacity
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: data.length > 100 ? 0 : 2,
          pointHoverRadius: 6,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }
      ]
    }
  }, [data, label, color])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: color,
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex
            return formatDateTime(data[index]?.timestamp)
          },
          label: (context) => {
            const value = context.parsed.y
            return `${label}: ${value.toFixed(2)}${unit}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        }
      },
      y: {
        min: 0,
        max: maxValue,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          callback: (value) => `${value}${unit}`
        }
      }
    }
  }), [data, label, unit, maxValue, color])

  return (
    <div className="chart-widget">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {stats && (
          <div className="chart-stats">
            <span className="stat">
              <span className="stat-label">Min:</span>
              <span className="stat-value">{stats.min}{unit}</span>
            </span>
            <span className="stat">
              <span className="stat-label">Avg:</span>
              <span className="stat-value">{stats.avg}{unit}</span>
            </span>
            <span className="stat">
              <span className="stat-label">Max:</span>
              <span className="stat-value">{stats.max}{unit}</span>
            </span>
          </div>
        )}
      </div>
      <div className="chart-container">
        {data.length === 0 ? (
          <div className="chart-empty">
            <p>No hay datos disponibles</p>
            <small>Los datos aparecerán cuando se recolecten métricas</small>
          </div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  )
}

export default ChartWidget
