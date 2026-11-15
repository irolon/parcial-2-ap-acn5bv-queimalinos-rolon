import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from '@/App'

/** Renderiza la landing entera parada en `path`. */
export const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
