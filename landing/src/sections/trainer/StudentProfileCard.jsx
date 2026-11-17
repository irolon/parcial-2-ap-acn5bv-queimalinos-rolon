import { Card } from '@/components/ui/Card'
import { ProgressChart } from '@/sections/trainer/ProgressChart'

const measures = [
  { label: 'Peso', value: '62,4', unit: 'kg' },
  { label: 'Altura', value: '1,66', unit: 'm' },
  { label: 'IMC', value: '22,6' },
  { label: 'Cintura', value: '71', unit: 'cm' },
]

export function StudentProfileCard() {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center gap-3.5">
        <span className="grid size-12 place-items-center rounded-pill bg-info text-base font-semibold text-bg-0">LP</span>
        <div className="min-w-40 flex-1">
          <div className="font-display text-[22px] font-semibold text-bone">Lucía Pérez</div>
          <div className="text-sm text-muted">Objetivo: fuerza · 3 días por semana · En la plaza</div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-pill bg-success/12 px-3.5 py-1.5 text-[13px] font-medium text-success">
          <span className="size-2 rounded-pill bg-success" />Activa
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {measures.map((m) => (
          <div key={m.label} className="rounded-field border border-surface-1 bg-bg-2 p-3">
            <dt className="text-xs text-muted">{m.label}</dt>
            <dd className="m-0">
              <b className="font-mono text-xl font-medium text-bone">{m.value}</b>
              {m.unit && <i className="ml-1 text-xs text-muted not-italic">{m.unit}</i>}
            </dd>
          </div>
        ))}
      </dl>
      <ProgressChart />
    </Card>
  )
}
