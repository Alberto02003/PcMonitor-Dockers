/**
 * Hook para gestionar el formulario de conexiones
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from '../../../hooks/useTranslation.jsx'
import { emptyForm, connectionToFormData, formDataToPayload, validateForm } from '../constants/formConfig.js'

/**
 * Hook que gestiona el estado del formulario de conexiones
 * @param {Object} options - Opciones del hook
 * @param {Object|null} options.selectedConnection - Conexión seleccionada
 * @param {boolean} options.storeCredentials - Si se deben guardar credenciales
 * @param {Function} options.onSave - Callback para guardar (recibe payload, isEdit)
 * @param {Function} options.onTest - Callback para probar conexión
 */
export function useConnectionForm({
  selectedConnection,
  storeCredentials,
  onSave,
  onTest,
}) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [displayedConnection, setDisplayedConnection] = useState(null)
  const hasMounted = useRef(false)

  // Sincronizar formulario con conexión seleccionada
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      setDisplayedConnection(selectedConnection)
      setFormData(connectionToFormData(selectedConnection))
      return
    }

    setDisplayedConnection(selectedConnection)
    setFormData(connectionToFormData(selectedConnection))
  }, [selectedConnection])

  // Limpiar credenciales si se desactiva storeCredentials
  useEffect(() => {
    if (!storeCredentials) {
      setFormData((prev) => ({ ...prev, password: '', keyPath: '' }))
    }
  }, [storeCredentials])

  const handleChange = useCallback((event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => {
      if (prev[name]) {
        const next = { ...prev }
        delete next[name]
        return next
      }
      return prev
    })
  }, [])

  const handleSave = useCallback(async (event) => {
    event.preventDefault()
    const nextErrors = validateForm(formData, t)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return { success: false, reason: 'validation' }
    }

    setIsSaving(true)
    const payload = formDataToPayload(formData, storeCredentials)
    
    try {
      const result = await onSave(payload, Boolean(selectedConnection))
      setIsSaving(false)
      return { success: true, result }
    } catch (error) {
      setIsSaving(false)
      return { success: false, reason: 'error', error }
    }
  }, [formData, storeCredentials, selectedConnection, onSave, t])

  const handleTest = useCallback(async () => {
    const nextErrors = validateForm(formData, t)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return { success: false, reason: 'validation' }
    }

    setIsTesting(true)
    const testConfig = {
      id: selectedConnection?.id || crypto.randomUUID(),
      host: formData.host.trim(),
      port: Number(formData.port) || 22,
      username: formData.username.trim(),
      authType: formData.authType,
      password: formData.password || null,
      keyPath: formData.keyPath || null,
    }

    try {
      await onTest(testConfig)
      setIsTesting(false)
      return { success: true }
    } catch (error) {
      setIsTesting(false)
      return { success: false, reason: 'error', error }
    }
  }, [formData, selectedConnection, onTest, t])

  const resetForm = useCallback(() => {
    setFormData(emptyForm)
    setErrors({})
    setDisplayedConnection(null)
  }, [])

  return {
    formData,
    errors,
    isSaving,
    isTesting,
    displayedConnection,
    handleChange,
    handleSave,
    handleTest,
    resetForm,
  }
}

export default useConnectionForm
