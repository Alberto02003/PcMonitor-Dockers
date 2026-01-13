import { useState, useEffect, useCallback } from 'react'
import { isTauri } from '../../services/tauri.js'
import TerminalSection from '../MonitoringPage/components/TerminalSection/TerminalSection.jsx'
import './TerminalWindow.css'

function TerminalWindow() {
  const [connectionId, setConnectionId] = useState(null)
  const [serverHost, setServerHost] = useState(null)
  const [history, setHistory] = useState([])
  const [commandHistory, setCommandHistory] = useState([])

  console.log('TerminalWindow mounted, isTauri:', isTauri())

  // Listen for terminal data from main window
  useEffect(() => {
    if (!isTauri()) {
      console.log('Not in Tauri environment')
      return
    }

    let unlisten = null

    const setup = async () => {
      console.log('Setting up terminal window listeners...')
      const { listen, emit } = await import('@tauri-apps/api/event')
      
      // Listen for initial data
      unlisten = await listen('terminal-init', (event) => {
        console.log('Received terminal-init:', event.payload)
        const { connectionId: connId, serverHost: host, history: hist, commandHistory: cmdHist } = event.payload
        setConnectionId(connId)
        setServerHost(host)
        setHistory(hist || [])
        setCommandHistory(cmdHist || [])
      })

      // Notify main window that we're ready
      console.log('Emitting terminal-window-ready')
      await emit('terminal-window-ready')
    }

    setup()

    return () => {
      if (unlisten) unlisten()
    }
  }, [])

  // Sync history back to main window
  useEffect(() => {
    if (!isTauri()) return

    const syncHistory = async () => {
      const { emit } = await import('@tauri-apps/api/event')
      emit('terminal-sync', { history, commandHistory })
    }

    syncHistory()
  }, [history, commandHistory])

  // Handle pop-in (close this window and return to main)
  const handlePopIn = useCallback(async () => {
    if (!isTauri()) return

    try {
      console.log('Pop-in requested, notifying main window...')
      const { emit } = await import('@tauri-apps/api/event')
      
      // Notify main window to show terminal again and close this window
      // The main window will handle closing this window
      await emit('terminal-popin', { history, commandHistory })
      console.log('Emitted terminal-popin event, main window will close us')
    } catch (error) {
      console.error('Error in handlePopIn:', error)
    }
  }, [history, commandHistory])

  if (!connectionId) {
    return (
      <div className="terminal-window-loading">
        <span>Conectando...</span>
      </div>
    )
  }

  return (
    <div className="terminal-window">
      <TerminalSection
        connectionId={connectionId}
        serverHost={serverHost}
        history={history}
        setHistory={setHistory}
        commandHistory={commandHistory}
        setCommandHistory={setCommandHistory}
        isPoppedOut={true}
        onPopIn={handlePopIn}
      />
    </div>
  )
}

export default TerminalWindow
