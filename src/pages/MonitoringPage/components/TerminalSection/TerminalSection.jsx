import { useState, useCallback, useRef, useEffect } from 'react'
import { isTauri } from '../../../../services/tauri.js'
import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './TerminalSection.css'

function TerminalSection({ 
  connectionId, 
  serverHost, 
  history, 
  setHistory, 
  commandHistory, 
  setCommandHistory,
  isPoppedOut = false,
  onPopout,
  onPopIn 
}) {
  const { t } = useTranslation()
  const [command, setCommand] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [historyIndex, setHistoryIndex] = useState(-1)
  const terminalRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const executeCommand = useCallback(async (cmd) => {
    if (!cmd.trim() || !connectionId) return

    const trimmedCmd = cmd.trim()
    
    // Add command to history display
    setHistory(prev => [...prev, { type: 'command', content: trimmedCmd }])
    
    // Add to command history for up/down navigation
    setCommandHistory(prev => [...prev, trimmedCmd])
    setHistoryIndex(-1)
    setCommand('')
    setIsExecuting(true)

    try {
      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core')
        
        const result = await invoke('ssh_execute', {
          connectionId,
          command: trimmedCmd,
        })

        // Add all output at once for better performance
        setHistory(prev => {
          const newEntries = []
          if (result.stdout) {
            newEntries.push({ type: 'stdout', content: result.stdout })
          }
          if (result.stderr) {
            newEntries.push({ type: 'stderr', content: result.stderr })
          }
          if (result.exitCode !== 0) {
            newEntries.push({ type: 'info', content: `[exit: ${result.exitCode}]` })
          }
          return [...prev, ...newEntries]
        })
      } else {
        setHistory(prev => [...prev, { 
          type: 'info', 
          content: t('terminal.tauriOnly')
        }])
      }
    } catch (error) {
      setHistory(prev => [...prev, { 
        type: 'error', 
        content: `Error: ${error}` 
      }])
    } finally {
      setIsExecuting(false)
      // Use setTimeout to ensure focus happens after React re-render
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
  }, [connectionId])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      executeCommand(command)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '')
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCommand('')
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      // Ctrl+C - clear current input
      setCommand('')
      setHistory(prev => [...prev, { type: 'info', content: '^C' }])
    } else if (e.key === 'l' && e.ctrlKey) {
      // Ctrl+L - clear terminal
      e.preventDefault()
      setHistory([])
    }
  }, [command, commandHistory, historyIndex, executeCommand])

  const handleClear = useCallback(() => {
    setHistory([])
  }, [])

  const handleTerminalClick = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <div className="terminal-section">
      <div className="terminal-container">
        <div className="terminal-header-bar">
          <div className="terminal-dots">
            <span className="dot dot-red"></span>
            <span className="dot dot-yellow"></span>
            <span className="dot dot-green"></span>
          </div>
          <span className="terminal-title">
            {serverHost ? `SSH: ${serverHost}` : t('terminal.title')}
          </span>
          <div className="terminal-actions">
            <button 
              type="button" 
              className="terminal-action-btn"
              onClick={handleClear}
              title={t('terminal.clearTerminal')}
            >
              {t('terminal.clear')}
            </button>
            {onPopout && !isPoppedOut && (
              <button 
                type="button" 
                className="terminal-action-btn terminal-popout-btn"
                onClick={onPopout}
                title={t('terminal.openExternal')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            )}
            {onPopIn && isPoppedOut && (
              <button 
                type="button" 
                className="terminal-action-btn terminal-popin-btn"
                onClick={onPopIn}
                title={t('terminal.returnToMain')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div 
          className="terminal-output" 
          ref={terminalRef}
          onClick={handleTerminalClick}
        >
          {/* Welcome message */}
          {history.length === 0 && (
            <div className="terminal-welcome">
              <p>{t('terminal.connectedTo')} <span className="highlight">{serverHost || t('terminal.server')}</span></p>
              <p className="hint">{t('terminal.typeCommand')}</p>
              <p className="hint">{t('terminal.shortcuts')}</p>
            </div>
          )}

          {/* Command history */}
          {history.map((entry, index) => (
            <div key={index} className={`terminal-entry terminal-${entry.type}`}>
              {entry.type === 'command' ? (
                <div className="terminal-command-line">
                  <span className="terminal-prompt">$</span>
                  <span className="terminal-cmd">{entry.content}</span>
                </div>
              ) : (
                <pre className="terminal-output-text">{entry.content}</pre>
              )}
            </div>
          ))}

          {/* Current input line */}
          <div className="terminal-input-line">
            <span className="terminal-prompt">$</span>
            <input
              ref={inputRef}
              type="text"
              className="terminal-input"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              placeholder={isExecuting ? t('terminal.executing') : ''}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {isExecuting && <span className="terminal-spinner"></span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TerminalSection
