import { Reveal } from '@/components/ui/Reveal'
import { SectionHeader } from '@/components/ui/SectionHeader'

const rows = [
  ['Idioma', 'Español, pero desordenado', 'Español argentino'],
  ['Precio', 'Gratis, pero te cuesta horas', 'En pesos, con plan gratis'],
  ['Rutinas', 'PDF o planilla', 'Editor, plantillas y asistente con IA'],
  ['Registro de cargas', 'Notas del celular', 'En la app, aun sin conexión'],
  ['Alta del alumno', 'Le mandás archivos', 'QR o link por WhatsApp, en un minuto'],
  ['Pensado para', 'Nada en particular', 'El personal trainer independiente'],
]

const cell = 'border-t border-surface-1 px-[22px] py-[18px] text-left align-top'

export function Comparison() {
  return (
    <div className="mt-20 md:mt-28">
      <SectionHeader
        eyebrow="Lo de antes vs. FitTrainer"
        title="Hecho para entrenar acá, no traducido."
        lead="Lo que cambia en tu día a día cuando dejás de armar todo con WhatsApp y planillas."
      />
      <Reveal className="overflow-x-auto rounded-card border border-surface-1">
        <table className="w-full min-w-[560px] border-collapse text-[15px]">
          <thead>
            <tr className="font-display text-[17px] text-bone">
              <th scope="col" className="bg-bg-1 px-[22px] py-[18px]"><span className="sr-only">Aspecto</span></th>
              <th scope="col" className="bg-bg-1 px-[22px] py-[18px] text-left font-semibold">WhatsApp + Excel</th>
              <th scope="col" className="bg-brand px-[22px] py-[18px] text-left font-semibold text-white">FitTrainer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, before, after]) => (
              <tr key={label}>
                <th scope="row" className={`${cell} w-1/5 bg-bg-1 text-sm font-medium text-muted`}>{label}</th>
                <td className={`${cell} bg-bg-0`}>{before}</td>
                <td className={`${cell} bg-[#141a2b] text-bone`}>{after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </div>
  )
}
