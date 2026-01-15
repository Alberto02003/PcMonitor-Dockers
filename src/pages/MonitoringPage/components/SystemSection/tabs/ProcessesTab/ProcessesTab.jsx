import { useState } from 'react'
import { useTranslation } from '../../../../../../hooks/useTranslation.jsx'
import { getUsageColor, getProcessState } from '../../../../hooks/useAdvancedMetrics.js'
import '../../SystemSection.css'

function ProcessesTab({ processes, loading }) {
  const { t } = useTranslation()
  const [sortBy, setSortBy] = useState('cpu') // cpu, memory, pid
  const [filter, setFilter] = useState('')

  if (!processes?.length && !loading) {
    return (
      <div className="no-data">
        <div className="no-data-icon">📋</div>
        <p>{t('monitoring.noData')}</p>
      </div>
    )
  }

  // Filter and sort processes
  let filteredProcesses = processes || []
  
  if (filter) {
    const lowerFilter = filter.toLowerCase()
    filteredProcesses = filteredProcesses.filter(p => 
      p.name?.toLowerCase().includes(lowerFilter) ||
      p.username?.toLowerCase().includes(lowerFilter) ||
      p.command?.toLowerCase().includes(lowerFilter) ||
      p.pid?.toString().includes(lowerFilter)
    )
  }

  // Sort
  filteredProcesses = [...filteredProcesses].sort((a, b) => {
    switch (sortBy) {
      case 'cpu':
        return (b.cpuPercent || 0) - (a.cpuPercent || 0)
      case 'memory':
        return (b.memoryPercent || 0) - (a.memoryPercent || 0)
      case 'pid':
        return (a.pid || 0) - (b.pid || 0)
      default:
        return 0
    }
  })

  // Process state summary
  const stateSummary = {
    running: (processes || []).filter(p => p.state === 'R').length,
    sleeping: (processes || []).filter(p => p.state === 'S').length,
    zombie: (processes || []).filter(p => p.state === 'Z').length,
    other: (processes || []).filter(p => !['R', 'S', 'Z'].includes(p.state)).length,
  }

  return (
    <div className="tab-container">
      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Processes</span>
          </div>
          <div className="stat-value">
            {processes?.length || 0}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Running</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {stateSummary.running}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Sleeping</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>
            {stateSummary.sleeping}
          </div>
        </div>

        {stateSummary.zombie > 0 && (
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-label">Zombie</span>
            </div>
            <div className="stat-value" style={{ color: 'var(--status-danger)' }}>
              {stateSummary.zombie}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="process-controls">
        <input
          type="text"
          className="process-filter"
          placeholder="Filter by name, user, PID..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="sort-buttons">
          <button
            type="button"
            className={`sort-btn ${sortBy === 'cpu' ? 'is-active' : ''}`}
            onClick={() => setSortBy('cpu')}
          >
            Sort by CPU
          </button>
          <button
            type="button"
            className={`sort-btn ${sortBy === 'memory' ? 'is-active' : ''}`}
            onClick={() => setSortBy('memory')}
          >
            Sort by Memory
          </button>
          <button
            type="button"
            className={`sort-btn ${sortBy === 'pid' ? 'is-active' : ''}`}
            onClick={() => setSortBy('pid')}
          >
            Sort by PID
          </button>
        </div>
      </div>

      {/* Processes Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>PID</th>
              <th>Name</th>
              <th>User</th>
              <th>State</th>
              <th className="numeric">CPU %</th>
              <th className="numeric">MEM %</th>
              <th className="numeric">RSS</th>
              <th className="numeric">Threads</th>
            </tr>
          </thead>
          <tbody>
            {filteredProcesses.map((proc) => (
              <tr key={proc.pid}>
                <td className="mono">{proc.pid}</td>
                <td title={proc.command}>{proc.name}</td>
                <td>{proc.username}</td>
                <td>
                  <span className={`state-badge state-${proc.state?.toLowerCase()}`}>
                    {getProcessState(proc.state)}
                  </span>
                </td>
                <td className="numeric" style={{ color: getUsageColor(proc.cpuPercent || 0) }}>
                  {(proc.cpuPercent || 0).toFixed(1)}%
                </td>
                <td className="numeric" style={{ color: getUsageColor(proc.memoryPercent || 0) }}>
                  {(proc.memoryPercent || 0).toFixed(1)}%
                </td>
                <td className="numeric">{(proc.memoryRssMb || 0).toFixed(1)} MB</td>
                <td className="numeric">{proc.threads || 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProcessesTab
