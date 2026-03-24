import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import SystemWidgets from '../SystemWidgets/SystemWidgets.jsx'
import OverviewTab from './tabs/OverviewTab/OverviewTab.jsx'
import CpuTab from './tabs/CpuTab/CpuTab.jsx'
import MemoryTab from './tabs/MemoryTab/MemoryTab.jsx'
import DiskTab from './tabs/DiskTab/DiskTab.jsx'
import ProcessesTab from './tabs/ProcessesTab/ProcessesTab.jsx'
import './SystemSection.css'

function SystemSection({
  activeTab,
  metrics,
  advancedMetrics,
  metricsLoading,
  advancedLoading,
  _metricsError,
  _lastUpdate,
  _widgetOrder,
  _draggingId,
  _dragOverId,
  _onDragStart,
  _onDragEnter,
}) {
  const { t } = useTranslation()

  // Overview tab muestra el nuevo Overview con métricas completas
  if (activeTab === 'overview') {
    return (
      <OverviewTab
        metrics={metrics}
        advancedMetrics={advancedMetrics}
        basicMetrics={metrics}
        loading={metricsLoading || advancedLoading}
      />
    )
  }

  // Loading state for advanced metrics
  if (advancedLoading && !advancedMetrics) {
    return (
      <div className="system-section-loading">
        <div className="loading-spinner" />
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  // Tabs especificos con metricas avanzadas
  switch (activeTab) {
    case 'cpu':
      return (
        <CpuTab 
          metrics={advancedMetrics?.cpu} 
          basicMetrics={metrics?.cpu}
          loading={advancedLoading} 
        />
      )
    
    case 'memory':
      return (
        <MemoryTab 
          metrics={advancedMetrics?.memory}
          basicMetrics={metrics?.memory}
          loading={advancedLoading}
        />
      )
    
    case 'disk':
      return (
        <DiskTab 
          disks={advancedMetrics?.disks}
          basicDisks={metrics?.disks}
          loading={advancedLoading}
        />
      )
    
    case 'processes':
      return (
        <ProcessesTab 
          processes={advancedMetrics?.processes}
          loading={advancedLoading}
        />
      )
    
    default:
      return null
  }
}

export default SystemSection
