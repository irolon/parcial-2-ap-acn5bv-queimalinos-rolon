import { Link } from 'react-router';
import Button from '@/components/shared/ui/Button';
import { useUpdateStudent } from '@/hooks/students/useStudents';
import { newRoutineHref } from '@/routes/routeTable';
import { fieldErrorsFrom } from '@/utils/fieldErrors';

/** Acciones de la ficha: editar y dar de baja (con confirmación) o reactivar (directo). Abrir un diálogo limpia el error de reactivar. */
export default function ProfileActions({ student, onEdit, onDeactivate }) {
  const update = useUpdateStudent(student.id);
  const open = (action) => () => {
    update.reset();
    action();
  };
  const reactivate = () => update.mutate({ active: true });
  const error = update.error
    ? fieldErrorsFrom(update.error, { fields: [], fallback: 'No pudimos reactivar al alumno' }).form
    : null;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="ghost" size="sm" onClick={open(onEdit)}>
          Editar alumno
        </Button>
        {student.active !== false && (
          <Link
            to={newRoutineHref(student.id)}
            className="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 font-display text-sm font-semibold text-accentInk hover:bg-accentDim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText"
          >
            Asignar rutina
          </Link>
        )}
        {student.active === false ? (
          <Button variant="dark" size="sm" onClick={reactivate} loading={update.isPending}>
            Reactivar
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={open(onDeactivate)}>
            Dar de baja
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="font-body text-sm text-hot">
          {error}
        </p>
      )}
    </div>
  );
}
