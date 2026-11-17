import { useCountdown } from '@/hooks/motion/useCountdown'
import { formatClock } from '@/data/shared/format'
import { Icon } from '@/components/ui/Icon'
import { PhoneFrame } from '@/components/mockups/PhoneFrame'

const REST = 90
const CIRC = 2 * Math.PI * 52

const sets = [
  { n: 1, load: '70 kg × 10', done: true },
  { n: 2, load: '75 kg × 8', done: true },
  { n: 3, load: '80 kg × 8', current: true },
  { n: 4, load: '80 kg × 8' },
]

export function ActiveSessionPhone() {
  const seconds = useCountdown(REST, 72)
  const offset = CIRC * (1 - seconds / REST)

  return (
    <PhoneFrame label="App del alumno con una sesión activa y el timer de descanso corriendo">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted">DÍA A · PIERNAS</span>
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-info/12 px-2 py-0.5 text-[10px] text-info">
          <span className="size-1.5 animate-blink rounded-pill bg-info" />
          Sin conexión
        </span>
      </div>
      <div>
        <div className="font-display text-xl leading-tight font-semibold text-bone">Sentadilla con barra</div>
        <div className="mt-0.5 text-xs text-muted">Serie 3 de 4</div>
      </div>
      <div className="flex flex-col gap-1">
        {sets.map((s) => (
          <div
            key={s.n}
            className={`grid grid-cols-[22px_1fr_auto] items-center gap-2 rounded-chip px-2.5 py-2 text-[13px] ${
              s.current ? 'border border-surface-2 bg-bg-2 text-bone' : 'text-muted'
            }`}
          >
            <span className={`font-mono ${s.current ? 'text-intensity' : ''}`}>{s.n}</span>
            <span className="font-mono">{s.load}</span>
            {s.done && <Icon name="check" className="size-4 text-success" />}
            {s.current && <span className="text-[11px] text-intensity">Ahora</span>}
            {!s.done && !s.current && <span />}
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2 rounded-card border border-surface-1 bg-bg-1 px-2.5 py-3.5">
        <div className="relative size-32">
          <svg viewBox="0 0 120 120" className="size-32 -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-surface-1)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none" stroke="var(--color-brand)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[28px] font-medium text-bone" aria-live="off">{formatClock(seconds)}</span>
            <span className="text-[10px] tracking-[0.08em] text-muted">DESCANSO</span>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="rounded-pill border border-surface-2 px-3 py-1 font-mono text-xs text-bone-3">−15 s</span>
          <span className="rounded-pill border border-surface-2 px-3 py-1 font-mono text-xs text-bone-3">+15 s</span>
        </div>
      </div>
      <div className="rounded-field bg-brand p-2.5 text-center text-sm font-semibold text-white">Registrar serie</div>
    </PhoneFrame>
  )
}
