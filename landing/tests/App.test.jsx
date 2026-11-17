import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderAt } from './helpers/shared/renderAt'

const HOME_TITLE = 'FitTrainer — Para personal trainers independientes'
const PAGES = [
  ['/', /Tus alumnos entrenan con tu rutina/, HOME_TITLE],
  ['/entrenadores', /Todo tu método, ordenado en un panel/, 'Para entrenadores — FitTrainer'],
  ['/alumnos', /Una app que dan ganas de abrir/, 'Para alumnos — FitTrainer'],
  ['/ia', /Dos asistentes/, 'Asistentes con IA — FitTrainer'],
  ['/por-que', /Hoy tu trabajo vive en tres apps/, 'Por qué FitTrainer'],
  ['/planes', /Un plan para cada etapa de tu cartera/,'Planes y preguntas — FitTrainer'],
]

describe('App: rutas', () => {
  it.each(PAGES)('%s muestra su título y cambia el <title>', (path, heading, title) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(heading)
    expect(document.title).toBe(title)
  })

  it('una ruta desconocida cae en Inicio', () => {
    renderAt('/no-existe')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Tus alumnos entrenan con tu rutina/)
    expect(document.title).toBe(HOME_TITLE)
  })

  it('al cambiar de página sube al tope', () => {
    renderAt('/planes')
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })
})
