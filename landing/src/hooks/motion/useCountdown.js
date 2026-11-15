import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/hooks/motion/useReducedMotion'

/** Timer de descanso en loop (solo decorativo, para el mockup del hero). */
export function useCountdown(total = 90, initial = 72) {
  const reduced = useReducedMotion()
  const [seconds, setSeconds] = useState(initial)

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : total)), 1000)
    return () => clearInterval(id)
  }, [total, reduced])

  return seconds
}
