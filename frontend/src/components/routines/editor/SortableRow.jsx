import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import ExerciseRow from './ExerciseRow';

/** Fila ordenable: el asa recibe los atributos y listeners de dnd-kit; la fila se desplaza mientras se arrastra. */
export default function SortableRow(props) {
  const { item, exercise } = props;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  const style = { transform: CSS.Translate.toString(transform), transition, position: 'relative', zIndex: isDragging ? 1 : undefined };
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={`Mover ${exercise?.name ?? 'Ejercicio'}`}
      className="flex size-8 cursor-grab touch-none items-center justify-center rounded-md text-ink6 outline-none hover:text-bone0 focus-visible:ring-2 focus-visible:ring-accentText active:cursor-grabbing"
      {...attributes}
      {...listeners}
      aria-roledescription="ítem reordenable"
    >
      <GripVertical size={16} aria-hidden="true" />
    </button>
  );
  return <ExerciseRow {...props} handle={handle} rowRef={setNodeRef} style={style} dragging={isDragging} />;
}
