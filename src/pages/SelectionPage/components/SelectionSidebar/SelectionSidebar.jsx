import { ServerAvatar } from '../../../../components'
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
  onDuplicate,
  t,
}) {
  // Mapear status de conexion a status del avatar
  const getAvatarStatus = (status) => {
    switch (status) {
      case 'online': return 'online'
      case 'offline': return 'offline'
      case 'checking': return 'connecting'
      default: return null
    }
  }

  return (
    <aside className="selection-sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">{t.connections}</h1>
      </div>

      <div className="sidebar-summary">
        <span>
          {connections.length} {t.saved}
        </span>
        {defaultId && <span className="summary-dot">{t.defaultLabel}</span>}
      </div>

      <div className="sidebar-search">
        <SearchIcon />
        <input
          type="text"
          value={search}
          placeholder={t.searchPlaceholder}
          onChange={onSearchChange}
          aria-label={t.searchPlaceholder}
        />
      </div>

      <div className="sidebar-list" role="list">
        {filteredConnections.length === 0 ? (
          <p className="sidebar-empty">{t.noConnections}</p>
        ) : (
          filteredConnections.map((item, index) => (
            <div
              key={item.id}
              className={`sidebar-item ${item.id === selectedId ? 'is-active' : ''} ${item.id === defaultId ? 'is-default' : ''}`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="item-content">
                <div className="item-top">
                  <ServerAvatar
                    name={item.name}
                    host={item.host}
                    size="sm"
                    status={getAvatarStatus(item.status)}
                    showStatus={true}
                  />
                  <button type="button" className="item-main" onClick={() => onSelect(item.id)}>
                    <div className="item-title">
                      <p className="item-name">{item.name}</p>
                      {item.id === defaultId && <span className="default-dot" />}
                      <span className={`status-pill status-${item.status || 'unknown'}`}>
                        {getStatusLabel(item.status, t)}
                      </span>
                    </div>
                  </button>
                </div>
                <button
                  type="button"
                  className="item-main item-main-meta"
                  onClick={() => onSelect(item.id)}
                >
                  <div className="item-meta">
                    <div className="meta-block">
                      <span className="meta-label">{t.username}</span>
                      <span className="meta-value">
                        <UserIcon />
                        {item.username}
                      </span>
                    </div>
                    <div className="meta-block">
                      <span className="meta-label">IP</span>
                      <span className="meta-value">
                        <ServerIcon />
                        {item.host}:{item.port || 22}
                      </span>
                    </div>
                  </div>
                </button>
                <div className="item-actions item-actions-bottom">
                  <button
                    type="button"
                    className={`icon-button ${item.isFavorite ? 'is-active' : ''}`}
                    onClick={() => onToggleFavorite(item.id)}
                    title={t.favorite}
                  >
                    <HeartIcon />
                  </button>
                  <button
                    type="button"
                    className={`icon-button ${item.id === defaultId ? 'is-active' : ''}`}
                    onClick={() => onSetDefault(item.id)}
                    title={t.setDefault}
                  >
                    <StarIcon />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onDuplicate(item.id)}
                    title={t.duplicate}
                  >
                    <CopyIcon />
                  </button>
                  <button
                    type="button"
                    className={`icon-button ${item.id === selectedId ? 'is-primary' : ''}`}
                    onClick={() => onConnect(item.id)}
                    title={t.connect}
                  >
                    <PlugIcon />
                  </button>
                  <button
                    type="button"
                    className="icon-button is-danger"
                    onClick={() => onDelete(item.id)}
                    title={t.delete}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}

function getStatusLabel(status, t) {
  switch (status) {
    case 'online':
      return t.statusOnline
    case 'offline':
      return t.statusOffline
    case 'checking':
      return t.statusChecking
    default:
      return t.statusUnknown
  }
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

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        d="M8 7h11v13H8Zm-3-3h11v2H7v11H5Z"
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
