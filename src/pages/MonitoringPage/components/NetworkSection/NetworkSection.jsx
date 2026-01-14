import { useState, useMemo } from 'react'
import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import { formatBytes, formatSpeed, getUsageColor } from '../../hooks/useAdvancedMetrics.js'
import './NetworkSection.css'

function NetworkSection({ metrics, loading }) {
  const { t } = useTranslation()
  const [selectedInterface, setSelectedInterface] = useState(null)

  // Extract network data from metrics
  const networkInterfaces = useMemo(() => {
    return metrics?.network || []
  }, [metrics?.network])

  const tcpStats = useMemo(() => {
    return metrics?.tcp || {
      established: 0,
      time_wait: 0,
      close_wait: 0,
      listen: 0,
      syn_sent: 0,
      syn_recv: 0,
      fin_wait1: 0,
      fin_wait2: 0,
      last_ack: 0,
      closing: 0,
    }
  }, [metrics?.tcp])

  const listeningPorts = useMemo(() => {
    return metrics?.listening_ports || []
  }, [metrics?.listening_ports])

  // Auto-select first non-loopback interface
  const activeInterface = useMemo(() => {
    if (selectedInterface) {
      return networkInterfaces.find(iface => iface.interface === selectedInterface)
    }
    // Find first non-loopback interface with traffic
    const nonLoopback = networkInterfaces.find(
      iface => iface.interface !== 'lo' && (iface.rx_bytes > 0 || iface.tx_bytes > 0)
    )
    return nonLoopback || networkInterfaces[0]
  }, [networkInterfaces, selectedInterface])

  // Calculate total connections
  const totalConnections = useMemo(() => {
    return Object.values(tcpStats).reduce((sum, val) => sum + (val || 0), 0)
  }, [tcpStats])

  if (loading && !metrics) {
    return (
      <div className="network-section-loading">
        <div className="loading-spinner" />
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="network-section">
      {/* Interface Selector */}
      <div className="network-interface-selector">
        <label>{t('networkSection.selectInterface')}</label>
        <select
          value={activeInterface?.interface || ''}
          onChange={(e) => setSelectedInterface(e.target.value)}
        >
          {networkInterfaces.map(iface => (
            <option key={iface.interface} value={iface.interface}>
              {iface.interface} {iface.interface === 'lo' ? '(loopback)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Throughput Cards */}
      <div className="network-throughput-grid">
        <div className="throughput-card rx">
          <div className="throughput-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </div>
          <div className="throughput-info">
            <span className="throughput-label">{t('networkSection.download')}</span>
            <span className="throughput-value">{formatSpeed(activeInterface?.rx_speed || 0)}</span>
            <span className="throughput-total">
              {t('networkSection.total')}: {formatBytes(activeInterface?.rx_bytes || 0)}
            </span>
          </div>
        </div>

        <div className="throughput-card tx">
          <div className="throughput-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>
          <div className="throughput-info">
            <span className="throughput-label">{t('networkSection.upload')}</span>
            <span className="throughput-value">{formatSpeed(activeInterface?.tx_speed || 0)}</span>
            <span className="throughput-total">
              {t('networkSection.total')}: {formatBytes(activeInterface?.tx_bytes || 0)}
            </span>
          </div>
        </div>

        <div className="throughput-card packets">
          <div className="throughput-info">
            <span className="throughput-label">{t('networkSection.packets')}</span>
            <div className="packets-row">
              <span className="packet-stat rx">RX: {(activeInterface?.rx_packets || 0).toLocaleString()}</span>
              <span className="packet-stat tx">TX: {(activeInterface?.tx_packets || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="throughput-card errors">
          <div className="throughput-info">
            <span className="throughput-label">{t('networkSection.errors')}</span>
            <div className="packets-row">
              <span className={`packet-stat ${(activeInterface?.rx_errors || 0) > 0 ? 'warning' : ''}`}>
                RX: {activeInterface?.rx_errors || 0}
              </span>
              <span className={`packet-stat ${(activeInterface?.tx_errors || 0) > 0 ? 'warning' : ''}`}>
                TX: {activeInterface?.tx_errors || 0}
              </span>
            </div>
            <div className="packets-row">
              <span className={`packet-stat ${(activeInterface?.rx_dropped || 0) > 0 ? 'warning' : ''}`}>
                Drop RX: {activeInterface?.rx_dropped || 0}
              </span>
              <span className={`packet-stat ${(activeInterface?.tx_dropped || 0) > 0 ? 'warning' : ''}`}>
                Drop TX: {activeInterface?.tx_dropped || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* All Interfaces Table */}
      <div className="network-card">
        <h3>{t('networkSection.allInterfaces')}</h3>
        <div className="interfaces-table-wrapper">
          <table className="interfaces-table">
            <thead>
              <tr>
                <th>{t('networkSection.interface')}</th>
                <th>{t('networkSection.rxSpeed')}</th>
                <th>{t('networkSection.txSpeed')}</th>
                <th>{t('networkSection.rxTotal')}</th>
                <th>{t('networkSection.txTotal')}</th>
                <th>{t('networkSection.errors')}</th>
              </tr>
            </thead>
            <tbody>
              {networkInterfaces.map(iface => (
                <tr 
                  key={iface.interface}
                  className={activeInterface?.interface === iface.interface ? 'selected' : ''}
                  onClick={() => setSelectedInterface(iface.interface)}
                >
                  <td className="interface-name">{iface.interface}</td>
                  <td className="rx">{formatSpeed(iface.rx_speed || 0)}</td>
                  <td className="tx">{formatSpeed(iface.tx_speed || 0)}</td>
                  <td>{formatBytes(iface.rx_bytes || 0)}</td>
                  <td>{formatBytes(iface.tx_bytes || 0)}</td>
                  <td className={((iface.rx_errors || 0) + (iface.tx_errors || 0)) > 0 ? 'warning' : ''}>
                    {(iface.rx_errors || 0) + (iface.tx_errors || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TCP Connections */}
      <div className="network-card">
        <h3>
          {t('networkSection.tcpConnections')}
          <span className="total-badge">{totalConnections}</span>
        </h3>
        <div className="tcp-stats-grid">
          <div className="tcp-stat established">
            <span className="tcp-count">{tcpStats.established || 0}</span>
            <span className="tcp-label">ESTABLISHED</span>
          </div>
          <div className="tcp-stat time-wait">
            <span className="tcp-count">{tcpStats.time_wait || 0}</span>
            <span className="tcp-label">TIME_WAIT</span>
          </div>
          <div className="tcp-stat close-wait">
            <span className="tcp-count">{tcpStats.close_wait || 0}</span>
            <span className="tcp-label">CLOSE_WAIT</span>
          </div>
          <div className="tcp-stat listen">
            <span className="tcp-count">{tcpStats.listen || 0}</span>
            <span className="tcp-label">LISTEN</span>
          </div>
          <div className="tcp-stat syn-sent">
            <span className="tcp-count">{tcpStats.syn_sent || 0}</span>
            <span className="tcp-label">SYN_SENT</span>
          </div>
          <div className="tcp-stat syn-recv">
            <span className="tcp-count">{tcpStats.syn_recv || 0}</span>
            <span className="tcp-label">SYN_RECV</span>
          </div>
          <div className="tcp-stat fin-wait">
            <span className="tcp-count">{(tcpStats.fin_wait1 || 0) + (tcpStats.fin_wait2 || 0)}</span>
            <span className="tcp-label">FIN_WAIT</span>
          </div>
          <div className="tcp-stat other">
            <span className="tcp-count">{(tcpStats.last_ack || 0) + (tcpStats.closing || 0)}</span>
            <span className="tcp-label">OTHER</span>
          </div>
        </div>
      </div>

      {/* Listening Ports */}
      <div className="network-card">
        <h3>
          {t('networkSection.listeningPorts')}
          <span className="total-badge">{listeningPorts.length}</span>
        </h3>
        {listeningPorts.length > 0 ? (
          <div className="ports-table-wrapper">
            <table className="ports-table">
              <thead>
                <tr>
                  <th>{t('networkSection.port')}</th>
                  <th>{t('networkSection.protocol')}</th>
                  <th>{t('networkSection.address')}</th>
                  <th>{t('networkSection.process')}</th>
                  <th>PID</th>
                </tr>
              </thead>
              <tbody>
                {listeningPorts.map((port, idx) => (
                  <tr key={`${port.port}-${port.protocol}-${idx}`}>
                    <td className="port-number">{port.port}</td>
                    <td className="protocol">{port.protocol || 'tcp'}</td>
                    <td className="address">{port.address || '*'}</td>
                    <td className="process-name">{port.process || '-'}</td>
                    <td className="pid">{port.pid || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">{t('networkSection.noListeningPorts')}</div>
        )}
      </div>
    </div>
  )
}

export default NetworkSection
