import './SelectionHeader.css'

function SelectionHeader({ t, isEditing }) {
  return (
    <header className="main-header">
      <div>
        <h2 className="main-title">{isEditing ? t.editConnection : t.newConnection}</h2>
        <p className="header-hint">{t.headerHint}</p>
      </div>
    </header>
  )
}

export default SelectionHeader
