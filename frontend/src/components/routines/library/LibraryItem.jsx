import { Plus } from 'lucide-react';
import ExerciseThumb from '@/components/exercises/ExerciseThumb';
import { muscleLabel } from '@/utils/exercises/exerciseOptions';

/** Ejercicio de la biblioteca compacta: miniatura, nombre, músculo y botón para agregarlo. */
export default function LibraryItem({ exercise, onAdd }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-ink2 px-2.5 py-2">
      <div className="w-9 shrink-0">
        <ExerciseThumb url={exercise.video_url} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-sm text-bone0">{exercise.name}</p>
        <p className="font-mono text-[10px] uppercase text-ink6">{muscleLabel(exercise.muscle_group)}</p>
      </div>
      <button
        type="button"
        aria-label={`Agregar ${exercise.name}`}
        onClick={() => onAdd(exercise.id)}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-accent text-accentInk hover:bg-accentDim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText"
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </li>
  );
}
