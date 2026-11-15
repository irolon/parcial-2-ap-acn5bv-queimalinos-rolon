import { Icon } from '@/components/ui/Icon'

/** Ícono dentro de un cuadrado redondeado. `tone` = color semántico. */
const tones = {
  neutral: 'bg-surface-1 text-bone',
  brand: 'bg-brand text-white',
  intensity: 'bg-intensity/14 text-intensity',
  info: 'bg-info/12 text-info',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
}

export function IconTile({ name, tone = 'neutral', size = 'md' }) {
  const dims = size === 'lg' ? 'size-12 rounded-panel' : 'size-[42px] rounded-field'
  return (
    <span className={`grid place-items-center ${dims} ${tones[tone]}`}>
      <Icon name={name} />
    </span>
  )
}
