import { useState } from 'react'
import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import { DEFAULT_GROUPS, GROUP_COLORS } from '../../../../utils/groups.js'
import './ConnectionForm.css'

function ConnectionForm({
  formData,
  errors,
  onChange,
  onSave,
  onTest,
  onDelete,
  isSaving,
  isTesting,
  selectedConnection,
  hostSuggestions,
  userSuggestions,
  existingGroups = [],
}) {
  const { t, lang } = useTranslation()
  const [activeTab, setActiveTab] = useState('basic')
  const [showPassword, setShowPassword] = useState(false)

  // Combinar grupos predefinidos con grupos existentes
  const allGroups = [
    ...DEFAULT_GROUPS,
    ...existingGroups
      .filter(g => !DEFAULT_GROUPS.find(dg => dg.name === g))
      .map(g => ({ name: g, color: '#64ffda', label: { en: g, es: g } }))
  ]

  return (
    <>
      <form className="connection-form" onSubmit={onSave}>
        {/* Tab Navigation */}
        <div className="form-tabs">
          <button
            type="button"
            className={`form-tab interactive-bounce ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            {t('form.tabs.basic')}
            {(errors.name || errors.host || errors.port || errors.username) && (
              <span className="tab-error-indicator">●</span>
            )}
          </button>
          <button
            type="button"
            className={`form-tab interactive-bounce ${activeTab === 'auth' ? 'active' : ''}`}
            onClick={() => setActiveTab('auth')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M12 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            {t('form.tabs.auth')}
          </button>
          <button
            type="button"
            className={`form-tab interactive-bounce ${activeTab === 'organization' ? 'active' : ''}`}
            onClick={() => setActiveTab('organization')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            {t('form.tabs.organization')}
          </button>
        </div>
        {/* Tab Content */}
        <div className="form-content">
          {/* Basic Tab */}
          {activeTab === 'basic' && (
            <div className="tab-panel">
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">
                    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {t('form.name')}
                  </span>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={onChange}
                    placeholder={t('form.namePlaceholder')}
                    aria-invalid={Boolean(errors.name)}
                    className="focus-ring"
                  />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </label>

                <label className="field">
                  <span className="field-label">
                    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    {t('form.host')}
                  </span>
                  <input
                    name="host"
                    list="host-suggestions"
                    value={formData.host}
                    onChange={onChange}
                    placeholder="192.168.1.100"
                    aria-invalid={Boolean(errors.host)}
                    className="focus-ring"
                  />
                  {errors.host && <span className="field-error">{errors.host}</span>}
                </label>

                <label className="field">
                  <span className="field-label">
                    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {t('form.port')}
                  </span>
                  <input
                    name="port"
                    value={formData.port}
                    onChange={onChange}
                    placeholder="22"
                    aria-invalid={Boolean(errors.port)}
                    className="focus-ring"
                  />
                  {errors.port && <span className="field-error">{errors.port}</span>}
                </label>

                <label className="field">
                  <span className="field-label">
                    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                    {t('form.username')}
                  </span>
                  <input
                    name="username"
                    list="user-suggestions"
                    value={formData.username}
                    onChange={onChange}
                    placeholder="root"
                    aria-invalid={Boolean(errors.username)}
                    className="focus-ring"
                  />
                  {errors.username && <span className="field-error">{errors.username}</span>}
                </label>
              </div>

              <label className="field field-notes">
                <span className="field-label">
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  {t('form.notes')}
                </span>
                <textarea 
                  name="notes" 
                  rows="3" 
                  value={formData.notes} 
                  onChange={onChange}
                  placeholder={t('form.notesPlaceholder')}
                  className="focus-ring scrollbar-thin"
                />
              </label>
            </div>
          )}

          {/* Authentication Tab */}
          {activeTab === 'auth' && (
            <div className="tab-panel">
              <label className="field">
                <span className="field-label">
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {t('form.authMethod')}
                </span>
                <select name="authType" value={formData.authType} onChange={onChange} className="focus-ring">
                  <option value="password">{t('form.password')}</option>
                  <option value="key">{t('form.sshKey')}</option>
                </select>
              </label>

              {formData.authType === 'password' ? (
                <label className="field">
                  <span className="field-label">
                    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {t('form.password')}
                  </span>
                  <div className="password-field-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={onChange}
                      placeholder="••••••••"
                      className="focus-ring"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>
              ) : (
                <label className="field">
                  <span className="field-label">
                    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                    {t('form.keyPath')}
                  </span>
                  <input 
                    name="keyPath" 
                    value={formData.keyPath} 
                    onChange={onChange}
                    placeholder="~/.ssh/id_rsa"
                    className="focus-ring"
                  />
                </label>
              )}

              <div className="auth-hint">
                <svg className="hint-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <p>{t('selection.formHint')}</p>
              </div>
            </div>
          )}

          {/* Organization Tab */}
          {activeTab === 'organization' && (
            <div className="tab-panel">
              <label className="field">
                <span className="field-label">
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                  </svg>
                  {t('form.group')}
                </span>
                <select 
                  name="group" 
                  value={formData.group || 'default'} 
                  onChange={onChange}
                  className="focus-ring"
                >
                  {allGroups.map(group => (
                    <option key={group.name} value={group.name}>
                      {group.label?.[lang] || group.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  {t('form.color')}
                </span>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    name="color"
                    value={formData.color || '#64ffda'}
                    onChange={onChange}
                    className="color-picker-input"
                  />
                  <div className="color-presets">
                    {GROUP_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className="color-preset"
                        style={{ backgroundColor: color }}
                        onClick={() => onChange({ target: { name: 'color', value: color } })}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </label>

              <label className="field">
                <span className="field-label">
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  {t('form.tags')}
                </span>
                  <input
                    name="tags"
                    value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                      onChange({ target: { name: 'tags', value: tags } })
                    }}
                    placeholder={t('form.tagsPlaceholder')}
                    className="focus-ring"
                  />
              </label>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button className="btn btn-accent interactive-bounce hover-glow" type="submit" disabled={isSaving}>
            {isSaving ? t('actions.saving') : t('actions.save')}
          </button>
          <button
            className="btn btn-outline interactive-bounce"
            type="button"
            onClick={onTest}
            disabled={isTesting}
          >
            {isTesting ? t('actions.testing') : t('actions.test')}
          </button>
          {selectedConnection && (
            <button className="btn btn-ghost interactive-bounce" type="button" onClick={onDelete}>
              {t('common.delete')}
            </button>
          )}
        </div>
      </form>

      <datalist id="host-suggestions">
        {hostSuggestions.map((host) => (
          <option key={host} value={host} />
        ))}
      </datalist>

      <datalist id="user-suggestions">
        {userSuggestions.map((user) => (
          <option key={user} value={user} />
        ))}
      </datalist>
    </>
  )
}

export default ConnectionForm
