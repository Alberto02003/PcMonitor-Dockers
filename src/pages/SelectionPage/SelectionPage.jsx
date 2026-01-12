import { useEffect, useMemo, useRef, useState } from 'react'
import { useNotification } from '../../components/Notification/Notification.jsx'
import { useSettings } from '../../components/Settings/Settings.jsx'
import { sshConnect, sshTest, isTauri } from '../../services/tauri.js'
import SelectionSidebar from './components/SelectionSidebar/SelectionSidebar.jsx'
import SelectionTopNav from './components/SelectionTopNav/SelectionTopNav.jsx'
import SelectionHeader from './components/SelectionHeader/SelectionHeader.jsx'
import ConnectionForm from './components/ConnectionForm/ConnectionForm.jsx'
import SettingsModal from './components/SettingsModal/SettingsModal.jsx'
import UndoSnackbar from './components/UndoSnackbar/UndoSnackbar.jsx'
import SelectionLoading from './components/SelectionLoading/SelectionLoading.jsx'
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
    copySuffix: 'copia',
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
    exportJson: 'Exportar JSON',
    importJson: 'Importar JSON',
    favorite: 'Favorito',
    duplicate: 'Duplicar',
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
    notifFavoriteOn: 'Conexion marcada como favorita.',
    notifFavoriteOff: 'Conexion quitada de favoritos.',
    notifDuplicate: 'Conexion duplicada.',
    notifExportOk: 'Conexiones exportadas.',
    notifImportOk: 'Conexiones importadas.',
    notifImportFail: 'No se pudo importar el archivo.',
    notifImportEmpty: 'No se encontraron conexiones en el archivo.',
    notifConnect: 'Conectando a',
    notifTestStart: 'Probando conexion...',
    notifTestOk: 'Conexion exitosa.',
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
    copySuffix: 'copy',
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
    exportJson: 'Export JSON',
    importJson: 'Import JSON',
    favorite: 'Favorite',
    duplicate: 'Duplicate',
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
    notifFavoriteOn: 'Connection marked as favorite.',
    notifFavoriteOff: 'Connection removed from favorites.',
    notifDuplicate: 'Connection duplicated.',
    notifExportOk: 'Connections exported.',
    notifImportOk: 'Connections imported.',
    notifImportFail: 'Could not import the file.',
    notifImportEmpty: 'No connections found in the file.',
    notifConnect: 'Connecting to',
    notifTestStart: 'Testing connection...',
    notifTestOk: 'Connection successful.',
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

function SelectionPage({ onConnect, allowAutoConnect, onAutoConnectUsed }) {
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
  const [hasLoaded, setHasLoaded] = useState(false)
  const hasMounted = useRef(false)
  const undoTimerRef = useRef(null)
  const importInputRef = useRef(null)
  const { showNotification } = useNotification()
  const { settings, updateSettings, loaded: settingsLoaded } = useSettings()
  const t = copy[settings.language] || copy.es

  const selectedConnection = useMemo(
    () => connections.find((item) => item.id === selectedId) || null,
    [connections, selectedId],
  )

  useEffect(() => {
    loadConnections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!allowAutoConnect || !hasLoaded || !settingsLoaded) return
    if (!settings.autoConnectDefault) {
      if (onAutoConnectUsed) onAutoConnectUsed()
      return
    }
    const defaultConnection = connections.find((item) => item.isDefault)
    if (defaultConnection) {
      handleConnect(defaultConnection.id)
    }
    if (onAutoConnectUsed) onAutoConnectUsed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allowAutoConnect,
    hasLoaded,
    settingsLoaded,
    settings.autoConnectDefault,
    connections,
    onAutoConnectUsed,
  ])

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

  if (!settingsLoaded || !hasLoaded) {
    return <SelectionLoading />
  }

  async function loadConnections() {
    try {
      const encrypted = localStorage.getItem(STORAGE_KEY)
      if (!encrypted) return
      const parsed = await decryptPayload(encrypted)
      const normalized = Array.isArray(parsed) ? parsed.map(normalizeConnection) : []
      setConnections(normalized)
    } catch {
      showNotification(t.notifLoadFail, 'error')
    } finally {
      setHasLoaded(true)
    }
  }

  async function persistConnections(nextConnections) {
    try {
      const encrypted = await encryptPayload(nextConnections)
      localStorage.setItem(STORAGE_KEY, encrypted)
    } catch {
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
      isFavorite: selectedConnection?.isFavorite || false,
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

  async function handleToggleFavorite(id) {
    let nextFavorite = false
    let found = false
    const next = connections.map((item) => {
      if (item.id !== id) return item
      found = true
      nextFavorite = !item.isFavorite
      return { ...item, isFavorite: nextFavorite }
    })
    if (!found) return
    setConnections(next)
    await persistConnections(next)
    showNotification(nextFavorite ? t.notifFavoriteOn : t.notifFavoriteOff, 'success')
  }

  function handleDuplicate(id) {
    const target = connections.find((item) => item.id === id)
    if (!target) return
    const duplicated = {
      ...target,
      id: crypto.randomUUID(),
      name: `${target.name} (${t.copySuffix})`,
      isDefault: false,
      status: 'unknown',
      updatedAt: new Date().toISOString(),
    }
    const next = [...connections, duplicated]
    setConnections(next)
    setSelectedId(duplicated.id)
    persistConnections(next)
    showNotification(t.notifDuplicate, 'success')
  }

  function handleExport() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      connections,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `pcmd-connections-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    showNotification(t.notifExportOk, 'success')
  }

  function handleImportClick() {
    importInputRef.current?.click()
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const imported = Array.isArray(payload) ? payload : payload?.connections
      if (!Array.isArray(imported) || imported.length === 0) {
        showNotification(t.notifImportEmpty, 'warning')
        return
      }
      const existingIds = new Set(connections.map((item) => item.id))
      let hasDefault = connections.some((item) => item.isDefault)
      const importedConnections = imported.map((item) => {
        const normalized = normalizeConnection(item, {
          storeCredentials: settings.storeCredentials,
        })
        let nextId = normalized.id
        if (!nextId || existingIds.has(nextId)) {
          nextId = crypto.randomUUID()
        }
        existingIds.add(nextId)
        const isDefault = !hasDefault && normalized.isDefault
        if (isDefault) {
          hasDefault = true
        }
        return {
          ...normalized,
          id: nextId,
          isDefault,
          status: 'unknown',
          updatedAt: new Date().toISOString(),
        }
      })
      const next = [...connections, ...importedConnections]
      setConnections(next)
      await persistConnections(next)
      showNotification(t.notifImportOk, 'success')
    } catch {
      showNotification(t.notifImportFail, 'error')
    }
  }

  async function handleConnect(id) {
    const target = connections.find((item) => item.id === id)
    if (!target) return
    setSelectedId(id)
    showNotification(`${t.notifConnect} ${target.name}...`, 'warning')
    updateConnectionStatus(id, 'checking')

    if (isTauri()) {
      try {
        await sshConnect(target)
        updateConnectionStatus(id, 'online')
        showNotification(t.notifTestOk, 'success')
        if (onConnect) {
          onConnect(target)
        }
      } catch (error) {
        updateConnectionStatus(id, 'offline')
        showNotification(`Error: ${error}`, 'error')
      }
    } else {
      // Fallback for browser development
      setTimeout(() => {
        updateConnectionStatus(id, 'online')
        showNotification(t.notifTestOk, 'success')
        if (onConnect) {
          onConnect(target)
        }
      }, 1200)
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

  async function handleTestConnection() {
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

    if (isTauri()) {
      try {
        const testConfig = {
          id: selectedConnection?.id || crypto.randomUUID(),
          host: formData.host.trim(),
          port: Number(formData.port) || 22,
          username: formData.username.trim(),
          authType: formData.authType,
          password: formData.password || null,
          keyPath: formData.keyPath || null,
        }
        await sshTest(testConfig)
        setIsTesting(false)
        showNotification(t.notifTestOk, 'success')
        if (selectedConnection) {
          updateConnectionStatus(selectedConnection.id, 'online')
        }
      } catch (error) {
        setIsTesting(false)
        showNotification(`Error: ${error}`, 'error')
        if (selectedConnection) {
          updateConnectionStatus(selectedConnection.id, 'offline')
        }
      }
    } else {
      // Fallback for browser development
      setTimeout(() => {
        setIsTesting(false)
        showNotification(t.notifTestOk, 'success')
        if (selectedConnection) {
          updateConnectionStatus(selectedConnection.id, 'online')
        }
      }, 1200)
    }
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
      <SelectionSidebar
        connections={connections}
        filteredConnections={filteredConnections}
        selectedId={selectedId}
        defaultId={defaultId}
        search={search}
        onSearchChange={(event) => setSearch(event.target.value)}
        onSelect={handleSelect}
        onSetDefault={handleSetDefault}
        onToggleFavorite={handleToggleFavorite}
        onDuplicate={handleDuplicate}
        onConnect={handleConnect}
        onDelete={handleDelete}
        t={t}
      />

      <main className="selection-main">
        <SelectionTopNav
          t={t}
          onAddNew={handleAddNew}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <input
          ref={importInputRef}
          className="sr-only"
          type="file"
          accept="application/json"
          onChange={handleImportFile}
        />

        <SelectionHeader t={t} isEditing={Boolean(displayedConnection)} />

        <ConnectionForm
          formData={formData}
          errors={errors}
          onChange={handleChange}
          onSave={handleSave}
          onTest={handleTestConnection}
          onDelete={handleDelete}
          isSaving={isSaving}
          isTesting={isTesting}
          selectedConnection={selectedConnection}
          t={t}
          hostSuggestions={hostSuggestions}
          userSuggestions={userSuggestions}
        />

        <UndoSnackbar
          open={Boolean(undoState)}
          message={t.notifDeleted}
          actionLabel={t.undo}
          onUndo={handleUndoDelete}
        />

        <SettingsModal
          open={isSettingsOpen}
          settings={settings}
          t={t}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateSettings={updateSettings}
          onStoreCredentialsChange={handleStoreCredentialsChange}
          onExport={handleExport}
          onImport={handleImportClick}
        />
      </main>
    </div>
  )
}

function normalizeConnection(raw, options = {}) {
  const authType = raw?.authType === 'key' ? 'key' : 'password'
  const port = Number(raw?.port) || 22
  const normalized = {
    id: raw?.id || crypto.randomUUID(),
    name: raw?.name || '',
    host: raw?.host || '',
    port,
    username: raw?.username || '',
    authType,
    password: raw?.password || '',
    keyPath: raw?.keyPath || '',
    notes: raw?.notes || '',
    isFavorite: Boolean(raw?.isFavorite),
    isDefault: Boolean(raw?.isDefault),
    status: raw?.status || 'unknown',
    updatedAt: raw?.updatedAt || new Date().toISOString(),
  }
  if (options.storeCredentials === false) {
    normalized.password = ''
    normalized.keyPath = ''
  }
  return normalized
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
