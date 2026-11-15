import body from '@/data/student/body-map/bodyFront.json'
import { NEUTRAL_PARTS, groupOfPart } from '@/data/student/bodyParts'

// Mismos tonos que el mapa muscular de la app Android (FtColors.BodyMuscle / BodyNeutral / BodyOutline).
const MUSCLE = '#343b39'
const NEUTRAL = '#232927'
const OUTLINE = '#3a4240'
const PRIMARY = 'var(--color-intensity)'
const SECONDARY = 'var(--color-brand-text)'

/** Cuerpo de frente con los grupos `primary` en naranja y los `secondary` en azul. */
export function BodyFigure({ primary, secondary, label, className = '' }) {
  const fillFor = (slug) => {
    if (NEUTRAL_PARTS.includes(slug)) return NEUTRAL
    const group = groupOfPart(slug)
    if (primary.includes(group)) return PRIMARY
    if (secondary.includes(group)) return SECONDARY
    return MUSCLE
  }

  return (
    <svg viewBox={body.viewBox.join(' ')} className={className} role="img" aria-label={label}>
      {body.parts.map(({ slug, paths }) => (
        <g
          key={slug}
          data-part={slug}
          fill={fillFor(slug)}
          stroke="var(--color-bg-1)"
          strokeWidth="3"
          className={`transition-[fill] duration-450 ${primary.includes(groupOfPart(slug)) ? 'animate-pulse-soft' : ''}`}
        >
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      ))}
      <path d={body.outline} fill="none" stroke={OUTLINE} strokeWidth="2" />
    </svg>
  )
}
