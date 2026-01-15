/**
 * Hook for managing alert cooldowns
 * Prevents alerts from triggering too frequently
 */

import { useRef, useCallback } from 'react'

const DEFAULT_COOLDOWN_MS = 300000 // 5 minutes

export function useAlertCooldown(cooldownMs = DEFAULT_COOLDOWN_MS) {
  // Map of alertId -> last trigger timestamp
  const cooldownMapRef = useRef(new Map())

  /**
   * Check if an alert can be triggered (not in cooldown)
   * @param {string} alertId - Unique alert identifier
   * @returns {boolean} True if alert can be triggered
   */
  const canTrigger = useCallback((alertId) => {
    const lastTrigger = cooldownMapRef.current.get(alertId)
    if (!lastTrigger) return true

    const elapsed = Date.now() - lastTrigger
    return elapsed >= cooldownMs
  }, [cooldownMs])

  /**
   * Mark an alert as triggered (start cooldown)
   * @param {string} alertId - Unique alert identifier
   */
  const markTriggered = useCallback((alertId) => {
    cooldownMapRef.current.set(alertId, Date.now())
  }, [])

  /**
   * Reset cooldown for a specific alert
   * @param {string} alertId - Unique alert identifier
   */
  const resetCooldown = useCallback((alertId) => {
    cooldownMapRef.current.delete(alertId)
  }, [])

  /**
   * Clear all cooldowns
   */
  const clearAll = useCallback(() => {
    cooldownMapRef.current.clear()
  }, [])

  /**
   * Get remaining cooldown time in milliseconds
   * @param {string} alertId - Unique alert identifier
   * @returns {number} Remaining cooldown in ms (0 if not in cooldown)
   */
  const getRemainingCooldown = useCallback((alertId) => {
    const lastTrigger = cooldownMapRef.current.get(alertId)
    if (!lastTrigger) return 0

    const elapsed = Date.now() - lastTrigger
    const remaining = cooldownMs - elapsed
    return Math.max(0, remaining)
  }, [cooldownMs])

  return {
    canTrigger,
    markTriggered,
    resetCooldown,
    clearAll,
    getRemainingCooldown,
  }
}
