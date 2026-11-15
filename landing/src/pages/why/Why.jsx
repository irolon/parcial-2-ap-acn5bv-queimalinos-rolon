import { PageHeader } from '@/components/ui/PageHeader'
import { NextPage } from '@/components/ui/NextPage'
import { ProblemCards } from '@/sections/why/ProblemCards'
import { Places } from '@/sections/why/Places'
import { Comparison } from '@/sections/why/Comparison'

export default function Why() {
  return (
    <>
      <PageHeader
        eyebrow="Por qué FitTrainer"
        title="Hoy tu trabajo vive en tres apps que no se hablan."
        lead="Rutinas en PDF, planillas que nadie abre y cargas anotadas a las apuradas. Funciona con cinco alumnos. Con veinte, se te escapa."
      />
      <section aria-label="El problema y la comparación" className="pb-20 md:pb-28">
        <div className="container-page">
          <ProblemCards />
          <Places />
          <Comparison />
          <NextPage to="/planes" label="Planes y preguntas frecuentes" />
        </div>
      </section>
    </>
  )
}
