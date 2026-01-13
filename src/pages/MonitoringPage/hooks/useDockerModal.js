/**
 * Hook para gestionar el estado del modal de Docker
 */

import { useState, useCallback } from 'react'

/**
 * Hook que gestiona el estado del modal de detalles de Docker
 * @returns {Object} Estado y funciones para el modal de Docker
 */
export function useDockerModal() {
  const [dockerModalOpen, setDockerModalOpen] = useState(false)
  const [activeDocker, setActiveDocker] = useState(null)
  const [dockerPanel, setDockerPanel] = useState('metrics')

  const openDocker = useCallback((container) => {
    setActiveDocker(container)
    setDockerPanel('metrics')
    setDockerModalOpen(true)
  }, [])

  const closeDocker = useCallback(() => {
    setDockerModalOpen(false)
  }, [])

  const changePanel = useCallback((panel) => {
    setDockerPanel(panel)
  }, [])

  return {
    dockerModalOpen,
    activeDocker,
    dockerPanel,
    openDocker,
    closeDocker,
    changePanel,
  }
}

export default useDockerModal
