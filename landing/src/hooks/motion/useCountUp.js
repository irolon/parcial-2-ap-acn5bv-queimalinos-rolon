import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/hooks/motion/useReducedMotion'

/** Cuenta de 0 a `target` cuando `start` pasa a true. */
export function useCountUp(target, { start = true, duration = 1700 } = {}) {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (reduced || !start) return
    let raf
    const t0 = performance.now()
    const step = (now) => {
      // El timestamp del primer frame puede ser anterior a t0: sin el max, el número arranca negativo.
      const k = Math.min(1, Math.max(0, (now - t0) / duration))
      const eased = 1 - Math.pow(1 - k, 3)
      setValue(target * eased)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [start, target, duration, reduced])

  // Con movimiento reducido no se anima: el número final se muestra directo.
  return reduced ? target : value
}
