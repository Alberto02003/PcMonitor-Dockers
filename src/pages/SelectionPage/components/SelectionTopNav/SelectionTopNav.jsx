import './SelectionTopNav.css'

function SelectionTopNav({ t, onAddNew, onOpenSettings }) {
  return (
    <div className="top-nav">
      <span className="top-nav-title">{t.panel}</span>
      <div className="top-nav-actions">
        <button type="button" className="nav-button" onClick={onAddNew}>
          <PlusIcon />
          {t.addNew}
        </button>
        <button type="button" className="nav-button nav-button-muted" onClick={onOpenSettings}>
          <SettingsIcon />
          {t.settings}
        </button>
      </div>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        d="m12 4 1.1 2.2 2.4.4-1.7 1.7.4 2.4L12 9.6l-2.2 1.1.4-2.4L8.5 6.6l2.4-.4ZM6 12l1 2.1 2.3.4-1.6 1.6.4 2.3L6 17l-2.1 1 .4-2.3-1.6-1.6 2.3-.4ZM18 12l1 2.1 2.3.4-1.6 1.6.4 2.3-2.1-1-2.1 1 .4-2.3-1.6-1.6 2.3-.4ZM12 14a2 2 0 1 0 2 2 2 2 0 0 0-2-2Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default SelectionTopNav
