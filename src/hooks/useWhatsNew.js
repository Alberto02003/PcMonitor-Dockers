/**
 * Hook to detect when the app has been updated
 * and trigger the "What's New" modal automatically
 */

import { useState, useEffect, useCallback } from 'react'
import { getAppVersion } from '../services/tauri.js'

const LAST_VERSION_KEY = 'app_last_version'
const WHATS_NEW_SHOWN_KEY = 'whats_new_shown_'

function getLastSeenVersion() {
  try { return localStorage.getItem(LAST_VERSION_KEY) } catch { return null }
}

function setLastSeenVersion(version) {
  try { localStorage.setItem(LAST_VERSION_KEY, version) } catch { /* ignore */ }
}

function wasWhatsNewShown(version) {
  try { return localStorage.getItem(WHATS_NEW_SHOWN_KEY + version) === 'true' } catch { return false }
}

function markWhatsNewAsShown(version) {
  try { localStorage.setItem(WHATS_NEW_SHOWN_KEY + version, 'true') } catch { /* ignore */ }
}

function getReleaseNotes(version) {
  try { return localStorage.getItem(`release_notes_${version}`) } catch { return null }
}

function clearReleaseNotes(version) {
  try { localStorage.removeItem(`release_notes_${version}`) } catch { /* ignore */ }
}

function isNewerVersion(newVersion, oldVersion) {
  if (!oldVersion) return true
  if (!newVersion) return false

  const parse = (v) => {
    const parts = v.replace(/^v/, '').split('.').map(Number)
    return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 }
  }

  const n = parse(newVersion)
  const o = parse(oldVersion)

  if (n.major !== o.major) return n.major > o.major
  if (n.minor !== o.minor) return n.minor > o.minor
  return n.patch > o.patch
}

export function useWhatsNew({ enabled = true } = {}) {
  const [shouldShow, setShouldShow] = useState(false)
  const [currentVersion, setCurrentVersion] = useState(null)
  const [releaseNotes, setReleaseNotes] = useState(null)

  useEffect(() => {
    if (!enabled) return

    async function checkVersion() {
      try {
        const version = await getAppVersion()
        setCurrentVersion(version)

        const lastVersion = getLastSeenVersion()

        if (isNewerVersion(version, lastVersion)) {
          const notes = getReleaseNotes(version)
          if (notes) setReleaseNotes(notes)

          if (!wasWhatsNewShown(version)) {
            setShouldShow(true)
          }

          setLastSeenVersion(version)
        }
      } catch (err) {
        console.error('Error checking version:', err)
      }
    }

    checkVersion()
  }, [enabled])

  const handleClose = useCallback(() => {
    if (currentVersion) {
      markWhatsNewAsShown(currentVersion)
      clearReleaseNotes(currentVersion)
    }
    setShouldShow(false)
  }, [currentVersion])

  return {
    shouldShow,
    currentVersion,
    releaseNotes,
    onClose: handleClose,
  }
}

export default useWhatsNew
