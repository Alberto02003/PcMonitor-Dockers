import { useCallback, useEffect, useRef, useState } from 'react'
import { wsStart, wsStop, isTauri } from '../services/tauri.js'

/**
 * WebSocket connection states
 */
export const WS_STATE = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
}

/**
 * Hook to manage WebSocket connection for real-time data
 */
export function useWebSocket() {
  const [state, setState] = useState(WS_STATE.DISCONNECTED)
  const [error, setError] = useState(null)
  const [port, setPort] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const listenersRef = useRef(new Map())

  const handleMessage = useCallback((message) => {
    const { type } = message

    // Notify all listeners for this message type
    const listeners = listenersRef.current.get(type) || []
    listeners.forEach((callback) => callback(message))

    // Also notify wildcard listeners
    const wildcardListeners = listenersRef.current.get('*') || []
    wildcardListeners.forEach((callback) => callback(message))
  }, [])

  const connect = useCallback(async () => {
    if (!isTauri()) {
      setError('WebSocket only available in Tauri app')
      setState(WS_STATE.ERROR)
      return
    }

    try {
      setState(WS_STATE.CONNECTING)
      setError(null)

      // Start WebSocket server in backend
      const wsPort = await wsStart()
      setPort(wsPort)

      // Connect to WebSocket
      const ws = new WebSocket(`ws://127.0.0.1:${wsPort}`)
      wsRef.current = ws

      ws.onopen = () => {
        setState(WS_STATE.CONNECTED)
        setError(null)
      }

      ws.onclose = () => {
        setState(WS_STATE.DISCONNECTED)
        wsRef.current = null
      }

      ws.onerror = () => {
        setError('WebSocket connection error')
        setState(WS_STATE.ERROR)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }
    } catch (e) {
      setError(e.toString())
      setState(WS_STATE.ERROR)
    }
  }, [handleMessage])

  const disconnect = useCallback(async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    try {
      await wsStop()
    } catch (e) {
      console.error('Failed to stop WebSocket server:', e)
    }

    setState(WS_STATE.DISCONNECTED)
    setPort(null)
  }, [])

  const send = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    return false
  }, [])

  const subscribe = useCallback((messageType, callback) => {
    if (!listenersRef.current.has(messageType)) {
      listenersRef.current.set(messageType, [])
    }
    listenersRef.current.get(messageType).push(callback)

    // Return unsubscribe function
    return () => {
      const listeners = listenersRef.current.get(messageType)
      if (listeners) {
        const index = listeners.indexOf(callback)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Copy refs to local variables for cleanup
      const timeout = reconnectTimeoutRef.current
      if (timeout) {
        clearTimeout(timeout)
      }
      // Use disconnect() to also shut down the backend WebSocket server
      disconnect()
    }
  }, [disconnect])

  return {
    state,
    error,
    port,
    connect,
    disconnect,
    send,
    subscribe,
    isConnected: state === WS_STATE.CONNECTED,
  }
}
