import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { useInView } from '@/hooks/motion/useInView'

function Probe() {
  const [ref, visible] = useInView()
  return <div ref={ref}>{visible ? 'visible' : 'oculto'}</div>
}

describe('useInView', () => {
  it('sin IntersectionObserver muestra todo de entrada', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(<Probe />)
    expect(screen.getByText('visible')).toBeInTheDocument()
  })

  it('se vuelve visible cuando el elemento entra en pantalla y deja de observar', () => {
    let notify
    const disconnect = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb) {
          notify = cb
        }
        observe() {}
        disconnect = disconnect
      },
    )
    render(<Probe />)
    expect(screen.getByText('oculto')).toBeInTheDocument()
    act(() => notify([{ isIntersecting: true }]))
    expect(screen.getByText('visible')).toBeInTheDocument()
    expect(disconnect).toHaveBeenCalled()
  })
})
