import { useMemo, useState } from 'react'
import { progressSeries } from '@/data/trainer/trainer'
import { formatNumber } from '@/data/shared/format'

const W = 560
const H = 220

function buildPath(values) {
  let min = Math.min(...values)
  let max = Math.max(...values)
  const pad = (max - min) * 0.18 || 1
  min -= pad
  max += pad
  const pts = values.map((v, i) => [
    Math.round(16 + i * ((W - 32) / (values.length - 1))),
    Math.round(12 + 192 * (1 - (v - min) / (max - min))),
  ])
  const d = 'M' + pts.map((p) => p.join(' ')).join(' L')
  const [lx, ly] = pts[pts.length - 1]
  return { d, area: `${d} L${lx} 216 L${pts[0][0]} 216 Z`, cx: lx, cy: ly }
}

export function ProgressChart() {
  const [active, setActive] = useState(0)
  const s = progressSeries[active]
  const geo = useMemo(() => buildPath(s.values), [s])
  const first = formatNumber(s.values[0], s.decimals)
  const last = formatNumber(s.values.at(-1), s.decimals)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de gráfico de progreso">
        {progressSeries.map((p, i) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            className={`min-h-11 cursor-pointer rounded-pill border px-4 text-sm font-medium transition-colors ${
              i === active ? 'border-bone bg-bone text-bg-0' : 'border-surface-2 text-bone-3 hover:border-muted hover:text-bone'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="rounded-panel border border-surface-1 bg-bg-2 px-4 pt-4 pb-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="text-sm text-muted">{s.title}</span>
          <span>
            <span className="font-mono text-[26px] font-medium text-bone">{last}</span>
            <span className="ml-1.5 font-mono text-[13px] text-muted">{s.unit}</span>
          </span>
        </div>
        {/* key={s.key}: remonta el SVG para que la línea se vuelva a dibujar al cambiar de pestaña */}
        <svg key={s.key} viewBox={`0 0 ${W} ${H}`} className="mt-2 block h-auto w-full" role="img" aria-label={`${s.title}: de ${first} a ${last} ${s.unit} en 8 semanas`}>
          <path d="M0 50H560M0 100H560M0 150H560" stroke="var(--color-surface-1)" strokeWidth="1" />
          <path d={geo.area} fill="rgb(41 82 217 / 0.14)" className="animate-rise [animation-delay:1.2s]" />
          <path d={geo.d} fill="none" stroke="var(--color-brand-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="draw-line" />
          <circle cx={geo.cx} cy={geo.cy} r="7" fill={s.dot} />
        </svg>
        <div className="flex justify-between px-1 pt-1 font-mono text-[11px] text-muted">
          <span>Sem 1</span><span>Sem 4</span><span>Sem 8</span>
        </div>
      </div>
    </div>
  )
}
