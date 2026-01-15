/**
 * Hook for detecting trends in metric values
 * Tracks metric history and detects rising/falling trends
 */

import { useRef, useCallback } from 'react'

const MAX_HISTORY_LENGTH = 6 // Keep last 6 readings (e.g., 30 seconds with 5s interval)

export function useTrendDetection() {
  // Map of metricKey -> array of {value, timestamp}
  const historyRef = useRef(new Map())

  /**
   * Record a metric value
   * @param {string} metricKey - Metric identifier (e.g., 'cpu', 'ram')
   * @param {number} value - Current metric value
   */
  const recordValue = useCallback((metricKey, value) => {
    if (value == null || typeof value !== 'number') return

    const history = historyRef.current.get(metricKey) || []
    const newEntry = { value, timestamp: Date.now() }
    
    // Add new entry and keep only last MAX_HISTORY_LENGTH entries
    const updated = [...history, newEntry].slice(-MAX_HISTORY_LENGTH)
    historyRef.current.set(metricKey, updated)
  }, [])

  /**
   * Detect if metric is trending upward
   * @param {string} metricKey - Metric identifier
   * @param {number} thresholdRate - Minimum rate of change per minute (e.g., 5 means +5%/min)
   * @returns {Object|null} Trend info or null if no trend detected
   */
  const detectRisingTrend = useCallback((metricKey, thresholdRate = 5) => {
    const history = historyRef.current.get(metricKey)
    if (!history || history.length < 3) return null

    // Calculate average rate of change over the history
    const firstEntry = history[0]
    const lastEntry = history[history.length - 1]
    
    const valueDiff = lastEntry.value - firstEntry.value
    const timeDiffMinutes = (lastEntry.timestamp - firstEntry.timestamp) / 60000
    
    if (timeDiffMinutes === 0) return null
    
    const ratePerMinute = valueDiff / timeDiffMinutes
    
    if (ratePerMinute >= thresholdRate) {
      return {
        rate: ratePerMinute,
        startValue: firstEntry.value,
        currentValue: lastEntry.value,
        duration: timeDiffMinutes,
      }
    }
    
    return null
  }, [])

  /**
   * Detect if metric is trending downward
   * @param {string} metricKey - Metric identifier
   * @param {number} thresholdRate - Minimum rate of change per minute (e.g., 5 means -5%/min)
   * @returns {Object|null} Trend info or null if no trend detected
   */
  const detectFallingTrend = useCallback((metricKey, thresholdRate = 5) => {
    const history = historyRef.current.get(metricKey)
    if (!history || history.length < 3) return null

    const firstEntry = history[0]
    const lastEntry = history[history.length - 1]
    
    const valueDiff = firstEntry.value - lastEntry.value
    const timeDiffMinutes = (lastEntry.timestamp - firstEntry.timestamp) / 60000
    
    if (timeDiffMinutes === 0) return null
    
    const ratePerMinute = valueDiff / timeDiffMinutes
    
    if (ratePerMinute >= thresholdRate) {
      return {
        rate: ratePerMinute,
        startValue: firstEntry.value,
        currentValue: lastEntry.value,
        duration: timeDiffMinutes,
      }
    }
    
    return null
  }, [])

  /**
   * Clear history for a specific metric
   * @param {string} metricKey - Metric identifier
   */
  const clearMetric = useCallback((metricKey) => {
    historyRef.current.delete(metricKey)
  }, [])

  /**
   * Clear all history
   */
  const clearAll = useCallback(() => {
    historyRef.current.clear()
  }, [])

  return {
    recordValue,
    detectRisingTrend,
    detectFallingTrend,
    clearMetric,
    clearAll,
  }
}
