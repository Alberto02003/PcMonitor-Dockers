import { useTranslation } from '../../../../hooks/useTranslation.jsx'
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
}) {
  const { t } = useTranslation()

  return (
    <>
      <form className="connection-form" onSubmit={onSave}>
        <div className="form-grid">
          <label className="field">
            <span>{t('form.name')}</span>
            <input
              name="name"
              value={formData.name}
              onChange={onChange}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
          <label className="field">
            <span>{t('form.host')}</span>
            <input
              name="host"
              list="host-suggestions"
              value={formData.host}
              onChange={onChange}
              aria-invalid={Boolean(errors.host)}
            />
            {errors.host && <span className="field-error">{errors.host}</span>}
          </label>
          <label className="field">
            <span>{t('form.port')}</span>
            <input
              name="port"
              value={formData.port}
              onChange={onChange}
              aria-invalid={Boolean(errors.port)}
            />
            {errors.port && <span className="field-error">{errors.port}</span>}
          </label>
          <label className="field">
            <span>{t('form.username')}</span>
            <input
              name="username"
              list="user-suggestions"
              value={formData.username}
              onChange={onChange}
              aria-invalid={Boolean(errors.username)}
            />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </label>
        </div>

        <div className="field-group">
          <label className="field">
            <span>{t('form.authMethod')}</span>
            <select name="authType" value={formData.authType} onChange={onChange}>
              <option value="password">{t('form.password')}</option>
              <option value="key">{t('form.sshKey')}</option>
            </select>
          </label>

          {formData.authType === 'password' ? (
            <label className="field">
              <span>{t('form.password')}</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={onChange}
              />
            </label>
          ) : (
            <label className="field">
              <span>{t('form.keyPath')}</span>
              <input name="keyPath" value={formData.keyPath} onChange={onChange} />
            </label>
          )}
        </div>

        <p className="form-placeholder">{t('selection.formHint')}</p>

        <label className="field field-notes">
          <span>{t('form.notes')}</span>
          <textarea name="notes" rows="3" value={formData.notes} onChange={onChange} />
        </label>

        <div className="form-actions">
          <button className="btn btn-accent" type="submit" disabled={isSaving}>
            {isSaving ? t('actions.saving') : t('actions.save')}
          </button>
          <button
            className="btn btn-outline"
            type="button"
            onClick={onTest}
            disabled={isTesting}
          >
            {isTesting ? t('actions.testing') : t('actions.test')}
          </button>
          {selectedConnection && (
            <button className="btn btn-ghost" type="button" onClick={onDelete}>
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
