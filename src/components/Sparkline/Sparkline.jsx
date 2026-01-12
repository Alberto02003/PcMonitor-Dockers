/**
 * Sparkline - Mini grafico de lineas para mostrar tendencias
 */

import { useMemo } from 'react'
import './Sparkline.css'

/**
 * @param {Object} props
 * @param {number[]} props.data - Array de valores numericos
 * @param {number} props.width - Ancho del grafico
 * @param {number} props.height - Alto del grafico
 * @param {string} props.color - Color de la linea
 * @param {boolean} props.fill - Mostrar area rellena
 * @param {boolean} props.animated - Animar la linea
 * @param {boolean} props.showDot - Mostrar punto en el ultimo valor
 * @param {number} props.strokeWidth - Grosor de la linea
 */
function Sparkline({
  data = [],
  width = 100,
  height = 32,
  color = 'var(--color-primary)',
  fill = true,
  animated = true,
  showDot = true,
  strokeWidth = 2,
}) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return ''

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const padding = strokeWidth
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth
      const y = padding + chartHeight - ((value - min) / range) * chartHeight
      return { x, y }
    })

    // Crear path de linea
    const linePath = points
      .map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`
        
        // Curva suave usando bezier
        const prev = points[index - 1]
        const cpX = (prev.x + point.x) / 2
        return `C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`
      })
      .join(' ')

    return linePath
  }, [data, width, height, strokeWidth])

  const fillPath = useMemo(() => {
    if (!path || !fill) return ''
    
    const padding = strokeWidth
    const lastX = width - padding
    const firstX = padding
    const bottom = height - padding

    return `${path} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`
  }, [path, fill, width, height, strokeWidth])

  const lastPoint = useMemo(() => {
    if (!data || data.length < 2) return null

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const padding = strokeWidth
    const chartHeight = height - padding * 2
    const lastValue = data[data.length - 1]

    return {
      x: width - padding,
      y: padding + chartHeight - ((lastValue - min) / range) * chartHeight,
    }
  }, [data, width, height, strokeWidth])

  if (!data || data.length < 2) {
    return (
      <div className="sparkline sparkline--empty" style={{ width, height }}>
        <span>--</span>
      </div>
    )
  }

  return (
    <svg
      className={`sparkline ${animated ? 'sparkline--animated' : ''}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Gradient definition */}
      <defs>
        <linearGradient id={`sparkline-gradient-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Fill area */}
      {fill && (
        <path
          className="sparkline__fill"
          d={fillPath}
          fill={`url(#sparkline-gradient-${color.replace(/[^a-z0-9]/gi, '')})`}
        />
      )}

      {/* Line */}
      <path
        className="sparkline__line"
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Last point dot */}
      {showDot && lastPoint && (
        <circle
          className="sparkline__dot"
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={strokeWidth + 1}
          fill={color}
        />
      )}
    </svg>
  )
}

/**
 * Sparkline con barras verticales
 */
function SparklineBar({
  data = [],
  width = 100,
  height = 32,
  color = 'var(--color-primary)',
  gap = 2,
  animated = true,
}) {
  const bars = useMemo(() => {
    if (!data || data.length === 0) return []

    const max = Math.max(...data)
    const barWidth = (width - gap * (data.length - 1)) / data.length

    return data.map((value, index) => ({
      x: index * (barWidth + gap),
      height: (value / max) * height,
      width: barWidth,
    }))
  }, [data, width, height, gap])

  if (!data || data.length === 0) {
    return (
      <div className="sparkline sparkline--empty" style={{ width, height }}>
        <span>--</span>
      </div>
    )
  }

  return (
    <svg
      className={`sparkline sparkline--bar ${animated ? 'sparkline--animated' : ''}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {bars.map((bar, index) => (
        <rect
          key={index}
          className="sparkline__bar"
          x={bar.x}
          y={height - bar.height}
          width={bar.width}
          height={bar.height}
          fill={color}
          rx={1}
          style={{ animationDelay: `${index * 30}ms` }}
        />
      ))}
    </svg>
  )
}

export default Sparkline
export { SparklineBar }
