import { Dumbbell } from 'lucide-react';
import Pill from '@/components/shared/ui/Pill';
import WorkoutEntry from '@/components/student/WorkoutEntry';
import { WEEKDAYS, argentinaDate } from '@/utils/dates';
import { planSummary } from '@/utils/routines/todayPlan';

/** La rutina del día: el día, el nombre, el resumen y cómo entrar a entrenar (Empezar, o Continuar y Descartar). */
export default function RoutineHero({ routine, now }) {
  const weekday = WEEKDAYS[argentinaDate(now).weekday - 1];
  return (
    <section className="relative flex items-center gap-6 overflow-hidden rounded-2xl border border-ink3 bg-linear-to-br from-ink2 to-ink1 p-5 sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 size-52 rounded-full bg-accent opacity-[0.12] blur-3xl"
      />
      <div className="relative min-w-0 flex-1">
        <Pill tone="accent">Hoy · {weekday}</Pill>
        <h2 className="mb-1.5 mt-3 font-display text-[30px] font-bold leading-none tracking-[-1.2px] text-bone0 sm:text-[40px] sm:tracking-[-1.6px]">
          {routine.name}
        </h2>
        <p className="mb-5 font-mono text-[11px] text-ink6">{planSummary(routine.exercises ?? [])}</p>
        <WorkoutEntry routine={routine} startLabel="Empezar entrenamiento" continueLabel="Continuar entrenamiento" />
      </div>
      <div
        aria-hidden="true"
        className="relative hidden h-[110px] w-[150px] shrink-0 items-center justify-center rounded-lg bg-ink3 text-ink6 md:max-lg:flex xl:flex"
      >
        <Dumbbell size={34} />
      </div>
    </section>
  );
}
