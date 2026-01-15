import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import { DEFAULT_GROUPS } from '../../../../utils/groups.js'
import './GroupFilter.css'

function GroupFilter({ groups, selectedGroup, onSelectGroup }) {
  const { t, lang } = useTranslation()

  // Combinar grupos predefinidos con personalizados
  const allGroups = [
    ...DEFAULT_GROUPS,
    ...groups
      .filter(g => !DEFAULT_GROUPS.find(dg => dg.name === g))
      .map(g => ({ name: g, color: '#64ffda', label: { en: g, es: g } }))
  ]

  return (
    <div className="group-filter">
      <div className="group-filter-label">{t('selection.filterByGroup')}</div>
      <div className="group-filter-buttons">
        <button
          type="button"
          className={`group-filter-btn ${!selectedGroup ? 'active' : ''}`}
          onClick={() => onSelectGroup(null)}
        >
          {t('selection.allGroups')}
        </button>
        {allGroups.map(group => (
          <button
            key={group.name}
            type="button"
            className={`group-filter-btn ${selectedGroup === group.name ? 'active' : ''}`}
            onClick={() => onSelectGroup(group.name)}
          >
            <span 
              className="group-color-dot" 
              style={{ backgroundColor: group.color }}
            />
            <span className="group-label">
              {group.label?.[lang] || group.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default GroupFilter
