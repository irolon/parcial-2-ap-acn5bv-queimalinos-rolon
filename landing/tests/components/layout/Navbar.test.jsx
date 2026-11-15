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

  it('los CTAs van al registro y al login de la web de la app (:5173)', () => {
    renderAt('/')
    expect(banner().getByRole('link', { name: 'Empezá gratis' })).toHaveAttribute('href', SIGNUP)
    expect(banner().getByRole('link', { name: /Ya tengo cuenta/ })).toHaveAttribute('href', LOGIN)
  })

  it('ningún "Empezá gratis" de la página apunta a la propia landing', () => {
    renderAt('/planes')
    const ctas = screen.getAllByRole('link', { name: /Empezá gratis/ })
    expect(ctas.length).toBeGreaterThan(1)
    ctas.forEach((a) => expect(a).toHaveAttribute('href', SIGNUP))
  })
})
