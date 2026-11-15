import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCountUp } from '@/hooks/motion/useCountUp'
import { stubMatchMedia } from '../../helpers/shared/matchMedia'

describe('useCountUp', () => {
  it('arranca en 0 y no se mueve mientras start es false', () => {
    const { result } = renderHook(() => useCountUp(120, { start: false }))
    expect(result.current).toBe(0)
  })

  // rAF controlado a mano: el reloj de jsdom no coincide con performance.now().
  it('con start llega al número final y nunca muestra un número negativo', () => {
    const t0 = performance.now()
    const frames = []
    vi.stubGlobal('requestAnimationFrame', (cb) => frames.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const { result } = renderHook(() => useCountUp(120, { duration: 100 }))
    act(() => frames.shift()(t0 - 500))
    expect(result.current).toBe(0)
    act(() => frames.shift()(performance.now() + 100))
    expect(result.current).toBe(120)
  })

  it('con movimiento reducido muestra el número final de entrada, sin animar', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useCountUp(120, { start: false }))
    expect(result.current).toBe(120)
  })
})
