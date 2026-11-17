import { Link } from 'react-router'
import { Icon } from '@/components/ui/Icon'

export function Logo({ hideNameOnSmall = false }) {
  return (
    <Link to="/" aria-label="FitTrainer, inicio" className="inline-flex min-h-11 items-center gap-2.5 text-bone no-underline">
      <span className="grid size-9 place-items-center rounded-chip bg-brand text-white">
        <Icon name="dumbbell" className="size-[22px]" strokeWidth={2.2} />
      </span>
      <span className={`font-display text-lg font-bold tracking-[-0.02em] md:text-xl ${hideNameOnSmall ? 'max-[440px]:hidden' : ''}`}>
        FitTrainer
      </span>
    </Link>
  )
}
