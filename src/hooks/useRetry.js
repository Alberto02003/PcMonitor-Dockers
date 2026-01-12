/**
 * Hook para manejar reintentos con backoff exponencial
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Configuracion por defecto
 */
const DEFAULT_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  resetOnSuccess: true,
}

/**
 * Hook para reintentos automaticos con backoff exponencial
 * 
 * @param {Function} asyncFn - Funcion asincrona a ejecutar
 * @param {Object} options - Opciones de configuracion
 * @param {number} options.maxRetries - Numero maximo de reintentos
 * @param {number} options.initialDelay - Delay inicial en ms
 * @param {number} options.maxDelay - Delay maximo en ms
 * @param {number} options.backoffMultiplier - Multiplicador de backoff
 * @param {boolean} options.resetOnSuccess - Resetear contador al tener exito
 * @param {Function} options.onRetry - Callback al reintentar
 * @param {Function} options.onMaxRetries - Callback al alcanzar max reintentos
 * @param {Function} options.onSuccess - Callback al tener exito
 * @param {Function} options.onError - Callback al fallar
 * 
 * @returns {Object}
 */
export function useRetry(asyncFn, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options }
  
  const [state, setState] = useState({
    isLoading: false,
    isRetrying: false,
    error: null,
    retryCount: 0,
    nextRetryIn: 0,
  })

  const timeoutRef = useRef(null)
  const countdownRef = useRef(null)
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef(null)

  // Limpiar al desmontar
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      clearTimeout(timeoutRef.current)
      clearInterval(countdownRef.current)
      abortControllerRef.current?.abort()
    }
  }, [])

  /**
   * Calcular delay con backoff exponencial
   */
  const calculateDelay = useCallback((attempt) => {
    const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt)
    return Math.min(delay, config.maxDelay)
  }, [config.initialDelay, config.backoffMultiplier, config.maxDelay])

  /**
   * Ejecutar la funcion con reintentos
   */
  const execute = useCallback(async (...args) => {
    // Cancelar operacion anterior si existe
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    
    clearTimeout(timeoutRef.current)
    clearInterval(countdownRef.current)

    setState(prev => ({
      ...prev,
      isLoading: true,
      isRetrying: false,
      error: null,
    }))

    try {
      const result = await asyncFn(...args, { signal: abortControllerRef.current.signal })
      
      if (!isMountedRef.current) return

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        retryCount: config.resetOnSuccess ? 0 : prev.retryCount,
      }))

      config.onSuccess?.(result)
      return result
    } catch (error) {
      if (!isMountedRef.current) return
      if (error.name === 'AbortError') return

      setState(prev => ({
        ...prev,
        isLoading: false,
        error,
      }))

      config.onError?.(error)
      throw error
    }
  }, [asyncFn, config])

  /**
   * Programar un reintento
   */
  const scheduleRetry = useCallback((...args) => {
    if (state.retryCount >= config.maxRetries) {
      config.onMaxRetries?.(state.error)
      return
    }

    const delay = calculateDelay(state.retryCount)
    const delaySeconds = Math.ceil(delay / 1000)

    setState(prev => ({
      ...prev,
      isRetrying: true,
      nextRetryIn: delaySeconds,
    }))

    // Countdown
    countdownRef.current = setInterval(() => {
      if (!isMountedRef.current) return
      setState(prev => {
        if (prev.nextRetryIn <= 1) {
          clearInterval(countdownRef.current)
          return { ...prev, nextRetryIn: 0 }
        }
        return { ...prev, nextRetryIn: prev.nextRetryIn - 1 }
      })
    }, 1000)

    // Programar reintento
    timeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return
      
      clearInterval(countdownRef.current)
      
      setState(prev => ({
        ...prev,
        retryCount: prev.retryCount + 1,
        nextRetryIn: 0,
      }))

      config.onRetry?.(state.retryCount + 1)

      try {
        await execute(...args)
      } catch {
        // El error ya se maneja en execute
        // Programar siguiente reintento si aplica
        if (state.retryCount + 1 < config.maxRetries) {
          scheduleRetry(...args)
        }
      }
    }, delay)
  }, [state.retryCount, state.error, config, calculateDelay, execute])

  /**
   * Cancelar reintentos pendientes
   */
  const cancel = useCallback(() => {
    clearTimeout(timeoutRef.current)
    clearInterval(countdownRef.current)
    abortControllerRef.current?.abort()
    
    setState(prev => ({
      ...prev,
      isLoading: false,
      isRetrying: false,
      nextRetryIn: 0,
    }))
  }, [])

  /**
   * Resetear estado
   */
  const reset = useCallback(() => {
    cancel()
    setState({
      isLoading: false,
      isRetrying: false,
      error: null,
      retryCount: 0,
      nextRetryIn: 0,
    })
  }, [cancel])

  /**
   * Forzar reintento inmediato
   */
  const retryNow = useCallback((...args) => {
    cancel()
    setState(prev => ({
      ...prev,
      retryCount: 0,
    }))
    return execute(...args)
  }, [cancel, execute])

  return {
    ...state,
    execute,
    scheduleRetry,
    cancel,
    reset,
    retryNow,
    canRetry: state.retryCount < config.maxRetries,
    retriesRemaining: config.maxRetries - state.retryCount,
  }
}

export default useRetry
