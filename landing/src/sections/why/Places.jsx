import { Card } from '@/components/ui/Card'
import { IconTile } from '@/components/ui/IconTile'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { MiniRow } from '@/components/mockups/MiniRow'

const places = [
  {
    icon: 'tree', tone: 'info', title: 'En la plaza',
    text: 'Sin señal no hay problema: el alumno registra la sesión y se sincroniza sola cuando vuelve la conexión.',
    row: <MiniRow left={<><span className="size-2 rounded-pill bg-info" />Sin conexión</>} right="3 series guardadas" />,
  },
  {
    icon: 'dumbbell', tone: 'intensity', title: 'En el gimnasio del barrio',
    text: 'Tu alumno sigue la rutina desde el celular, con el timer de descanso, aunque no estés al lado.',
    row: <MiniRow left="Press de banca · serie 2" right={<span className="text-intensity">01:30</span>} />,
  },
  {
    icon: 'home', tone: 'success', title: 'A domicilio',
    text: 'Tu agenda de turnos y la ficha de cada alumno, en el bolsillo, de casa en casa.',
    row: <MiniRow left="Hoy · Martín Gómez" right={<span className="text-success">19:00</span>} />,
  },
]

export function Places() {
  return (
    <div className="mt-20 md:mt-28">
      <SectionHeader
        eyebrow="Donde sea que entrenes"
        title="Tu método va con vos, a cualquier lugar."
        lead="FitTrainer está pensado para cómo trabaja de verdad un PT independiente."
      />
      <Reveal className="grid gap-5 md:grid-cols-3">
        {places.map((p) => (
          <Card key={p.title} className="flex flex-col gap-3.5 p-6">
            <IconTile name={p.icon} tone={p.tone} />
            <h3 className="text-[22px]">{p.title}</h3>
            <p className="text-muted">{p.text}</p>
            <div className="mt-auto">{p.row}</div>
          </Card>
        ))}
      </Reveal>
    </div>
  )
}
