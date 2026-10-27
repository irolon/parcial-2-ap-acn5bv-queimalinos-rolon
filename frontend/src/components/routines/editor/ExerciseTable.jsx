import { useMemo } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FIELDS } from './ExerciseRow';
import SortableRow from './SortableRow';
import { dndAnnouncements } from './dndAnnouncements';

const HEAD = 'px-2 py-2 text-left font-mono text-[9px] font-normal uppercase tracking-[1px] text-ink6';

/** Tabla editable de la rutina. `errors` es `exercises` de `validateRoutine` (por `key`). */
export default function ExerciseTable({ exercises, byId, errors = {}, onChange, onMove, onReorder, onRemove }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = useMemo(() => exercises.map((e) => e.key), [exercises]);
  const a11y = useMemo(
    () => dndAnnouncements(Object.fromEntries(exercises.map((e) => [e.key, byId.get(e.exercise_id)?.name]))),
    [exercises, byId],
  );
  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) onReorder(ids.indexOf(active.id), ids.indexOf(over.id));
  };
  if (exercises.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink3 px-4 py-10 text-center font-body text-sm text-ink6">
        Agregá ejercicios desde la biblioteca
      </p>
    );
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} accessibility={a11y}>
      <div className="relative overflow-x-auto rounded-xl border border-ink2">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr>
              <th scope="col" className={HEAD}>#</th>
              <th scope="col" className={HEAD}><span className="sr-only">Arrastrar</span></th>
              <th scope="col" className={HEAD}>Ejercicio</th>
              {FIELDS.map(({ field, label }) => (
                <th key={field} scope="col" className={HEAD}>{label}</th>
              ))}
              <th scope="col" className={HEAD}><span className="sr-only">Opciones</span></th>
            </tr>
          </thead>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <tbody>
              {exercises.map((item, index) => (
                <SortableRow
                  key={item.key}
                  item={item}
                  index={index}
                  last={index === exercises.length - 1}
                  exercise={byId.get(item.exercise_id)}
                  errors={errors[item.key]}
                  onChange={onChange}
                  onMove={onMove}
                  onRemove={onRemove}
                />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </div>
    </DndContext>
  );
}
