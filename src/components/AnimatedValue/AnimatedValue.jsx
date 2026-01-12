/**
 * AnimatedValue - Muestra valores numericos con animacion de conteo
 */

import { useEffect, useRef, useState } from 'react'
import './AnimatedValue.css'

/**
 * @param {Object} props
 * @param {number} props.value - Valor a mostrar
 * @param {string} props.suffix - Sufijo (%, MB, etc.)
 * @param {string} props.prefix - Prefijo ($, etc.)
 * @param {number} props.decimals - Decimales a mostrar
 * @param {number} props.duration - Duracion de animacion en ms
 * @param {boolean} props.animate - Si animar cambios
 * @param {boolean} props.colorChange - Cambiar color segun direccion
 * @param {string} props.className - Clases adicionales
 */
function AnimatedValue({
  value = 0,
  suffix = '',
  prefix = '',
  decimals = 0,
  duration = 500,
  animate = true,
  colorChange = false,
  className = '',
}) {
  const [displayValue, setDisplayValue] = useState(value)
  const [direction, setDirection] = useState(null) // 'up' | 'down' | null
  const previousValueRef = useRef(value)
  const animationRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    const previousValue = previousValueRef.current
    const newValue = value

    if (previousValue === newValue) return

    // Determinar direccion del cambio
    if (colorChange) {
      setDirection(newValue > previousValue ? 'up' : 'down')
      
      // Limpiar direccion despues de la animacion
      timeoutRef.current = setTimeout(() => {
        setDirection(null)
      }, duration + 200)
    }

    if (!animate) {
      setDisplayValue(newValue)
      previousValueRef.current = newValue
      return
    }

    // Cancelar animacion anterior
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const startTime = Date.now()
    const startValue = previousValue

    const animateValue = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      const currentValue = startValue + (newValue - startValue) * easeOut
      setDisplayValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateValue)
      } else {
        setDisplayValue(newValue)
        previousValueRef.current = newValue
      }
    }

    animationRef.current = requestAnimationFrame(animateValue)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, animate, duration, colorChange])

  const formattedValue = displayValue.toFixed(decimals)
  
  const directionClass = direction ? `animated-value--${direction}` : ''

  return (
    <span className={`animated-value ${directionClass} ${className}`}>
      {prefix}
      <span className="animated-value__number">{formattedValue}</span>
      {suffix && <span className="animated-value__suffix">{suffix}</span>}
    </span>
  )
}

/**
 * Componente para mostrar bytes con conversion automatica
 */
function AnimatedBytes({
  bytes = 0,
  decimals = 1,
  ...props
}) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return (
    <AnimatedValue
      value={value}
      suffix={` ${units[unitIndex]}`}
      decimals={decimals}
      {...props}
    />
  )
}

/**
 * Componente para mostrar porcentajes con color dinamico
 */
function AnimatedPercent({
  value = 0,
  warningThreshold = 70,
  dangerThreshold = 90,
  ...props
}) {
  let colorClass = ''
  if (value >= dangerThreshold) {
    colorClass = 'animated-value--danger'
  } else if (value >= warningThreshold) {
    colorClass = 'animated-value--warning'
  }

  return (
    <AnimatedValue
      value={value}
      suffix="%"
      decimals={1}
      className={colorClass}
      {...props}
    />
  )
}

export default AnimatedValue
export { AnimatedBytes, AnimatedPercent }
