import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNotification } from '../../components/Notification/Notification.jsx'
import { useSettings } from '../../components/Settings/Settings.jsx'
import { useConnectionsStore } from '../../stores/connectionsStore.js'
import { useTranslation } from '../../hooks/useTranslation.jsx'
import { useAutoUpdater } from '../../hooks/useAutoUpdater.js'
import { emptyForm } from './constants/formConfig.js'
import { useConnectionForm } from './hooks/useConnectionForm.js'
import { useConnectionActions } from './hooks/useConnectionActions.js'
import { useImportExport } from './hooks/useImportExport.js'
import { useUndoDelete } from './hooks/useUndoDelete.js'
import SelectionSidebar from './components/SelectionSidebar/SelectionSidebar.jsx'
import SelectionTopNav from './components/SelectionTopNav/SelectionTopNav.jsx'
import SelectionHeader from './components/SelectionHeader/SelectionHeader.jsx'
import ConnectionForm from './components/ConnectionForm/ConnectionForm.jsx'
import SettingsModal from './components/SettingsModal/SettingsModal.jsx'
import UndoSnackbar from './components/UndoSnackbar/UndoSnackbar.jsx'
import SelectionLoading from './components/SelectionLoading/SelectionLoading.jsx'
import UpdaterModal from '../../components/UpdaterModal/UpdaterModal.jsx'
import UpdateNotification from '../../components/UpdateNotification/UpdateNotification.jsx'
import UpdateBadge from '../../components/UpdateBadge/UpdateBadge.jsx'
import './SelectionPage.css'

function SelectionPage({ onConnect, allowAutoConnect, onAutoConnectUsed }) {
  // Stores and settings
  const connections = useConnectionsStore(state => state.connections)
  const isLoading = useConnectionsStore(state => state.isLoading)
  const getGroups = useConnectionsStore(state => state.getGroups)
  const { showNotification } = useNotification()
  const { settings, updateSettings, loaded: settingsLoaded } = useSettings()
  const { t } = useTranslation()
  const hasLoaded = !isLoading

  // Get existing groups for form
  const existingGroups = useMemo(() => getGroups(), [getGroups, connections])

  // Local state
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isUpdaterOpen, setIsUpdaterOpen] = useState(false)
  const [showUpdateNotification, setShowUpdateNotification] = useState(false)

  // Auto-updater hook - Detección automática en segundo plano
  const { updateInfo, hasUpdate, isChecking, lastCheck } = useAutoUpdater({
    checkOnMount: true,
    checkInterval: 6 * 60 * 60 * 1000, // 6 horas
    enabled: settings.autoCheckUpdates,
    onUpdateAvailable: (info) => {
      // Mostrar notificación cuando hay actualización disponible
      setShowUpdateNotification(true)
      showNotification(
        `${t('updater.newVersionAvailable')} v${info.version}`,
        'success'
      )
    },
  })

  // Derived state
  const selectedConnection = useMemo(
    () => connections.find((item) => item.id === selectedId) || null,
    [connections, selectedId]
  )

  const defaultId = useMemo(
    () => connections.find((item) => item.isDefault)?.id || null,
    [connections]
  )

  const filteredConnections = useMemo(() => {
    let filtered = connections

    // Filter by group
    if (selectedGroup) {
      filtered = filtered.filter(item => (item.group || 'default') === selectedGroup)
    }

    // Filter by search
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      filtered = filtered.filter((item) =>
        [item.name, item.host, item.username, item.notes, String(item.port || 22)]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term))
      )
    }

    return filtered
  }, [connections, search, selectedGroup])

  const hostSuggestions = useMemo(
    () => Array.from(new Set(connections.map((item) => item.host).filter(Boolean))),
    [connections]
  )

  const userSuggestions = useMemo(
    () => Array.from(new Set(connections.map((item) => item.username).filter(Boolean))),
    [connections]
  )

  // Custom hooks
  const actions = useConnectionActions({
    showNotification,
    onConnect,
  })

  const {
    undoState,
    setUndoData,
    handleUndo: handleUndoDelete,
  } = useUndoDelete({
    onRestore: actions.restoreConnection,
  })

  const handleSaveConnection = useCallback(async (payload, isEdit) => {
    const result = await actions.saveConnection(payload, isEdit, selectedConnection?.id)
    if (!isEdit && result) {
      setSelectedId(null)
    }
    return result
  }, [actions, selectedConnection?.id])

  const handleTestConnection = useCallback(async (testConfig) => {
    return actions.testConnection(testConfig, selectedConnection?.id)
  }, [actions, selectedConnection?.id])

  const {
    formData,
    errors,
    isSaving,
    isTesting,
    displayedConnection,
    handleChange,
    handleSave,
    handleTest,
    resetForm,
  } = useConnectionForm({
    selectedConnection,
    storeCredentials: settings.storeCredentials,
    onSave: handleSaveConnection,
    onTest: handleTestConnection,
  })

  const {
    importInputRef,
    handleExport,
    handleImportClick,
    handleImportFile,
  } = useImportExport({ showNotification })

  // Event handlers
  const handleFormSave = useCallback(async (event) => {
    const result = await handleSave(event)
    if (result.success) {
      showNotification(t('notifications.saved'), 'success')
      if (!selectedConnection) {
        resetForm()
      }
    } else if (result.reason === 'validation') {
      showNotification(t('notifications.requiredFields'), 'error')
    } else {
      showNotification(t('notifications.saveFail'), 'error')
    }
  }, [handleSave, showNotification, t, selectedConnection, resetForm])

  const handleFormTest = useCallback(async () => {
    const result = await handleTest()
    if (result.reason === 'validation') {
      showNotification(t('notifications.requiredTest'), 'warning')
    }
  }, [handleTest, showNotification, t])

  const handleDelete = useCallback(async (id) => {
    const targetId = id || selectedConnection?.id
    if (!targetId) return

    const result = await actions.deleteConnection(targetId)
    if (selectedId === targetId) {
      setSelectedId(null)
    }
    if (result.connection) {
      setUndoData(result.connection, result.index)
    }
    showNotification(t('notifications.deleted'), 'success')
  }, [actions, selectedConnection?.id, selectedId, setUndoData, showNotification, t])

  const handleSetDefault = useCallback(async (id) => {
    await actions.setDefault(id, defaultId)
    // Auto-connect when setting as default
    if (id !== defaultId) {
      await actions.connect(id)
    }
  }, [actions, defaultId])

  const handleConnect = useCallback(async (id) => {
    setSelectedId(id)
    await actions.connect(id)
  }, [actions])

  const handleUndoRestore = useCallback(async () => {
    const restoredId = await handleUndoDelete()
    if (restoredId) {
      setSelectedId(restoredId)
    }
  }, [handleUndoDelete])

  const handleAddNew = useCallback(() => {
    setSelectedId(null)
    resetForm()
  }, [resetForm])

  const handleStoreCredentialsChange = useCallback((nextValue) => {
    updateSettings({ storeCredentials: nextValue })
  }, [updateSettings])

  // Auto-connect effect
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
  }, [allowAutoConnect, hasLoaded, settingsLoaded, settings.autoConnectDefault, connections, onAutoConnectUsed, handleConnect])

  // Keyboard shortcuts
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

  // Loading state
  if (!settingsLoaded || !hasLoaded) {
    return <SelectionLoading />
  }

  return (
    <div className="selection-layout">
      {/* Update badge (top-left corner) - Detección automática */}
      <UpdateBadge
        hasUpdate={hasUpdate}
        updateInfo={updateInfo}
        isChecking={isChecking}
        lastCheck={lastCheck}
        onClick={() => setIsUpdaterOpen(true)}
      />

      {/* Update notification (top-right corner) */}
      {showUpdateNotification && hasUpdate && (
        <UpdateNotification
          updateInfo={updateInfo}
          onOpenUpdater={() => {
            setShowUpdateNotification(false)
            setIsUpdaterOpen(true)
          }}
          onDismiss={() => setShowUpdateNotification(false)}
        />
      )}

      <SelectionSidebar
        connections={connections}
        filteredConnections={filteredConnections}
        selectedId={selectedId}
        defaultId={defaultId}
        search={search}
        onSearchChange={(event) => setSearch(event.target.value)}
        onSelect={setSelectedId}
        onSetDefault={handleSetDefault}
        onToggleFavorite={actions.toggleFavorite}
        onConnect={handleConnect}
        onDelete={handleDelete}
        groups={existingGroups}
        selectedGroup={selectedGroup}
        onSelectGroup={setSelectedGroup}
      />

      <main className="selection-main">
        <SelectionTopNav
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

        <SelectionHeader isEditing={Boolean(displayedConnection)} />

        <ConnectionForm
          formData={formData}
          errors={errors}
          onChange={handleChange}
          onSave={handleFormSave}
          onTest={handleFormTest}
          onDelete={handleDelete}
          isSaving={isSaving}
          isTesting={isTesting}
          selectedConnection={selectedConnection}
          hostSuggestions={hostSuggestions}
          userSuggestions={userSuggestions}
          existingGroups={existingGroups}
        />

        <UndoSnackbar
          open={Boolean(undoState)}
          message={undoState ? `${t('notifications.deleted')} "${undoState.connection.name}"` : ''}
          onUndo={handleUndoRestore}
        />

        <SettingsModal
          open={isSettingsOpen}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateSettings={updateSettings}
          onStoreCredentialsChange={handleStoreCredentialsChange}
          onExport={handleExport}
          onImport={handleImportClick}
          onCheckUpdates={() => {
            setIsSettingsOpen(false)
            setIsUpdaterOpen(true)
          }}
        />

        <UpdaterModal
          open={isUpdaterOpen}
          onClose={() => setIsUpdaterOpen(false)}
        />
      </main>
    </div>
  )
}

export default SelectionPage
