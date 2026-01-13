/**
 * Hook para gestionar el orden de widgets con drag & drop
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { WIDGETS_KEY_PREFIX, defaultWidgetOrder } from '../constants/alertsConfig.js'

export function useWidgetOrder(connectionId) {
  const [widgetOrder, setWidgetOrder] = useState(defaultWidgetOrder)
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [widgetsLoaded, setWidgetsLoaded] = useState(false)

  const widgetsKey = useMemo(
    () => `${WIDGETS_KEY_PREFIX}.${connectionId || 'global'}`,
    [connectionId]
  )

  // Cargar orden desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(widgetsKey)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setWidgetOrder(parsed)
      }
    } catch {
      // Ignore invalid stored widget order
    } finally {
      setWidgetsLoaded(true)
    }
  }, [widgetsKey])

  // Guardar orden en localStorage
  useEffect(() => {
    if (!widgetsLoaded) return
    localStorage.setItem(widgetsKey, JSON.stringify(widgetOrder))
  }, [widgetsKey, widgetOrder, widgetsLoaded])

  // Event listener para finalizar drag
  useEffect(() => {
    function handlePointerUp() {
      setDraggingId(null)
      setDragOverId(null)
    }
    window.addEventListener('pointerup', handlePointerUp)
    return () => window.removeEventListener('pointerup', handlePointerUp)
  }, [])

  const handleDragStart = useCallback((id) => {
    setDraggingId(id)
  }, [])

  const handleDragEnter = useCallback((id) => {
    if (!draggingId || draggingId === id) return
    setDragOverId(id)
    setWidgetOrder((prev) => {
      const next = [...prev]
      const from = next.indexOf(draggingId)
      const to = next.indexOf(id)
      if (from === -1 || to === -1) return prev
      next.splice(from, 1)
      next.splice(to, 0, draggingId)
      return next
    })
  }, [draggingId])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    setDragOverId(null)
  }, [])

  return {
    widgetOrder,
    draggingId,
    dragOverId,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
  }
}

export default useWidgetOrder
