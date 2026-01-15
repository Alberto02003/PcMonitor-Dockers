/**
 * Hook for managing alert history with localStorage persistence
 * Keeps track of last 20 triggered alerts
 */

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'pcmonitor_alert_history'
const MAX_HISTORY_SIZE = 20

/**
 * Get alert history from localStorage
 */
function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const history = JSON.parse(stored)
      // Validate structure
      if (Array.isArray(history)) {
        return history
      }
    }
  } catch (error) {
    console.error('Error loading alert history:', error)
  }
  return []
}

/**
 * Save alert history to localStorage
 */
function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch (error) {
    console.error('Error saving alert history:', error)
  }
}

export function useAlertHistory() {
  const [history, setHistory] = useState(loadHistory)

  // Save to localStorage whenever history changes
  useEffect(() => {
    saveHistory(history)
  }, [history])

  /**
   * Add a new alert to history
   * @param {Object} alert - Alert object
   * @param {string} alert.type - Alert type (e.g., 'cpuUsage', 'ramUsage')
   * @param {string} alert.label - Human-readable label
   * @param {number} alert.value - Current value
   * @param {number} alert.threshold - Threshold value
   * @param {string} alert.unit - Unit (e.g., '%', 'C')
   * @param {string} alert.connectionId - Connection ID
   * @param {string} alert.connectionName - Connection name
   */
  const addAlert = useCallback((alert) => {
    const newAlert = {
      ...alert,
      timestamp: new Date().toISOString(),
      id: `${alert.type}-${Date.now()}`,
    }

    setHistory(prev => {
      const updated = [newAlert, ...prev]
      // Keep only last MAX_HISTORY_SIZE alerts
      return updated.slice(0, MAX_HISTORY_SIZE)
    })
  }, [])

  /**
   * Clear all alert history
   */
  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  /**
   * Remove specific alert from history
   */
  const removeAlert = useCallback((alertId) => {
    setHistory(prev => prev.filter(alert => alert.id !== alertId))
  }, [])

  /**
   * Get alerts filtered by connection
   */
  const getAlertsByConnection = useCallback((connectionId) => {
    return history.filter(alert => alert.connectionId === connectionId)
  }, [history])

  return {
    history,
    addAlert,
    clearHistory,
    removeAlert,
    getAlertsByConnection,
  }
}
