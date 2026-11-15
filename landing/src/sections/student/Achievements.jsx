import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'

export function Achievements() {
  return (
    <Reveal className="mt-5 grid gap-5 md:grid-cols-3">
      {(visible) => (
        <>
          <Card className="flex items-center gap-4 p-[22px]">
            <span className="grid size-13 shrink-0 place-items-center rounded-panel bg-intensity/14 text-intensity"><Icon name="flame" className="size-[26px]" /></span>
            <div><b className="block text-bone">Racha de 14 días</b><span className="text-sm text-muted">Dos semanas sin cortar.</span></div>
          </Card>
          <Card className="flex items-center gap-4 p-[22px]">
            <span className="grid size-13 shrink-0 place-items-center rounded-panel bg-success/12 text-success"><Icon name="trophy" className="size-[26px]" /></span>
            <div><b className="block text-bone">Nuevo récord</b><span className="text-sm text-muted">Sentadilla: <span className="font-mono">85 kg × 5</span></span></div>
          </Card>
          <Card className="flex flex-col gap-3 p-[22px]">
            <div className="flex justify-between gap-3"><b className="text-bone">Desafío de noviembre</b><span className="font-mono text-info">9/12</span></div>
            <span className="text-sm text-muted">12 sesiones en el mes</span>
            <div className="h-2 overflow-hidden rounded-pill bg-surface-1">
              <div
                className="h-2 origin-left rounded-pill bg-info transition-transform duration-900 ease-[cubic-bezier(.2,.7,.2,1)]"
                style={{ width: '75%', transform: `scaleX(${visible ? 1 : 0})` }}
              />
            </div>
          </Card>
        </>
      )}
    </Reveal>
  )
}
