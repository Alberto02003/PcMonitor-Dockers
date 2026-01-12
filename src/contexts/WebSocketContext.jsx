import { createContext, useContext, useEffect, useRef } from 'react'
import { useWebSocket, WS_STATE } from '../hooks/useWebSocket.js'
import { isTauri } from '../services/tauri.js'

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const ws = useWebSocket()
  const hasConnected = useRef(false)

  // Auto-connect when in Tauri
  useEffect(() => {
    if (isTauri() && !hasConnected.current) {
      hasConnected.current = true
      ws.connect()
    }

    return () => {
      ws.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWs() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWs must be used within a WebSocketProvider')
  }
  return context
}

// eslint-disable-next-line react-refresh/only-export-components
export { WS_STATE }
