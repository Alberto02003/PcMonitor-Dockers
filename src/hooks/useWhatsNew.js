/**
 * Hook para detectar cuando la app se ha actualizado
 * y mostrar el modal "What's New" automáticamente
 */

import { useState, useEffect, useCallback } from 'react'
import { getAppVersion } from '../services/tauri.js'

const LAST_VERSION_KEY = 'app_last_version'
const WHATS_NEW_SHOWN_KEY = 'whats_new_shown_'

/**
 * Obtiene la última versión vista por el usuario
 */
function getLastSeenVersion() {
  try {
    return localStorage.getItem(LAST_VERSION_KEY)
  } catch {
    return null
  }
}

/**
 * Guarda la versión actual como vista
 */
function setLastSeenVersion(version) {
  try {
    localStorage.setItem(LAST_VERSION_KEY, version)
  } catch (err) {
    console.error('Error saving last seen version:', err)
  }
}

/**
 * Verifica si ya se mostró el "What's New" para esta versión
 */
function wasWhatsNewShown(version) {
  try {
    return localStorage.getItem(WHATS_NEW_SHOWN_KEY + version) === 'true'
  } catch {
    return false
  }
}

/**
 * Marca el "What's New" como mostrado para esta versión
 */
function markWhatsNewAsShown(version) {
  try {
    localStorage.setItem(WHATS_NEW_SHOWN_KEY + version, 'true')
  } catch (err) {
    console.error('Error marking whats new as shown:', err)
  }
}

/**
 * Compara versiones semánticas (major.minor.patch)
 * Retorna true si newVersion > oldVersion
 */
function isNewerVersion(newVersion, oldVersion) {
  if (!oldVersion) return true
  if (!newVersion) return false

  const parseVersion = (v) => {
    const cleaned = v.replace(/^v/, '') // Remover 'v' inicial si existe
    const parts = cleaned.split('.').map(Number)
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    }
  }

  const newV = parseVersion(newVersion)
  const oldV = parseVersion(oldVersion)

  if (newV.major !== oldV.major) return newV.major > oldV.major
  if (newV.minor !== oldV.minor) return newV.minor > oldV.minor
  return newV.patch > oldV.patch
}

/**
 * Hook principal
 */
export function useWhatsNew({ enabled = true, updateInfo = null } = {}) {
  const [shouldShow, setShouldShow] = useState(false)
  const [currentVersion, setCurrentVersion] = useState(null)
  const [isNewVersion, setIsNewVersion] = useState(false)

  // Detectar si la app se actualizó
  useEffect(() => {
    if (!enabled) return

    async function checkVersion() {
      try {
        const version = await getAppVersion()
        setCurrentVersion(version)

        const lastVersion = getLastSeenVersion()
        
        // Si es una versión nueva y no se ha mostrado el modal
        if (isNewerVersion(version, lastVersion)) {
          setIsNewVersion(true)
          
          // Solo mostrar si no se ha mostrado ya para esta versión
          if (!wasWhatsNewShown(version)) {
            setShouldShow(true)
          }
          
          // Actualizar la última versión vista
          setLastSeenVersion(version)
        }
      } catch (err) {
        console.error('Error checking version:', err)
      }
    }

    checkVersion()
  }, [enabled])

  // Callback para cerrar el modal
  const handleClose = useCallback(() => {
    if (currentVersion) {
      markWhatsNewAsShown(currentVersion)
    }
    setShouldShow(false)
  }, [currentVersion])

  // Callback para mostrar manualmente
  const show = useCallback(() => {
    setShouldShow(true)
  }, [])

  return {
    shouldShow,
    currentVersion,
    isNewVersion,
    updateInfo,
    onClose: handleClose,
    show,
  }
}

export default useWhatsNew
