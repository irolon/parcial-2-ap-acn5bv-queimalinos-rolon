import { useInView } from '@/hooks/motion/useInView'
import { useCountUp } from '@/hooks/motion/useCountUp'
import { formatNumber } from '@/data/shared/format'
import { Card } from '@/components/ui/Card'

function Stat({ label, target, decimals = 0, unit, start, valueCls = 'text-bone' }) {
  const v = useCountUp(target, { start })
  const shown = decimals ? Math.round(v * 2) / 2 : Math.round(v)
  return (
    <Card className="flex flex-col gap-1.5 p-7">
      <span className="text-[15px] text-muted">{label}</span>
      <span className={`font-mono text-[44px] leading-none font-medium tracking-[-0.03em] md:text-[56px] ${valueCls}`}>
        {formatNumber(shown, decimals)}
        <small className="ml-1.5 text-xl tracking-normal text-muted">{unit}</small>
      </span>
    </Card>
  )
}

export function StudentStats() {
  const [ref, visible] = useInView()
  return (
    <div ref={ref} data-visible={visible} className="reveal mt-5 grid gap-5 md:grid-cols-3">
      <Stat label="Volumen de la semana" target={12480} unit="kg" start={visible} />
      <Stat label="Racha de entrenamiento" target={14} unit="días" start={visible} valueCls="text-intensity" />
      <Stat label="1RM estimado en sentadilla" target={112.5} decimals={1} unit="kg" start={visible} />
    </div>
  )
}
