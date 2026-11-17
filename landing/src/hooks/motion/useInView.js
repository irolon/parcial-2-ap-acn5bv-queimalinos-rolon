import { useEffect, useRef, useState } from 'react'

/** Devuelve [ref, visible]. Se dispara una sola vez. */
export function useInView({ rootMargin = '0px 0px -12% 0px' } = {}) {
  const ref = useRef(null)
  // Sin IntersectionObserver (navegador viejo) se muestra todo de entrada.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin, threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin, visible])

  return [ref, visible]
}
