import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MuscleMap } from '@/sections/student/MuscleMap'
import { stubMatchMedia } from '../../helpers/shared/matchMedia'

const PRIMARY = 'var(--color-intensity)'
const SECONDARY = 'var(--color-brand-text)'
const MUSCLE = '#343b39'
const NEUTRAL = '#232927'

const fillOf = (container, slug) => container.querySelector(`[data-part="${slug}"]`).getAttribute('fill')

describe('MuscleMap', () => {
  it('dibuja el cuerpo de la app Android (vista de frente, con todas sus partes)', () => {
    stubMatchMedia(true)
    const { container } = render(<MuscleMap />)
    const parts = [...container.querySelectorAll('[data-part]')].map((g) => g.dataset.part)
    expect(parts).toEqual(expect.arrayContaining(['chest', 'deltoids', 'biceps', 'quadriceps', 'calves', 'head']))
    expect(fillOf(container, 'head')).toBe(NEUTRAL)
  })

  it('al elegir un ejercicio pinta el principal en naranja y los secundarios en azul', async () => {
    stubMatchMedia(true)
    const { container } = render(<MuscleMap />)
    await userEvent.click(screen.getByRole('button', { name: 'Curl de bíceps' }))

    expect(fillOf(container, 'biceps')).toBe(PRIMARY)
    expect(fillOf(container, 'forearm')).toBe(SECONDARY)
    expect(fillOf(container, 'chest')).toBe(MUSCLE)
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Mapa muscular de Curl de bíceps: principal Brazos; secundarios Antebrazos',
    )
  })

  it('press de banca: pecho principal; hombros y brazos secundarios', async () => {
    stubMatchMedia(true)
    const { container } = render(<MuscleMap />)
    await userEvent.click(screen.getByRole('button', { name: 'Press de banca' }))

    expect(fillOf(container, 'chest')).toBe(PRIMARY)
    expect(fillOf(container, 'deltoids')).toBe(SECONDARY)
    expect(fillOf(container, 'triceps')).toBe(SECONDARY)
    expect(fillOf(container, 'quadriceps')).toBe(MUSCLE)
  })
})
