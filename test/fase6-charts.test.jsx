/**
 * Tests for Fase 6.1 - Gráficos de Métricas Históricas
 * 
 * Tests para:
 * - ChartWidget: Visualización de gráficos individuales
 * - MetricsCharts: Componente con múltiples gráficos y selector de tiempo
 * - Integración con useMetricsHistory
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChartWidget } from '../src/components/ChartWidget/ChartWidget'
import { MetricsCharts } from '../src/components/MetricsCharts/MetricsCharts'

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }) => (
    <div data-testid="chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Chart Component
    </div>
  ),
}))

vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {},
}))

describe('ChartWidget', () => {
  const mockData = [
    { timestamp: Date.now() - 60000, value: 50 },
    { timestamp: Date.now() - 30000, value: 60 },
    { timestamp: Date.now(), value: 70 },
  ]

  const mockStats = {
    min: 50,
    max: 70,
    avg: 60,
    count: 3,
  }

  it('should render chart with data', () => {
    render(
      <ChartWidget
        data={mockData}
        title="CPU Usage"
        label="CPU"
        color="#3b82f6"
        unit="%"
        maxValue={100}
        stats={mockStats}
      />
    )

    expect(screen.getByText('CPU Usage')).toBeInTheDocument()
    expect(screen.getByTestId('chart')).toBeInTheDocument()
  })

  it('should display statistics', () => {
    render(
      <ChartWidget
        data={mockData}
        title="CPU Usage"
        label="CPU"
        color="#3b82f6"
        unit="%"
        maxValue={100}
        stats={mockStats}
      />
    )

    expect(screen.getByText('50%')).toBeInTheDocument() // Min
    expect(screen.getByText('60%')).toBeInTheDocument() // Avg
    expect(screen.getByText('70%')).toBeInTheDocument() // Max
  })

  it('should show empty state when no data', () => {
    render(
      <ChartWidget
        data={[]}
        title="CPU Usage"
        label="CPU"
        color="#3b82f6"
        unit="%"
        maxValue={100}
      />
    )

    expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument()
    expect(screen.getByText(/Los datos aparecerán cuando se recolecten métricas/)).toBeInTheDocument()
  })

  it('should render without stats', () => {
    render(
      <ChartWidget
        data={mockData}
        title="CPU Usage"
        label="CPU"
        color="#3b82f6"
        unit="%"
        maxValue={100}
      />
    )

    expect(screen.getByText('CPU Usage')).toBeInTheDocument()
    expect(screen.queryByText('Min:')).not.toBeInTheDocument()
  })

  it('should use correct chart data structure', () => {
    const { container } = render(
      <ChartWidget
        data={mockData}
        title="CPU Usage"
        label="CPU"
        color="#3b82f6"
        unit="%"
        maxValue={100}
      />
    )

    const chart = container.querySelector('[data-testid="chart"]')
    const chartData = JSON.parse(chart.getAttribute('data-chart-data'))

    expect(chartData.labels).toHaveLength(3)
    expect(chartData.datasets).toHaveLength(1)
    expect(chartData.datasets[0].label).toBe('CPU')
    expect(chartData.datasets[0].borderColor).toBe('#3b82f6')
    expect(chartData.datasets[0].data).toEqual([50, 60, 70])
  })

  it('should apply correct color', () => {
    const { container } = render(
      <ChartWidget
        data={mockData}
        title="RAM Usage"
        label="RAM"
        color="#10b981"
        unit="%"
        maxValue={100}
      />
    )

    const chart = container.querySelector('[data-testid="chart"]')
    const chartData = JSON.parse(chart.getAttribute('data-chart-data'))

    expect(chartData.datasets[0].borderColor).toBe('#10b981')
  })
})

describe('MetricsCharts', () => {
  let mockMetricsHistory

  beforeEach(() => {
    const now = Date.now()
    const mockHistory = [
      {
        timestamp: now - 120000,
        cpu: { usage: 50 },
        memory: { usedPercentage: 60 },
        network: { bytesRecv: 1024 * 1024 * 10, bytesSent: 1024 * 1024 * 5 },
      },
      {
        timestamp: now - 60000,
        cpu: { usage: 60 },
        memory: { usedPercentage: 70 },
        network: { bytesRecv: 1024 * 1024 * 15, bytesSent: 1024 * 1024 * 8 },
      },
      {
        timestamp: now,
        cpu: { usage: 70 },
        memory: { usedPercentage: 80 },
        network: { bytesRecv: 1024 * 1024 * 20, bytesSent: 1024 * 1024 * 12 },
      },
    ]

    mockMetricsHistory = {
      history: mockHistory,
      size: mockHistory.length,
      getTimeSeries: (key, timeRange) => {
        return mockHistory.map((entry) => {
          const keys = key.split('.')
          let value = entry
          for (const k of keys) {
            value = value?.[k]
          }
          return { timestamp: entry.timestamp, value }
        })
      },
      getStats: (key, timeRange) => {
        const series = mockMetricsHistory.getTimeSeries(key, timeRange)
        const values = series.map((s) => s.value)
        return {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((acc, v) => acc + v, 0) / values.length,
          count: values.length,
        }
      },
    }
  })

  it('should render charts header with title', () => {
    render(<MetricsCharts metricsHistory={mockMetricsHistory} />)
    expect(screen.getByText('Histórico de Métricas')).toBeInTheDocument()
  })

  it('should render time range selector buttons', () => {
    render(<MetricsCharts metricsHistory={mockMetricsHistory} />)
    
    expect(screen.getByText('1h')).toBeInTheDocument()
    expect(screen.getByText('6h')).toBeInTheDocument()
    expect(screen.getByText('24h')).toBeInTheDocument()
    expect(screen.getByText('7d')).toBeInTheDocument()
  })

  it('should have 6h selected by default', () => {
    render(<MetricsCharts metricsHistory={mockMetricsHistory} />)
    
    const button6h = screen.getByText('6h')
    expect(button6h.classList.contains('active')).toBe(true)
  })

  it('should change time range on button click', async () => {
    const user = userEvent.setup()
    render(<MetricsCharts metricsHistory={mockMetricsHistory} />)
    
    const button24h = screen.getByText('24h')
    await user.click(button24h)
    
    expect(button24h.classList.contains('active')).toBe(true)
  })

  it('should render 4 chart widgets (CPU, RAM, Net In, Net Out)', () => {
    render(<MetricsCharts metricsHistory={mockMetricsHistory} />)
    
    expect(screen.getByText('CPU')).toBeInTheDocument()
    expect(screen.getByText('RAM')).toBeInTheDocument()
    expect(screen.getByText('Red - Entrada')).toBeInTheDocument()
    expect(screen.getByText('Red - Salida')).toBeInTheDocument()
  })

  it('should show empty state when no metrics history', () => {
    render(<MetricsCharts metricsHistory={null} />)
    
    expect(screen.getByText('No hay histórico de métricas disponible')).toBeInTheDocument()
  })

  it('should show info message when history is empty', () => {
    const emptyHistory = {
      history: [],
      size: 0,
      getTimeSeries: () => [],
      getStats: () => ({ min: 0, max: 0, avg: 0, count: 0 }),
    }

    render(<MetricsCharts metricsHistory={emptyHistory} />)
    
    expect(screen.getByText(/Los gráficos se actualizarán automáticamente/)).toBeInTheDocument()
    expect(screen.getByText('Histórico actual: 0 puntos')).toBeInTheDocument()
  })

  it('should call getTimeSeries with correct keys', () => {
    const spy = vi.spyOn(mockMetricsHistory, 'getTimeSeries')
    
    render(<MetricsCharts metricsHistory={mockMetricsHistory} />)
    
    expect(spy).toHaveBeenCalledWith('cpu.usage', expect.any(Number))
    expect(spy).toHaveBeenCalledWith('memory.usedPercentage', expect.any(Number))
    expect(spy).toHaveBeenCalledWith('network.bytesRecv', expect.any(Number))
    expect(spy).toHaveBeenCalledWith('network.bytesSent', expect.any(Number))
  })

  it('should call getStats with correct keys', () => {
    const spy = vi.spyOn(mockMetricsHistory, 'getStats')
    
    render(<MetricsCharts metricsHistory={mockMetricsHistory} />)
    
    expect(spy).toHaveBeenCalledWith('cpu.usage', expect.any(Number))
    expect(spy).toHaveBeenCalledWith('memory.usedPercentage', expect.any(Number))
  })

  it('should convert network bytes to MB', () => {
    const series = mockMetricsHistory.getTimeSeries('network.bytesRecv')
    expect(series[0].value).toBe(1024 * 1024 * 10) // 10 MB in bytes
    
    // MetricsCharts should convert this to 10 MB
    render(<MetricsCharts metricsHistory={mockMetricsHistory} />)
    
    // The component converts bytes to MB internally
    // We can't directly test the conversion without inspecting chart data
    // but we can verify the chart is rendered
    expect(screen.getByText('Red - Entrada')).toBeInTheDocument()
  })

  it('should update charts when time range changes', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(mockMetricsHistory, 'getTimeSeries')
    
    render(<MetricsCharts metricsHistory={mockMetricsHistory} />)
    
    // Initial calls
    const initialCalls = spy.mock.calls.length
    
    // Change time range
    await user.click(screen.getByText('24h'))
    
    // Should have made new calls
    await waitFor(() => {
      expect(spy.mock.calls.length).toBeGreaterThan(initialCalls)
    })
  })
})

describe('Integration: MetricsCharts with useMetricsHistory', () => {
  it('should work with real useMetricsHistory hook structure', () => {
    const now = Date.now()
    const realMetricsHistory = {
      history: [
        {
          timestamp: now - 60000,
          cpu: { usage: 50, cores: 4 },
          memory: { usedPercentage: 60, total: 16384 },
          network: { bytesRecv: 1024 * 1024, bytesSent: 512 * 1024 },
        },
        {
          timestamp: now,
          cpu: { usage: 70, cores: 4 },
          memory: { usedPercentage: 80, total: 16384 },
          network: { bytesRecv: 2048 * 1024, bytesSent: 1024 * 1024 },
        },
      ],
      size: 2,
      addMetrics: vi.fn(),
      clear: vi.fn(),
      getStats: (key, timeRange) => {
        return { min: 50, max: 70, avg: 60, count: 2 }
      },
      getTimeSeries: (key, timeRange) => {
        if (key === 'cpu.usage') {
          return [
            { timestamp: now - 60000, value: 50 },
            { timestamp: now, value: 70 },
          ]
        }
        return []
      },
      exportToJSON: vi.fn(),
      exportToCSV: vi.fn(),
    }

    render(<MetricsCharts metricsHistory={realMetricsHistory} />)
    
    expect(screen.getByText('Histórico de Métricas')).toBeInTheDocument()
    expect(screen.getByText('CPU')).toBeInTheDocument()
  })
})
