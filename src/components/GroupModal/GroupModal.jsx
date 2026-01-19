import { useState, useEffect } from 'react'
import { useTranslation } from '../../hooks/useTranslation.jsx'
import { DEFAULT_GROUPS, GROUP_COLORS, getGroupColor } from '../../utils/groups.js'
import './GroupModal.css'

function GroupModal({ 
  open, 
  onClose, 
  existingGroups = [],
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onChangeGroupColor,
  connections = [] 
}) {
  const { t, lang } = useTranslation()
  const [mode, setMode] = useState('list') // 'list' | 'create' | 'edit'
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupName, setGroupName] = useState('')
  const [groupColor, setGroupColor] = useState('#64ffda')
  const [error, setError] = useState('')

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setMode('list')
      setSelectedGroup(null)
      setGroupName('')
      setGroupColor('#64ffda')
      setError('')
    }
  }, [open])

  if (!open) return null

  const customGroups = existingGroups.filter(
    g => !DEFAULT_GROUPS.find(dg => dg.name === g)
  )

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      setError(t('groupModal.errors.emptyName'))
      return
    }

    if (existingGroups.includes(groupName.trim())) {
      setError(t('groupModal.errors.duplicate'))
      return
    }

    if (onCreateGroup) {
      onCreateGroup(groupName.trim(), groupColor)
    }

    setMode('list')
    setGroupName('')
    setGroupColor('#64ffda')
    setError('')
  }

  const handleRenameGroup = () => {
    if (!groupName.trim()) {
      setError(t('groupModal.errors.emptyName'))
      return
    }

    if (existingGroups.includes(groupName.trim()) && groupName.trim() !== selectedGroup) {
      setError(t('groupModal.errors.duplicate'))
      return
    }

    if (onRenameGroup) {
      onRenameGroup(selectedGroup, groupName.trim())
    }

    setMode('list')
    setSelectedGroup(null)
    setGroupName('')
    setError('')
  }

  const handleDeleteGroup = (group) => {
    const connectionsInGroup = connections.filter(c => c.group === group).length
    
    if (connectionsInGroup > 0) {
      const confirmed = window.confirm(
        t('groupModal.confirmDelete', { count: connectionsInGroup })
      )
      if (!confirmed) return
    }

    if (onDeleteGroup) {
      onDeleteGroup(group)
    }
  }

  const handleEditGroup = (group) => {
    setSelectedGroup(group)
    setGroupName(group)
    setGroupColor(getGroupColor(group))
    setMode('edit')
    setError('')
  }

  const getConnectionCount = (groupName) => {
    return connections.filter(c => (c.group || 'default') === groupName).length
  }

  const isPredefined = (groupName) => {
    return DEFAULT_GROUPS.some(g => g.name === groupName)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === 'create' && t('groupModal.createTitle')}
            {mode === 'edit' && t('groupModal.editTitle')}
            {mode === 'list' && t('groupModal.title')}
          </h2>
          <button 
            type="button" 
            className="modal-close" 
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">
          {mode === 'list' && (
            <>
              <div className="group-modal-actions">
                <button 
                  type="button"
                  className="btn btn-accent"
                  onClick={() => setMode('create')}
                >
                  <PlusIcon />
                  {t('groupModal.createNew')}
                </button>
              </div>

              <div className="group-list">
                {/* Predefined groups */}
                <div className="group-section">
                  <h3 className="group-section-title">{t('groupModal.predefinedGroups')}</h3>
                  {DEFAULT_GROUPS.map(group => (
                    <div 
                      key={group.name} 
                      className="group-item"
                      style={{ borderLeftColor: group.color }}
                    >
                      <div className="group-item-info">
                        <span className="group-item-name">
                          {group.label?.[lang] || group.name}
                        </span>
                        <span className="group-item-count">
                          {getConnectionCount(group.name)} {t('selection.connections')}
                        </span>
                      </div>
                      <div className="group-item-actions">
                        <button
                          type="button"
                          className="group-color-display"
                          style={{ backgroundColor: group.color }}
                          onClick={() => {
                            if (onChangeGroupColor) {
                              onChangeGroupColor(group.name, group.color)
                            }
                          }}
                          title={t('groupModal.changeColor')}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom groups */}
                <div className="group-section">
                  <h3 className="group-section-title">{t('groupModal.customGroups')}</h3>
                  {customGroups.length > 0 ? (
                    customGroups.map(groupName => (
                      <div 
                        key={groupName} 
                        className="group-item"
                        style={{ borderLeftColor: getGroupColor(groupName) }}
                      >
                        <div className="group-item-info">
                          <span className="group-item-name">{groupName}</span>
                          <span className="group-item-count">
                            {getConnectionCount(groupName)} {t('selection.connections')}
                          </span>
                        </div>
                        <div className="group-item-actions">
                          <button
                            type="button"
                            className="group-color-display"
                            style={{ backgroundColor: getGroupColor(groupName) }}
                            onClick={() => handleEditGroup(groupName)}
                            title={t('groupModal.changeColor')}
                          />
                        <button
                          type="button"
                          className="group-action-btn"
                          onClick={() => handleEditGroup(groupName)}
                          title={t('common.edit')}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="group-action-btn group-action-danger"
                          onClick={() => handleDeleteGroup(groupName)}
                          title={t('common.delete')}
                        >
                          <TrashIcon />
                        </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="group-list-empty">
                      <p>{t('groupModal.noCustomGroups')}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {(mode === 'create' || mode === 'edit') && (
            <div className="group-form">
              <div className="form-field">
                <label className="field-label">
                  {t('groupModal.groupName')}
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => {
                    setGroupName(e.target.value)
                    setError('')
                  }}
                  placeholder={t('groupModal.groupNamePlaceholder')}
                  autoFocus
                />
                {error && <span className="field-error">{error}</span>}
              </div>

              <div className="form-field">
                <label className="field-label">
                  {t('form.color')}
                </label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={groupColor}
                    onChange={(e) => setGroupColor(e.target.value)}
                  />
                  <div className="color-presets">
                    {GROUP_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className="color-preset"
                        style={{ backgroundColor: color }}
                        onClick={() => setGroupColor(color)}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="group-form-actions">
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={mode === 'create' ? handleCreateGroup : handleRenameGroup}
                >
                  {mode === 'create' ? t('common.create') : t('common.save')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setMode('list')
                    setSelectedGroup(null)
                    setGroupName('')
                    setError('')
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
    </svg>
  )
}

export default GroupModal
