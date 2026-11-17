import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderAt } from '../../helpers/shared/renderAt'

const SIGNUP = 'http://localhost:5173/registro'
const LOGIN = 'http://localhost:5173/login'
const banner = () => within(screen.getByRole('banner'))

describe('Navbar', () => {
  it('lleva a las cinco secciones de la landing', () => {
    renderAt('/')
    const nav = within(screen.getByRole('navigation', { name: 'Secciones' }))
    expect(nav.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/entrenadores',
      '/alumnos',
      '/ia',
      '/por-que',
      '/planes',
    ])
  })

  it('marca la sección actual', () => {
    renderAt('/ia')
    expect(screen.getByRole('link', { name: 'Asistentes IA' })).toHaveAttribute('aria-current', 'page')
  })

  it('el único botón de cuenta es "Iniciar sesión", al login de la web de la app (:5173)', () => {
    renderAt('/')
    expect(banner().getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', LOGIN)
    expect(banner().getAllByRole('link').filter((a) => a.getAttribute('href').startsWith('http'))).toHaveLength(1)
  })

  // Por ahora no se ofrece crear cuenta (pedido de Igna, 15/11): ningún link al registro en ninguna página.
  it.each(['/', '/entrenadores', '/alumnos', '/ia', '/por-que', '/planes'])('%s no tiene links al registro', (path) => {
    renderAt(path)
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).not.toContain(SIGNUP)
    expect(screen.queryByRole('link', { name: /Empezá gratis|Ya tengo cuenta/ })).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Iniciar sesión' }).length).toBeGreaterThan(0)
  })
})
