import { Icon } from '@/components/ui/Icon'
import { BrowserFrame } from '@/components/mockups/BrowserFrame'

const students = [
  { initials: 'LP', color: 'bg-info', name: 'Lucía Pérez', detail: 'Fuerza · Día B completado', tag: 'Hoy', tagCls: 'bg-success/14 text-success' },
  { initials: 'MG', color: 'bg-bone-3', name: 'Martín Gómez', detail: 'Hipertrofia · 18:00 en la plaza', tag: 'Turno', tagCls: 'bg-brand-text/16 text-brand-soft' },
  { initials: 'SR', color: 'bg-intensity', name: 'Sofía Ruiz', detail: 'Récord en peso muerto · 95 kg', tag: 'Récord', tagCls: 'bg-intensity/14 text-intensity' },
  { initials: 'JD', color: 'bg-warning', name: 'Juan Díaz', detail: 'Sin entrenar hace 6 días', tag: 'Aviso', tagCls: 'bg-warning/14 text-warning' },
]

const kpis = [
  { value: '18', label: 'Alumnos activos' },
  { value: '41', label: 'Sesiones esta semana' },
  { value: '2', label: 'Avisos de inactividad', cls: 'text-warning' },
]

const sideIcons = ['users', 'list', 'calendar', 'message', 'chart']

export function TrainerPanelMock() {
  return (
    <BrowserFrame title="FitTrainer · Panel" label="Panel del entrenador en la web">
      <div className="grid min-h-[420px] grid-cols-[52px_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-1.5 border-r border-surface-1 bg-bg-0 py-3.5" aria-hidden="true">
          {sideIcons.map((n, i) => (
            <span key={n} className={`grid size-[34px] place-items-center rounded-chip ${i === 0 ? 'bg-surface-1 text-bone' : 'text-muted'}`}>
              <Icon name={n} className="size-4" />
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-3.5 p-[18px]">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="font-display text-lg font-semibold text-bone">Alumnos</div>
              <div className="text-xs text-muted">Hoy tenés 3 turnos</div>
            </div>
            <span className="rounded-pill bg-brand px-2.5 py-1 text-[11px] text-white">+ Invitar alumno</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-field border border-surface-1 bg-bg-2 px-3 py-2.5">
                <b className={`block font-mono text-xl font-medium text-bone ${k.cls ?? ''}`}>{k.value}</b>
                <small className="text-[11px] text-muted">{k.label}</small>
              </div>
            ))}
          </div>
          <div className="flex flex-col overflow-hidden rounded-field border border-surface-1">
            {students.map((s, i) => (
              <div key={s.name} className={`flex items-center gap-2.5 bg-bg-1 px-3 py-2 text-[13px] ${i ? 'border-t border-surface-1' : ''}`}>
                <span className={`grid size-[26px] shrink-0 place-items-center rounded-pill text-[11px] font-semibold text-bg-0 ${s.color}`}>{s.initials}</span>
                <span className="min-w-0 flex-1 text-bone-2">
                  {s.name}
                  <small className="block text-[11px] text-muted">{s.detail}</small>
                </span>
                <span className={`whitespace-nowrap rounded-pill px-2 py-0.5 text-[11px] ${s.tagCls}`}>{s.tag}</span>
              </div>
            ))}
          </div>
          <div className="rounded-field border border-surface-1 bg-bg-2 p-3">
            <div className="flex justify-between text-xs text-muted">
              <span>Lucía · 1RM estimado en sentadilla</span>
              <span className="font-mono text-bone">112,5 kg</span>
            </div>
            <svg viewBox="0 0 400 70" className="mt-1.5 block h-16 w-full" aria-hidden="true">
              <path d="M4 62 L60 56 L116 50 L172 46 L228 36 L284 32 L340 20 L396 8" fill="none" stroke="var(--color-brand-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="draw-line" />
              <circle cx="396" cy="8" r="4" fill="var(--color-intensity)" />
            </svg>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}
