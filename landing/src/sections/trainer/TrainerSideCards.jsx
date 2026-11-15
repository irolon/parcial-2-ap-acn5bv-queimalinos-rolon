import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'

// b = turno tomado · f = disponible · '' = sin disponibilidad
const week = [
  ['Lu', ['b', '', 'b']], ['Ma', ['', 'b', 'f']], ['Mi', ['b', 'b', '']],
  ['Ju', ['f', 'b', 'b']], ['Vi', ['b', '', 'f']], ['Sá', ['b', 'f', '']],
]
const slotCls = { b: 'bg-brand border-brand', f: 'border-dashed border-surface-2', '': 'bg-bg-2 border-surface-1' }

function Mini({ icon, iconCls, title, className = '', children }) {
  return (
    <Card className={`flex flex-col gap-3.5 p-[22px] ${className}`}>
      <h3 className="flex items-center gap-2.5 text-[17px]">
        <Icon name={icon} className={`size-5 ${iconCls}`} />
        {title}
      </h3>
      {children}
    </Card>
  )
}

export function TrainerSideCards() {
  return (
    <div className="flex flex-col gap-5">
      <Mini icon="calendar" iconCls="text-brand-text" title="Agenda semanal">
        <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
          {week.map(([day, slots]) => (
            <div key={day} className="flex flex-col gap-1.5 text-center text-[11px] text-muted">
              {day}
              {slots.map((s, i) => <span key={i} className={`h-[22px] rounded-md border ${slotCls[s]}`} />)}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">Cargás tu disponibilidad y tus alumnos piden turno desde la app.</p>
      </Mini>

      <Mini icon="bell" iconCls="text-warning" title="Aviso de inactividad" className="border-warning/35">
        <div className="flex items-center gap-2.5 rounded-field border border-surface-1 bg-bg-1 px-3 py-2 text-[13px]">
          <span className="grid size-[26px] place-items-center rounded-pill bg-warning text-[11px] font-semibold text-bg-0">JD</span>
          <span className="text-bone-2">Juan Díaz<small className="block text-[11px] text-muted">No registra sesiones hace 6 días</small></span>
        </div>
        <p className="text-sm text-muted">Te enterás antes de que deje. Le escribís desde el chat en un toque.</p>
      </Mini>

      <Mini icon="message" iconCls="text-brand-text" title="Mensaje a todos">
        <div className="rounded-panel rounded-br-sm bg-brand px-3.5 py-3 text-sm text-white">
          Mañana llueve: la clase de las 8 pasa al gimnasio de Av. Rivadavia.
        </div>
        <p className="font-mono text-xs text-muted">Enviado a 18 alumnos · 14 leídos</p>
      </Mini>
    </div>
  )
}
