import { PageHeader } from '@/components/ui/PageHeader'
import { NextPage } from '@/components/ui/NextPage'
import { StudentProfileCard } from '@/sections/trainer/StudentProfileCard'
import { TrainerSideCards } from '@/sections/trainer/TrainerSideCards'
import { TrainerFeatures } from '@/sections/trainer/TrainerFeatures'

export default function Trainers() {
  return (
    <>
      <PageHeader
        eyebrow="Para el entrenador"
        title="Todo tu método, ordenado en un panel."
        lead="Desde la compu o desde el celular: fichas, rutinas, agenda y mensajes en el mismo lugar. Menos tiempo administrando, más tiempo entrenando."
      />
      <section aria-label="Funciones para el entrenador" className="pb-20 md:pb-28">
        <div className="container-page">
          <div className="grid animate-rise gap-5 [animation-delay:.24s] lg:grid-cols-[7fr_5fr]">
            <StudentProfileCard />
            <TrainerSideCards />
          </div>
          <TrainerFeatures />
          <NextPage to="/alumnos" label="Lo que ve tu alumno en la app" />
        </div>
      </section>
    </>
  )
}
