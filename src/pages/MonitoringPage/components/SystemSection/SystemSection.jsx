import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import SystemWidgets from '../SystemWidgets/SystemWidgets.jsx'
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
  metricsError,
  lastUpdate,
  widgetOrder,
  draggingId,
  dragOverId,
  onDragStart,
  onDragEnter,
}) {
  const { t } = useTranslation()

  // Overview tab muestra los widgets existentes
  if (activeTab === 'overview') {
    return (
      <SystemWidgets
        widgetOrder={widgetOrder}
        draggingId={draggingId}
        dragOverId={dragOverId}
        onDragStart={onDragStart}
        onDragEnter={onDragEnter}
        metrics={metrics}
        metricsLoading={metricsLoading}
        metricsError={metricsError}
        lastUpdate={lastUpdate}
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
