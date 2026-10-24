import { Pencil, Trash2 } from 'lucide-react';
import Pill from '@/components/shared/ui/Pill';
import ExerciseThumb from './ExerciseThumb';
import { equipmentLabel, muscleLabel } from '@/utils/exercises/exerciseOptions';

const ACTION =
  'cursor-pointer rounded-md p-1.5 text-ink6 hover:bg-white/[0.06] hover:text-bone0 focus-visible:outline-2 focus-visible:outline-accentText';

export default function ExerciseCard({ exercise, onOpen, onEdit, onDelete }) {
  const { name, muscle_group: muscle, equipment, video_url: videoUrl, is_global: isGlobal } = exercise;
  const meta = [muscleLabel(muscle), equipmentLabel(equipment)].filter(Boolean).join(' · ').toUpperCase();

  return (
    <li className="relative flex flex-col gap-3 rounded-xl border border-ink3 bg-ink1 p-3">
      <button
        type="button"
        onClick={() => onOpen(exercise)}
        className="flex cursor-pointer flex-col gap-3 text-left focus-visible:outline-2 focus-visible:outline-accentText"
      >
        <ExerciseThumb url={videoUrl} />
        <span className="min-w-0">
          <span title={name} className="block truncate font-display text-sm font-semibold text-bone0">
            {name}
          </span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.5px] text-ink6">
            {meta}
          </span>
        </span>
      </button>
      {!isGlobal && (
        <div className="flex items-center justify-between">
          <Pill tone="cool">PROPIO</Pill>
          <div className="flex gap-1">
            <button type="button" aria-label={`Editar ${name}`} onClick={() => onEdit(exercise)} className={ACTION}>
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button type="button" aria-label={`Borrar ${name}`} onClick={() => onDelete(exercise)} className={ACTION}>
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
