import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { stubMatchMedia } from './matchMedia'

// jsdom no trae matchMedia ni implementa scrollTo (el Layout sube al tope en cada cambio de página).
beforeEach(() => {
  stubMatchMedia(false)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
