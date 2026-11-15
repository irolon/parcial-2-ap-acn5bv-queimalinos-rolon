import { PageHeader } from '@/components/ui/PageHeader'
import { NextPage } from '@/components/ui/NextPage'
import { Assistants } from '@/sections/ai/Assistants'
import { AiPrinciples } from '@/sections/ai/AiPrinciples'

export default function AI() {
  return (
    <>
      <PageHeader
        eyebrow="Asistentes con IA"
        title="Dos asistentes. Uno para vos y otro para tu alumno."
        lead="La IA se encarga de lo repetitivo. El criterio sigue siendo tuyo: revisás y editás todo antes de enviarlo."
      />
      <section aria-label="Ejemplos de los asistentes" className="pb-20 md:pb-28">
        <div className="container-page">
          <Assistants />
          <AiPrinciples />
          <NextPage to="/por-que" label="Por qué FitTrainer y no lo de siempre" />
        </div>
      </section>
    </>
  )
}
