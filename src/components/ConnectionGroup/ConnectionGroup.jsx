import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation.jsx'
import { getGroupLabel } from '../../utils/groups.js'
import './ConnectionGroup.css'

function ConnectionGroup({ 
  name, 
  color, 
  count, 
  children,
  defaultExpanded = true 
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const { t, lang } = useTranslation()

  const displayName = getGroupLabel(name, lang)

  return (
    <div className="connection-group">
      <button
        type="button"
        className="connection-group-header interactive-bounce"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ borderLeftColor: color }}
        aria-expanded={isExpanded}
        aria-controls={`group-${name}`}
      >
        <div className="group-header-left">
          <span className="group-icon" aria-hidden="true">
            {isExpanded ? '📂' : '📁'}
          </span>
          <h3 className="group-name">{displayName}</h3>
          <span className="group-count" aria-label={`${count} ${t('selection.connections')}`}>
            {count}
          </span>
        </div>
        <span className="group-arrow" aria-hidden="true">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>
      
      {isExpanded && (
        <div 
          id={`group-${name}`}
          className="connection-group-content"
          role="list"
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default ConnectionGroup
