import { todayRoutine } from '@/data/student/student'
import { Icon } from '@/components/ui/Icon'
import { MiniRow } from '@/components/mockups/MiniRow'
import { PhoneFrame } from '@/components/mockups/PhoneFrame'

export function TodayRoutinePhone() {
  return (
    <PhoneFrame label="Pantalla de la rutina del día en la app del alumno" className="w-full max-w-80 justify-self-center" innerClassName="min-h-[560px]">
      <div className="text-xs text-muted">Martes · Día B</div>
      <div className="-mt-1.5 font-display text-2xl leading-tight font-semibold text-bone">Torso</div>
      <div className="flex gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-intensity/14 px-2.5 py-1 text-[11px] text-intensity">
          <Icon name="flame" className="size-3" />Racha 14
        </span>
        <span className="rounded-pill bg-bg-2 px-2.5 py-1 font-mono text-[11px] text-bone-3">≈ 50 min</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {todayRoutine.map(([name, sets]) => <MiniRow key={name} left={name} right={sets} className="py-2.5" />)}
      </div>
      <div className="rounded-field border border-surface-1 bg-bg-2 px-3 py-2.5 text-xs text-bone-3">
        <span className="text-muted">Nota de tu entrenador:</span> subí 2,5 kg en banca si el martes pasado terminaste con RPE 7.
      </div>
      <div className="mt-auto rounded-field bg-brand p-3 text-center text-sm font-semibold text-white">Empezar sesión</div>
    </PhoneFrame>
  )
}
