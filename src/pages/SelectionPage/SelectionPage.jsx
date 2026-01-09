import { useEffect, useMemo, useRef, useState } from 'react'
import { useNotification } from '../../components/Notification/Notification.jsx'
import { useSettings } from '../../components/Settings/Settings.jsx'
import './SelectionPage.css'

const STORAGE_KEY = 'pcmd.connections.v1'
const KEY_STORAGE = 'pcmd.key.v1'

const emptyForm = {
  name: '',
  host: '',
  port: '22',
  username: '',
  authType: 'password',
  password: '',
  keyPath: '',
  notes: '',
}

const copy = {
  es: {
    panel: 'Panel',
    connections: 'Conexiones',
    saved: 'guardadas',
    defaultLabel: 'Predeterminada',
    searchPlaceholder: 'Buscar por nombre, IP o usuario',
    noConnections: 'No hay conexiones guardadas.',
    editConnection: 'Editar conexion',
    newConnection: 'Nueva conexion',
    headerHint: 'Agrega una conexion para empezar a monitorear.',
    formHint: 'Completa los campos y guarda para crear tu primera conexion.',
    name: 'Nombre',
    host: 'Host',
    port: 'Puerto',
    username: 'Usuario',
    authMethod: 'Metodo de autenticacion',
    password: 'Password',
    sshKey: 'Clave SSH',
    keyPath: 'Ruta de la clave',
    notes: 'Notas',
    save: 'Guardar conexion',
    saving: 'Guardando...',
    test: 'Probar conexion',
    testing: 'Probando...',
    delete: 'Eliminar',
    connect: 'Conectar',
    setDefault: 'Establecer como predeterminada',
    settings: 'Ajustes',
    addNew: 'Nueva conexion',
    required: 'Requerido',
    invalidPort: 'Puerto invalido',
    statusOnline: 'Online',
    statusOffline: 'Offline',
    statusChecking: 'Probando',
    statusUnknown: 'Sin estado',
    notifSaved: 'Conexion guardada.',
    notifDeleted: 'Conexion eliminada.',
    notifDefaultOn: 'Conexion predeterminada actualizada.',
    notifDefaultOff: 'Conexion predeterminada desactivada.',
    notifConnect: 'Conectando a',
    notifTestStart: 'Probando conexion...',
    notifTestOk: 'Conexion simulada: en linea.',
    notifLoadFail: 'No se pudieron cargar las conexiones guardadas.',
    notifSaveFail: 'No se pudo guardar la informacion cifrada.',
    notifRequired: 'Completa los campos requeridos.',
    notifRequiredTest: 'Completa los campos requeridos para probar.',
    undo: 'Deshacer',
    settingsTitle: 'Ajustes',
    settingsClose: 'Cerrar',
    settingsSectionGeneral: 'General',
    settingsSectionSecurity: 'Seguridad',
    settingsSectionWindow: 'Ventana',
    settingsSectionLocale: 'Idioma',
    settingNotifications: 'Duracion de notificaciones',
    settingAutoConnect: 'Auto conectar a predeterminada',
    settingWindowSize: 'Tamano de ventana',
    settingStoreCreds: 'Guardar credenciales',
    settingLanguage: 'Idioma',
    sizeSmall: 'Pequena',
    sizeMedium: 'Mediana',
    sizeLarge: 'Grande',
    languageEs: 'Espanol',
    languageEn: 'Ingles',
  },
  en: {
    panel: 'Panel',
    connections: 'Connections',
    saved: 'saved',
    defaultLabel: 'Default',
    searchPlaceholder: 'Search by name, IP or user',
    noConnections: 'No saved connections.',
    editConnection: 'Edit connection',
    newConnection: 'New connection',
    headerHint: 'Add a connection to start monitoring.',
    formHint: 'Complete the fields and save to create your first connection.',
    name: 'Name',
    host: 'Host',
    port: 'Port',
    username: 'User',
    authMethod: 'Authentication method',
    password: 'Password',
    sshKey: 'SSH key',
    keyPath: 'Key path',
    notes: 'Notes',
    save: 'Save connection',
    saving: 'Saving...',
    test: 'Test connection',
    testing: 'Testing...',
    delete: 'Delete',
    connect: 'Connect',
    setDefault: 'Set as default',
    settings: 'Settings',
    addNew: 'New connection',
    required: 'Required',
    invalidPort: 'Invalid port',
    statusOnline: 'Online',
    statusOffline: 'Offline',
    statusChecking: 'Checking',
    statusUnknown: 'Unknown',
    notifSaved: 'Connection saved.',
    notifDeleted: 'Connection deleted.',
    notifDefaultOn: 'Default connection updated.',
    notifDefaultOff: 'Default connection cleared.',
    notifConnect: 'Connecting to',
    notifTestStart: 'Testing connection...',
    notifTestOk: 'Simulated connection: online.',
    notifLoadFail: 'Could not load saved connections.',
    notifSaveFail: 'Could not save encrypted data.',
    notifRequired: 'Please complete required fields.',
    notifRequiredTest: 'Complete required fields to test.',
    undo: 'Undo',
    settingsTitle: 'Settings',
    settingsClose: 'Close',
    settingsSectionGeneral: 'General',
    settingsSectionSecurity: 'Security',
    settingsSectionWindow: 'Window',
    settingsSectionLocale: 'Language',
    settingNotifications: 'Notification duration',
    settingAutoConnect: 'Auto connect to default',
    settingWindowSize: 'Window size',
    settingStoreCreds: 'Store credentials',
    settingLanguage: 'Language',
    sizeSmall: 'Small',
    sizeMedium: 'Medium',
    sizeLarge: 'Large',
    languageEs: 'Spanish',
    languageEn: 'English',
  },
}

function SelectionPage({ onConnect }) {
  const [connections, setConnections] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [search, setSearch] = useState('')
  const [displayedConnection, setDisplayedConnection] = useState(null)
  const [errors, setErrors] = useState({})
  const [undoState, setUndoState] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const hasMounted = useRef(false)
  const undoTimerRef = useRef(null)
  const autoConnectRef = useRef(false)
  const { showNotification } = useNotification()
  const { settings, updateSettings } = useSettings()
  const t = copy[settings.language] || copy.es

  const selectedConnection = useMemo(
    () => connections.find((item) => item.id === selectedId) || null,
    [connections, selectedId],
  )

  useEffect(() => {
    loadConnections()
  }, [])

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      setDisplayedConnection(selectedConnection)
      setFormData(
        selectedConnection
          ? {
              name: selectedConnection.name,
              host: selectedConnection.host,
              port: String(selectedConnection.port || 22),
              username: selectedConnection.username,
              authType: selectedConnection.authType || 'password',
              password: selectedConnection.password || '',
              keyPath: selectedConnection.keyPath || '',
              notes: selectedConnection.notes || '',
            }
          : emptyForm,
      )
      return
    }

    setDisplayedConnection(selectedConnection)
    setFormData(
      selectedConnection
        ? {
            name: selectedConnection.name,
            host: selectedConnection.host,
            port: String(selectedConnection.port || 22),
            username: selectedConnection.username,
            authType: selectedConnection.authType || 'password',
            password: selectedConnection.password || '',
            keyPath: selectedConnection.keyPath || '',
            notes: selectedConnection.notes || '',
          }
        : emptyForm,
    )
  }, [selectedConnection])

  const defaultId = useMemo(
    () => connections.find((item) => item.isDefault)?.id || null,
    [connections],
  )

  const filteredConnections = useMemo(() => {
    if (!search.trim()) return connections
    const term = search.trim().toLowerCase()
    return connections.filter((item) =>
      [item.name, item.host, item.username]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    )
  }, [connections, search])

  useEffect(() => {
    if (!settings.autoConnectDefault || autoConnectRef.current) return
    const defaultConnection = connections.find((item) => item.isDefault)
    if (defaultConnection) {
      autoConnectRef.current = true
      handleConnect(defaultConnection.id)
    }
  }, [connections, settings.autoConnectDefault])

  useEffect(() => {
    if (!settings.autoConnectDefault) {
      autoConnectRef.current = false
    }
  }, [settings.autoConnectDefault])

  useEffect(() => {
    if (!settings.storeCredentials) {
      setFormData((prev) => ({ ...prev, password: '', keyPath: '' }))
    }
  }, [settings.storeCredentials])

  const hostSuggestions = useMemo(
    () => Array.from(new Set(connections.map((item) => item.host).filter(Boolean))),
    [connections],
  )

  const userSuggestions = useMemo(
    () => Array.from(new Set(connections.map((item) => item.username).filter(Boolean))),
    [connections],
  )

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false)
          return
        }
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSettingsOpen])

  useEffect(() => () => clearTimeout(undoTimerRef.current), [])

  async function loadConnections() {
    try {
      const encrypted = localStorage.getItem(STORAGE_KEY)
      if (!encrypted) return
      const parsed = await decryptPayload(encrypted)
      setConnections(Array.isArray(parsed) ? parsed : [])
    } catch (error) {
      showNotification(t.notifLoadFail, 'error')
    }
  }

  async function persistConnections(nextConnections) {
    try {
      const encrypted = await encryptPayload(nextConnections)
      localStorage.setItem(STORAGE_KEY, encrypted)
    } catch (error) {
      showNotification(t.notifSaveFail, 'error')
    }
  }

  function handleSelect(id) {
    setSelectedId(id)
  }

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function handleAddNew() {
    setSelectedId(null)
    setFormData(emptyForm)
  }

  async function handleSave(event) {
    event.preventDefault()
    const nextErrors = validateForm(formData, t)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      showNotification(t.notifRequired, 'error')
      return
    }

    setIsSaving(true)
    const payload = {
      id: selectedConnection?.id || crypto.randomUUID(),
      name: formData.name.trim(),
      host: formData.host.trim(),
      port: Number(formData.port) || 22,
      username: formData.username.trim(),
      authType: formData.authType,
      password:
        settings.storeCredentials && formData.authType === 'password'
          ? formData.password
          : '',
      keyPath:
        settings.storeCredentials && formData.authType === 'key'
          ? formData.keyPath
          : '',
      notes: formData.notes,
      isDefault: selectedConnection?.isDefault || false,
      status: selectedConnection?.status || 'unknown',
      updatedAt: new Date().toISOString(),
    }

    const next = selectedConnection
      ? connections.map((item) => (item.id === payload.id ? payload : item))
      : [...connections, payload]

    setConnections(next)
    if (selectedConnection) {
      setSelectedId(payload.id)
    } else {
      setSelectedId(null)
      setFormData(emptyForm)
    }
    await persistConnections(next)
    showNotification(t.notifSaved, 'success')
    setIsSaving(false)
  }

  async function handleDelete(id) {
    const targetId = id || selectedConnection?.id
    if (!targetId) return
    const targetIndex = connections.findIndex((item) => item.id === targetId)
    const targetConnection = connections.find((item) => item.id === targetId)
    const next = connections.filter((item) => item.id !== targetId)
    setConnections(next)
    if (selectedId === targetId) {
      setSelectedId(null)
    }
    await persistConnections(next)
    if (targetConnection) {
      setUndoState({ connection: targetConnection, index: targetIndex })
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
      undoTimerRef.current = setTimeout(() => {
        setUndoState(null)
      }, 4000)
    }
    showNotification(t.notifDeleted, 'success')
  }

  async function handleSetDefault(id) {
    const isCurrentlyDefault = defaultId === id
    const next = connections.map((item) => ({
      ...item,
      isDefault: isCurrentlyDefault ? false : item.id === id,
    }))
    setConnections(next)
    await persistConnections(next)
    showNotification(isCurrentlyDefault ? t.notifDefaultOff : t.notifDefaultOn, 'success')
  }

  function handleConnect(id) {
    const target = connections.find((item) => item.id === id)
    if (!target) return
    setSelectedId(id)
    showNotification(`${t.notifConnect} ${target.name}...`, 'success')
    updateConnectionStatus(id, 'checking')
    setTimeout(() => updateConnectionStatus(id, 'online'), 1200)
    if (onConnect) {
      onConnect(target)
    }
  }

  function handleUndoDelete() {
    if (!undoState) return
    const next = [...connections]
    const insertIndex = Math.max(0, Math.min(undoState.index, next.length))
    next.splice(insertIndex, 0, undoState.connection)
    setConnections(next)
    setSelectedId(undoState.connection.id)
    persistConnections(next)
    setUndoState(null)
  }

  function handleTestConnection() {
    const nextErrors = validateForm(formData, t)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      showNotification(t.notifRequiredTest, 'warning')
      return
    }
    setIsTesting(true)
    showNotification(t.notifTestStart, 'warning')
    if (selectedConnection) {
      updateConnectionStatus(selectedConnection.id, 'checking')
    }
    setTimeout(() => {
      setIsTesting(false)
      showNotification(t.notifTestOk, 'success')
      if (selectedConnection) {
        updateConnectionStatus(selectedConnection.id, 'online')
      }
    }, 1200)
  }

  function updateConnectionStatus(id, status) {
    setConnections((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    )
  }

  function handleStoreCredentialsChange(nextValue) {
    updateSettings({ storeCredentials: nextValue })
    if (!nextValue) {
      const scrubbed = connections.map((item) => ({
        ...item,
        password: '',
        keyPath: '',
      }))
      setConnections(scrubbed)
      persistConnections(scrubbed)
    }
  }

  return (
    <div className="selection-layout">
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
            onChange={(event) => setSearch(event.target.value)}
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
                    <button
                      type="button"
                      className="item-main"
                      onClick={() => handleSelect(item.id)}
                    >
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
                    onClick={() => handleSelect(item.id)}
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
                      className={`icon-button ${item.id === defaultId ? 'is-active' : ''}`}
                      onClick={() => handleSetDefault(item.id)}
                      title={t.setDefault}
                    >
                      <StarIcon />
                    </button>
                    <button
                      type="button"
                      className={`icon-button ${item.id === selectedId ? 'is-primary' : ''}`}
                      onClick={() => handleConnect(item.id)}
                      title={t.connect}
                    >
                      <PlugIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-button is-danger"
                      onClick={() => handleDelete(item.id)}
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

      <main className="selection-main">
        <div className="top-nav">
          <span className="top-nav-title">{t.panel}</span>
          <div className="top-nav-actions">
            <button type="button" className="nav-button" onClick={handleAddNew}>
              <PlusIcon />
              {t.addNew}
            </button>
            <button
              type="button"
              className="nav-button nav-button-muted"
              onClick={() => setIsSettingsOpen(true)}
            >
              <SettingsIcon />
              {t.settings}
            </button>
          </div>
        </div>

        <header className="main-header">
          <div>
            <h2 className="main-title">
              {displayedConnection ? t.editConnection : t.newConnection}
            </h2>
            <p className="header-hint">
              {t.headerHint}
            </p>
          </div>
        </header>

        <form className="connection-form" onSubmit={handleSave}>
          <div className="form-grid">
            <label className="field">
              <span>{t.name}</span>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>
            <label className="field">
              <span>{t.host}</span>
              <input
                name="host"
                list="host-suggestions"
                value={formData.host}
                onChange={handleChange}
                aria-invalid={Boolean(errors.host)}
              />
              {errors.host && <span className="field-error">{errors.host}</span>}
            </label>
            <label className="field">
              <span>{t.port}</span>
              <input
                name="port"
                value={formData.port}
                onChange={handleChange}
                aria-invalid={Boolean(errors.port)}
              />
              {errors.port && <span className="field-error">{errors.port}</span>}
            </label>
            <label className="field">
              <span>{t.username}</span>
              <input
                name="username"
                list="user-suggestions"
                value={formData.username}
                onChange={handleChange}
                aria-invalid={Boolean(errors.username)}
              />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </label>
          </div>

          <div className="field-group">
            <label className="field">
              <span>{t.authMethod}</span>
              <select name="authType" value={formData.authType} onChange={handleChange}>
                <option value="password">{t.password}</option>
                <option value="key">{t.sshKey}</option>
              </select>
            </label>

            {formData.authType === 'password' ? (
              <label className="field">
                <span>{t.password}</span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </label>
            ) : (
              <label className="field">
                <span>{t.keyPath}</span>
                <input name="keyPath" value={formData.keyPath} onChange={handleChange} />
              </label>
            )}
          </div>

          <p className="form-placeholder">{t.formHint}</p>

          <label className="field field-notes">
            <span>{t.notes}</span>
            <textarea name="notes" rows="3" value={formData.notes} onChange={handleChange} />
          </label>

          <div className="form-actions">
            <button className="btn btn-accent" type="submit" disabled={isSaving}>
              {isSaving ? t.saving : t.save}
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? t.testing : t.test}
            </button>
            {selectedConnection && (
              <button className="btn btn-ghost" type="button" onClick={handleDelete}>
                {t.delete}
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

        {undoState && (
          <div className="undo-snackbar" role="status">
            <span>{t.notifDeleted}</span>
            <button type="button" onClick={handleUndoDelete}>
              {t.undo}
            </button>
          </div>
        )}

        {isSettingsOpen && (
          <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
            <div
              className="modal-panel"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-header">
                <h3>{t.settingsTitle}</h3>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setIsSettingsOpen(false)}
                  title={t.settingsClose}
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="modal-body">
                <div className="modal-section">
                  <span>{t.settingsSectionGeneral}</span>
                  <label className="modal-field">
                    <span>{t.settingNotifications}</span>
                    <select
                      value={settings.notificationDuration}
                      onChange={(event) =>
                        updateSettings({ notificationDuration: Number(event.target.value) })
                      }
                    >
                      <option value="800">0.8s</option>
                      <option value="1000">1s</option>
                      <option value="1500">1.5s</option>
                      <option value="2000">2s</option>
                      <option value="3000">3s</option>
                    </select>
                  </label>
                  <label className="modal-toggle">
                    <span>{t.settingAutoConnect}</span>
                    <input
                      type="checkbox"
                      checked={settings.autoConnectDefault}
                      onChange={(event) =>
                        updateSettings({ autoConnectDefault: event.target.checked })
                      }
                    />
                  </label>
                </div>

                <div className="modal-section">
                  <span>{t.settingsSectionSecurity}</span>
                  <label className="modal-toggle">
                    <span>{t.settingStoreCreds}</span>
                    <input
                      type="checkbox"
                      checked={settings.storeCredentials}
                      onChange={(event) => handleStoreCredentialsChange(event.target.checked)}
                    />
                  </label>
                </div>

                <div className="modal-section">
                  <span>{t.settingsSectionWindow}</span>
                  <label className="modal-field">
                    <span>{t.settingWindowSize}</span>
                    <select
                      value={settings.windowSize}
                      onChange={(event) => updateSettings({ windowSize: event.target.value })}
                    >
                      <option value="small">{t.sizeSmall}</option>
                      <option value="medium">{t.sizeMedium}</option>
                      <option value="large">{t.sizeLarge}</option>
                    </select>
                  </label>
                </div>

                <div className="modal-section">
                  <span>{t.settingsSectionLocale}</span>
                  <label className="modal-field">
                    <span>{t.settingLanguage}</span>
                    <select
                      value={settings.language}
                      onChange={(event) => updateSettings({ language: event.target.value })}
                    >
                      <option value="es">{t.languageEs}</option>
                      <option value="en">{t.languageEn}</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  {t.settingsClose}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function validateForm(values, t) {
  const nextErrors = {}
  if (!values.name.trim()) nextErrors.name = t.required
  if (!values.host.trim()) nextErrors.host = t.required
  if (!values.username.trim()) nextErrors.username = t.required
  const portValue = Number(values.port)
  if (Number.isNaN(portValue) || portValue < 1 || portValue > 65535) {
    nextErrors.port = t.invalidPort
  }
  return nextErrors
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

async function getKey() {
  const stored = localStorage.getItem(KEY_STORAGE)
  if (stored) {
    const raw = base64ToBytes(stored)
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, [
      'encrypt',
      'decrypt',
    ])
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key))
  localStorage.setItem(KEY_STORAGE, bytesToBase64(raw))
  return key
}

async function encryptPayload(payload) {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(payload))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const merged = new Uint8Array(iv.length + encrypted.byteLength)
  merged.set(iv, 0)
  merged.set(new Uint8Array(encrypted), iv.length)
  return bytesToBase64(merged)
}

async function decryptPayload(payload) {
  const key = await getKey()
  const bytes = base64ToBytes(payload)
  const iv = bytes.slice(0, 12)
  const data = bytes.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  const text = new TextDecoder().decode(decrypted)
  return JSON.parse(text)
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

export default SelectionPage

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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        d="m7 7 10 10m0-10L7 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
