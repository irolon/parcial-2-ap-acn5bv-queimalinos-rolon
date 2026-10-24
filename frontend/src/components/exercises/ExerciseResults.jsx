import { Dumbbell, SearchX } from 'lucide-react';
import Button from '@/components/shared/ui/Button';
import EmptyState from '@/components/shared/states/EmptyState';
import ExerciseCard from './ExerciseCard';

/** Grilla de tarjetas o, sin resultados, el vacío que corresponde al filtro. */
export default function ExerciseResults({ items, ownOnly, onCreate, onClear, onOpen, onEdit, onDelete }) {
  if (items.length > 0) {
    return (
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </ul>
    );
  }
  if (ownOnly) {
    return (
      <div className="flex flex-col items-center">
        <EmptyState
          icon={Dumbbell}
          title="Todavía no creaste ejercicios propios"
          text="Creá el primero con su video para usarlo en tus rutinas."
        />
        <Button onClick={onCreate}>Nuevo ejercicio</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      <EmptyState icon={SearchX} title="Ningún ejercicio coincide" />
      <Button variant="ghost" onClick={onClear}>
        Limpiar filtros
      </Button>
    </div>
  );
}
