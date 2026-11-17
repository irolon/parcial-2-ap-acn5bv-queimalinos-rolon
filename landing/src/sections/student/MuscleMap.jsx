import { useEffect, useState } from 'react'
import { exercises, muscleNames } from '@/data/student/student'
import { useReducedMotion } from '@/hooks/motion/useReducedMotion'
import { Card } from '@/components/ui/Card'
import { BodyFigure } from '@/sections/student/BodyFigure'

export function MuscleMap() {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [pinned, setPinned] = useState(false)

  // Recorre los ejercicios solo hasta que el usuario elige uno.
  useEffect(() => {
    if (reduced || pinned) return
    const id = setInterval(() => setIndex((i) => (i + 1) % exercises.length), 2600)
    return () => clearInterval(id)
  }, [reduced, pinned])

  const ex = exercises[index]
  const primary = ex.primary.map((k) => muscleNames[k]).join(', ')
  const secondary = ex.secondary.map((k) => muscleNames[k]).join(', ')

  return (
    <Card className="grid items-center gap-6 p-7 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="flex flex-col gap-[18px]">
        <div>
          <h2 className="text-[26px]">Mapa muscular</h2>
          <p className="mt-2 text-muted">Cada ejercicio muestra qué músculos trabaja. Tocá uno para verlo.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Elegí un ejercicio">
          {exercises.map((e, i) => (
            <button
              key={e.name}
              type="button"
              aria-pressed={i === index}
              onClick={() => { setIndex(i); setPinned(true) }}
              className={`min-h-11 cursor-pointer rounded-pill border px-4 text-sm font-medium transition-colors ${
                i === index ? 'border-intensity bg-intensity text-bg-0' : 'border-surface-2 bg-bg-2 text-bone-3 hover:border-muted hover:text-bone'
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>
        <dl className="flex flex-col gap-2 text-[15px]" aria-live="polite">
          <div className="flex items-center gap-2.5">
            <span className="size-3 rounded-pill bg-intensity" />
            <dt className="min-w-24 text-muted">Principal</dt>
            <dd className="m-0 font-semibold text-bone">{primary}</dd>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="size-3 rounded-pill bg-brand-text" />
            <dt className="min-w-24 text-muted">Secundarios</dt>
            <dd className="m-0">{secondary}</dd>
          </div>
        </dl>
      </div>
      <BodyFigure
        primary={ex.primary}
        secondary={ex.secondary}
        label={`Mapa muscular de ${ex.name}: principal ${primary}; secundarios ${secondary}`}
        className="h-[440px] w-[220px] justify-self-center"
      />
    </Card>
  )
}
