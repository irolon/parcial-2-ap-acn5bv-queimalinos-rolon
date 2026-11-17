import { Link } from 'react-router'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'

/** Tarjeta "Siguiente" al pie de cada página interna. */
export function NextPage({ to, label }) {
  return (
    <Reveal className="mt-14">
      <Link
        to={to}
        className="flex flex-wrap items-center justify-between gap-6 rounded-card border border-surface-1 bg-bg-1 p-6 no-underline transition-colors hover:border-brand-text hover:bg-bg-2 md:p-8"
      >
        <span>
          <small className="block font-mono text-xs uppercase tracking-[0.08em] text-muted">Siguiente</small>
          <b className="font-display text-[22px] font-semibold tracking-[-0.02em] text-bone md:text-[28px]">{label}</b>
        </span>
        <span className="grid size-14 place-items-center rounded-pill bg-brand text-white">
          <Icon name="arrowRight" />
        </span>
      </Link>
    </Reveal>
  )
}
