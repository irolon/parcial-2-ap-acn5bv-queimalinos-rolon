import Card from '@/components/shared/ui/Card';
import { formatRoutineDays } from '@/utils/students/routineDays';
import { levelLabel } from '@/utils/students/studentOptions';

/**
 * La rutina activa de la ficha (`active_routine`: la más reciente, si tiene varias). `title` cambia el título: el
 * alumno la ve como "Rutina más reciente", porque todas las suyas están en Mis rutinas.
 */
export default function ActiveRoutineCard({ routine, title = 'Rutina activa' }) {
  const level = levelLabel(routine?.level);
  return (
    <Card title={title}>
      {routine ? (
        <div>
          <p className="font-display text-sm font-semibold text-bone0">{routine.name}</p>
          <p className="font-body text-sm text-ink6">{formatRoutineDays(routine.days)}</p>
          {level && <p className="font-body text-sm text-ink6">{`Nivel: ${level}`}</p>}
        </div>
      ) : (
        <p className="font-body text-sm text-ink6">Sin rutina asignada</p>
      )}
    </Card>
  );
}
