import { ChatCard } from '@/sections/ai/ChatCard'

const routine = (
  <>
    Listo. Usé ejercicios de tu biblioteca que se hacen sin máquinas:
    <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
      <dt className="font-mono font-medium text-brand-text">Día A</dt><dd className="m-0">Sentadilla goblet 3 × 10 · Flexiones 3 × 8 · Remo con banda 3 × 12</dd>
      <dt className="font-mono font-medium text-brand-text">Día B</dt><dd className="m-0">Peso muerto rumano 3 × 10 · Fondos en banco 3 × 10 · Plancha 3 × 12</dd>
      <dt className="font-mono font-medium text-brand-text">Día C</dt><dd className="m-0">Estocadas 3 × 10 · Dominadas asistidas 3 × 6 · Puente de glúteos 3 × 15</dd>
    </dl>
  </>
)

const trainerChat = [
  { from: 'user', text: 'Armame una rutina de 3 días para Lucía. Principiante, objetivo fuerza, entrena en la plaza.' },
  { from: 'ai', text: routine },
  { actions: ['Editar', 'Guardar como plantilla', 'Asignar a Lucía'] },
]

const studentChat = [
  { from: 'user', text: 'En la plaza no hay barra. ¿Con qué reemplazo el press inclinado?' },
  { from: 'ai', text: 'Probá flexiones con los pies sobre un banco: trabajan la parte alta del pecho y los hombros de forma parecida. Mantené las 3 series de 10 y el mismo descanso.' },
  { from: 'user', text: '¿Y cómo caliento antes?' },
  { from: 'ai', text: 'Cinco minutos de movilidad de hombros y dos series livianas de flexiones con las manos en el banco.' },
]

export function Assistants() {
  return (
    <div className="grid animate-rise gap-5 [animation-delay:.24s] md:grid-cols-2">
      <ChatCard tone="brand" title="Para el entrenador" subtitle="Arma rutinas con tu biblioteca y el perfil del alumno." messages={trainerChat} />
      <ChatCard tone="info" title="Para el alumno" subtitle="Responde dudas de técnica, sustituciones y calentamiento." messages={studentChat} />
    </div>
  )
}
