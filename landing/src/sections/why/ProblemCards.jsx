import { Card } from '@/components/ui/Card'
import { IconTile } from '@/components/ui/IconTile'

const problems = [
  { icon: 'message', tone: 'success', title: 'WhatsApp', text: 'Mandás la rutina en PDF, queda enterrada entre audios y el alumno te pregunta qué le tocaba hoy.', mess: ['rutina_final_v3.pdf', '¿Hoy era piernas?'] },
  { icon: 'sheet', tone: 'info', title: 'Excel o Sheets', text: 'Armás planillas prolijas que desde el celular, en medio de una serie, no se pueden ni leer.', mess: ['Alumnos_2026 (copia).xlsx', 'Columna F: ¿kg o reps?'] },
  { icon: 'note', tone: 'warning', title: 'Notas del celular', text: 'Cada uno anota las cargas donde puede. Saber si alguien progresa es casi adivinar.', mess: ['press 40?? 3x8 creo', 'martes: no vino'] },
]

export function ProblemCards() {
  return (
    <div className="grid animate-rise gap-5 [animation-delay:.24s] md:grid-cols-3">
      {problems.map((p) => (
        <Card key={p.title} className="flex min-h-60 flex-col gap-3.5 p-7">
          <IconTile name={p.icon} tone={p.tone} size="lg" />
          <h2 className="text-[22px]">{p.title}</h2>
          <p className="text-muted">{p.text}</p>
          <div className="mt-auto flex flex-col gap-1.5 font-mono text-xs text-muted" aria-hidden="true">
            {p.mess.map((m) => (
              <span key={m} className="self-start rounded-tag border border-surface-1 bg-bg-2 px-2.5 py-1.5">{m}</span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
