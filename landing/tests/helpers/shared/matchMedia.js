import { vi } from 'vitest'

/** `reduced` = si el usuario pidió movimiento reducido (prefers-reduced-motion: reduce). */
export function stubMatchMedia(reduced) {
  vi.stubGlobal('matchMedia', (query) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}
