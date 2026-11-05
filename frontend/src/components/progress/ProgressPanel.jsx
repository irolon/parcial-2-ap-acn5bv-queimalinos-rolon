import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import QueryState from '@/components/shared/states/QueryState';
import { useExerciseProgress, useProgressOverview } from '@/hooks/progress/useProgress';
import { MIN_POINTS, resolveMetric } from '@/utils/progress/metrics';
import { DEFAULT_RANGE, rangeFor } from '@/utils/progress/ranges';
import BodyProgressCard from './BodyProgressCard';
import ExerciseCurveCard from './ExerciseCurveCard';
import ProgressKpis from './ProgressKpis';
import ProgressToolbar from './ProgressToolbar';
import WeeklyVolumeCard from './WeeklyVolumeCard';

const EMPTY = {
  icon: TrendingUp,
  title: 'Todavía no hay entrenamientos registrados',
  text: 'Después de 3 entrenamientos vas a ver tu progresión acá.',
};

/** El más reciente con datos suficientes para la curva; si ninguno llega, el más reciente. */
const defaultExercise = (exercises) => exercises.find((e) => e.days >= MIN_POINTS) ?? exercises[0];

function Content({ studentId, overview, sel, rangeObj, showBody, viewer }) {
  const { range, setRange, chosenId, setChosenId, chosenMetric, setChosenMetric } = sel;
  const exerciseId = overview.exercises.some((e) => e.id === chosenId) ? chosenId : defaultExercise(overview.exercises).id;
  const exerciseQuery = useExerciseProgress(exerciseId, studentId, rangeObj);
  const data = exerciseQuery.data;
  const metric = data && resolveMetric(data.points, chosenMetric ?? data.default_metric, data.default_metric);
  const totalDays = overview.exercises.find((e) => e.id === exerciseId)?.days ?? 0;

  const pickExercise = (id) => {
    setChosenId(id);
    setChosenMetric(null);
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ProgressToolbar
        exercises={overview.exercises}
        exerciseId={exerciseId}
        onExercise={pickExercise}
        range={range}
        onRange={setRange}
      />
      <QueryState query={exerciseQuery}>
        {(d) => (
          <>
            <ProgressKpis weeks={overview.weekly_volume} pr={d.pr} metric={metric} range={range} />
            <ExerciseCurveCard data={d} metric={metric} onMetricChange={setChosenMetric} range={range} totalDays={totalDays} />
          </>
        )}
      </QueryState>
      <WeeklyVolumeCard weeks={overview.weekly_volume} />
      {showBody && <BodyProgressCard studentId={studentId} viewer={viewer} />}
    </div>
  );
}

/**
 * Progresión de un alumno: ejercicio y rango elegidos, KPIs, curva, volumen semanal y (alumno) medidas.
 * `viewer` (`'trainer'` por defecto o `'student'`) es quién mira y solo llega a los textos de las medidas.
 */
export default function ProgressPanel({ studentId, showBody = false, viewer = 'trainer' }) {
  // La selección vive acá arriba para que sobreviva a los refetch del overview (cambio de rango).
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [chosenId, setChosenId] = useState(null);
  const [chosenMetric, setChosenMetric] = useState(null);
  const sel = { range, setRange, chosenId, setChosenId, chosenMetric, setChosenMetric };
  // El rango se calcula una vez por valor: así la query key no cambia en cada render.
  const rangeObj = useMemo(() => rangeFor(range), [range]);
  const overviewQuery = useProgressOverview(studentId, rangeObj);
  return (
    <QueryState query={overviewQuery}>
      {(overview) =>
        overview.exercises.length === 0 ? (
          <div className="flex min-w-0 flex-col gap-5">
            <EmptyState {...EMPTY} />
            {showBody && <BodyProgressCard studentId={studentId} viewer={viewer} />}
          </div>
        ) : (
          <Content
            studentId={studentId}
            overview={overview}
            sel={sel}
            rangeObj={rangeObj}
            showBody={showBody}
            viewer={viewer}
          />
        )
      }
    </QueryState>
  );
}
