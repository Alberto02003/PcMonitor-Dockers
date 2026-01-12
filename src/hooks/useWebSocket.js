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
      const socket = wsRef.current
      if (timeout) {
        clearTimeout(timeout)
      }
      if (socket) {
        socket.close()
      }
    }
  }, [])

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

/**
 * Hook to subscribe to system metrics via WebSocket
 */
export function useMetricsStream(ws, connectionId, interval = 3000) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    if (!ws.isConnected || !connectionId) {
      return
    }

    // Subscribe to metrics
    ws.send({
      type: 'subscribeMetrics',
      connectionId,
      interval,
    })

    // Listen for metrics updates
    const unsubscribeMetrics = ws.subscribe('metrics', (message) => {
      if (message.connectionId === connectionId) {
        setMetrics(message.data)
        setLastUpdate(new Date())
        setLoading(false)
        setError(null)
      }
    })

    // Listen for errors
    const unsubscribeError = ws.subscribe('error', (message) => {
      if (message.connectionId === connectionId || message.connectionId === null) {
        setError(message.message)
        setLoading(false)
      }
    })

    return () => {
      // Unsubscribe on cleanup
      ws.send({
        type: 'unsubscribeMetrics',
        connectionId,
      })
      unsubscribeMetrics()
      unsubscribeError()
    }
  }, [ws, connectionId, interval])

  return { metrics, loading, error, lastUpdate }
}

/**
 * Hook to subscribe to Docker containers via WebSocket
 */
export function useContainersStream(ws, connectionId, interval = 5000) {
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!ws.isConnected || !connectionId) {
      return
    }

    // Subscribe to containers
    ws.send({
      type: 'subscribeContainers',
      connectionId,
      interval,
    })

    // Listen for container updates
    const unsubscribeContainers = ws.subscribe('containers', (message) => {
      if (message.connectionId === connectionId) {
        setContainers(message.data)
        setLoading(false)
        setError(null)
      }
    })

    // Listen for errors
    const unsubscribeError = ws.subscribe('error', (message) => {
      if (message.connectionId === connectionId || message.connectionId === null) {
        setError(message.message)
        setLoading(false)
      }
    })

    return () => {
      ws.send({
        type: 'unsubscribeContainers',
        connectionId,
      })
      unsubscribeContainers()
      unsubscribeError()
    }
  }, [ws, connectionId, interval])

  return { containers, loading, error }
}

/**
 * Hook to subscribe to Docker logs via WebSocket (real-time streaming)
 */
export function useLogsStream(ws, connectionId, containerId) {
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)
  const prevContainerIdRef = useRef(null)

  // Clear logs when container changes (separate effect)
  useEffect(() => {
    if (prevContainerIdRef.current !== containerId && containerId) {
      prevContainerIdRef.current = containerId
    }
  }, [containerId])

  useEffect(() => {
    if (!ws.isConnected || !connectionId || !containerId) {
      return
    }

    // Subscribe to logs
    ws.send({
      type: 'subscribeLogs',
      connectionId,
      containerId,
    })

    // Listen for log lines
    const unsubscribeLogs = ws.subscribe('dockerLog', (message) => {
      if (message.connectionId === connectionId && message.containerId === containerId) {
        setLogs((prev) => {
          // Keep only last 500 lines
          const newLogs = [...prev, message.line]
          if (newLogs.length > 500) {
            return newLogs.slice(-500)
          }
          return newLogs
        })
      }
    })

    // Listen for errors
    const unsubscribeError = ws.subscribe('error', (message) => {
      if (message.connectionId === connectionId) {
        setError(message.message)
      }
    })

    return () => {
      ws.send({
        type: 'unsubscribeLogs',
        connectionId,
        containerId,
      })
      unsubscribeLogs()
      unsubscribeError()
    }
  }, [ws, connectionId, containerId])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return { logs, error, clearLogs }
}
