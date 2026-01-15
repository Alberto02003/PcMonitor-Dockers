import { ServerAvatar } from '../../../../components'
import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import GroupFilter from '../GroupFilter/GroupFilter.jsx'
import { getGroupColor } from '../../../../utils/groups.js'
import './SelectionSidebar.css'

function SelectionSidebar({
  connections,
  filteredConnections,
  selectedId,
  defaultId,
  search,
  onSearchChange,
  onSelect,
  onSetDefault,
  onConnect,
  onDelete,
  onToggleFavorite,
  groups = [],
  selectedGroup,
  onSelectGroup,
}) {
  const { t } = useTranslation()

  // Mapear status de conexion a status del avatar
  const getAvatarStatus = (status) => {
    switch (status) {
      case 'online': return 'online'
      case 'offline': return 'offline'
      case 'checking': return 'connecting'
      default: return null
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'online':
        return t('status.online')
      case 'offline':
        return t('status.offline')
      case 'checking':
        return t('status.checking')
      default:
        return t('status.unknown')
    }
  }

  return (
    <aside className="selection-sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">{t('selection.connections')}</h1>
      </div>

      <div className="sidebar-summary">
        <span>
          {connections.length} {t('selection.saved')}
        </span>
        {defaultId && <span className="summary-dot">{t('selection.defaultLabel')}</span>}
      </div>

      <div className="sidebar-search">
        <SearchIcon />
        <input
          type="text"
          value={search}
          placeholder={t('selection.searchPlaceholder')}
          onChange={onSearchChange}
          aria-label={t('selection.searchPlaceholder')}
        />
      </div>

      {groups.length > 0 && (
        <GroupFilter
          groups={groups}
          selectedGroup={selectedGroup}
          onSelectGroup={onSelectGroup}
        />
      )}

      <div className="sidebar-list" role="list">
        {filteredConnections.length === 0 ? (
          <p className="sidebar-empty">{t('selection.noConnections')}</p>
        ) : (
          filteredConnections.map((item, index) => (
            <div
              key={item.id}
              className={`connection-card ${item.id === selectedId ? 'is-active' : ''}`}
              style={{ 
                animationDelay: `${index * 60}ms`,
                borderLeftColor: item.color || getGroupColor(item.group || 'default')
              }}
            >
              {/* Header */}
              <button 
                type="button" 
                className="connection-card-header" 
                onClick={() => onSelect(item.id)}
              >
                <div className="connection-header-left">
                  <ServerAvatar
                    name={item.name}
                    host={item.host}
                    size="sm"
                    status={getAvatarStatus(item.status)}
                    showStatus={true}
                  />
                  <div className="connection-header-info">
                    <div className="connection-name-row">
                      <span className="connection-name">{item.name}</span>
                      {item.id === defaultId && (
                        <span className="connection-badge badge-default">
                          <StarIcon />
                        </span>
                      )}
                      {item.isFavorite && (
                        <span className="connection-badge badge-favorite">
                          <HeartIcon />
                        </span>
                      )}
                    </div>
                    <span className="connection-host">
                      {item.username}@{item.host}:{item.port || 22}
                    </span>
                  </div>
                </div>
                <span className={`connection-status status-${item.status || 'unknown'}`}>
                  {getStatusLabel(item.status)}
                </span>
              </button>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="connection-tags">
                  {item.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="connection-tag">{tag}</span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="connection-tag-more">+{item.tags.length - 3}</span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="connection-actions">
                <button
                  type="button"
                  className={`connection-action-btn ${item.isFavorite ? 'is-active' : ''}`}
                  onClick={() => onToggleFavorite(item.id)}
                  title={t('actions.favorite')}
                >
                  <HeartIcon />
                </button>
                <button
                  type="button"
                  className={`connection-action-btn ${item.id === defaultId ? 'is-active' : ''}`}
                  onClick={() => onSetDefault(item.id)}
                  title={t('actions.setDefault')}
                >
                  <StarIcon />
                </button>
                <button
                  type="button"
                  className="connection-action-btn connection-action-primary"
                  onClick={() => onConnect(item.id)}
                  title={t('actions.connect')}
                >
                  <PlugIcon />
                  <span>{t('actions.connect')}</span>
                </button>
                <button
                  type="button"
                  className="connection-action-btn connection-action-danger"
                  onClick={() => onDelete(item.id)}
                  title={t('common.delete')}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ServerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        d="M4 4h16v6H4Zm0 10h16v6H4Zm2-8v2h2V6Zm0 10v2h2v-2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        d="M12 21.2 4.8 14C2.4 11.6 2.4 7.8 4.8 5.4c2.4-2.4 6.2-2.4 8.6 0l.6.6.6-.6c2.4-2.4 6.2-2.4 8.6 0 2.4 2.4 2.4 6.2 0 8.6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.2-5.4-2.8-5.4 2.8 1-6.2L3.2 9.4l6.1-.9Z"
        fill="currentColor"
      />
    </svg>
  )
}

function PlugIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        d="M9 4h2v4h2V4h2v4h2v4a5 5 0 0 1-4 4.9V20h-2v-3.1A5 5 0 0 1 7 12V8h2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        d="M9 3h6l1 2h4v2H4V5h4Zm1 6h2v9h-2Zm4 0h2v9h-2ZM6 7h12l-1 14H7Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        d="m21 20-4.3-4.3a7 7 0 1 0-1.4 1.4L20 21ZM5 10a5 5 0 1 1 5 5 5 5 0 0 1-5-5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default SelectionSidebar
