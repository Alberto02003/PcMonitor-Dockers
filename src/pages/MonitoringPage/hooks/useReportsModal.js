/**
 * Hook para gestionar el modal de informes y la generacion de PDF
 */

import { useState, useCallback } from 'react'
import { isTauri } from '../../../services/tauri.js'

// Use same API URL as api.js service
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://192.168.1.149:3001'

/**
 * Hook que proporciona funcionalidad para el modal de informes
 * @param {string} connectionId - ID de la conexion
 */
export function useReportsModal(connectionId) {
  const [reportsOpen, setReportsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const openReports = useCallback(() => {
    setReportsOpen(true)
  }, [])

  const closeReports = useCallback(() => {
    setReportsOpen(false)
  }, [])

  /**
   * Genera un informe PDF
   */
  const generateReport = useCallback(async (config) => {
    if (!connectionId) return { success: false, error: 'No connection selected' }

    setIsGenerating(true)

    try {
      if (isTauri()) {
        // En Tauri, usar el comando nativo
        const { invoke } = await import('@tauri-apps/api/core')
        
        // Primero configurar la URL de la API
        await invoke('set_api_base_url', { url: API_BASE_URL })
        
        // Generar el informe
        const result = await invoke('generate_report', { config })
        setIsGenerating(false)
        return result
      } else {
        // En navegador, solo mostrar preview de datos
        const response = await fetch(
          `${API_BASE_URL}/api/reports/full/${connectionId}?start=${config.period_start}&end=${config.period_end}`
        )
        const data = await response.json()
        
        setIsGenerating(false)
        
        // En navegador no podemos generar PDF, solo mostramos los datos
        console.log('Report data preview:', data)
        return {
          success: true,
          preview: true,
          data,
          message: 'Vista previa de datos (la generacion de PDF solo funciona en la app Tauri)'
        }
      }
    } catch (error) {
      setIsGenerating(false)
      return { success: false, error: error.toString() }
    }
  }, [connectionId])

  return {
    reportsOpen,
    openReports,
    closeReports,
    isGenerating,
    generateReport,
  }
}

export default useReportsModal
