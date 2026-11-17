import { PageHeader } from '@/components/ui/PageHeader'
import { NextPage } from '@/components/ui/NextPage'
import { TodayRoutinePhone } from '@/sections/student/TodayRoutinePhone'
import { MuscleMap } from '@/sections/student/MuscleMap'
import { StudentStats } from '@/sections/student/StudentStats'
import { Achievements } from '@/sections/student/Achievements'
import { StudentFeatures } from '@/sections/student/StudentFeatures'

export default function Students() {
  return (
    <>
      <PageHeader
        eyebrow="Para el alumno"
        title="Una app que dan ganas de abrir."
        lead="Tu alumno ve la rutina del día, registra cada serie y mira cómo progresa. Aunque entrene en una plaza sin señal: la app guarda todo y se sincroniza sola."
      />
      <section aria-label="La app del alumno" className="pb-20 md:pb-28">
        <div className="container-page">
          <div className="grid animate-rise items-stretch gap-5 [animation-delay:.24s] lg:grid-cols-[4fr_8fr]">
            <TodayRoutinePhone />
            <MuscleMap />
          </div>
          <StudentStats />
          <Achievements />
          <StudentFeatures />
          <NextPage to="/ia" label="Los dos asistentes con IA" />
        </div>
      </section>
    </>
  )
}
