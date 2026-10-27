import Card from '@/components/shared/ui/Card';
import { formatRoutineDays } from '@/utils/students/routineDays';

export default function ActiveRoutineCard({ routine }) {
  return (
    <Card title="Rutina activa">
      {routine ? (
        <div>
          <p className="font-display text-sm font-semibold text-bone0">{routine.name}</p>
          <p className="font-body text-sm text-ink6">{formatRoutineDays(routine.days)}</p>
        </div>
      ) : (
        <p className="font-body text-sm text-ink6">Sin rutina asignada</p>
      )}
    </Card>
  );
}
