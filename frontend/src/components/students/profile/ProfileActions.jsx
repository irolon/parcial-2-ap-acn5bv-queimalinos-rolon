import Button from '@/components/shared/ui/Button';
import { useUpdateStudent } from '@/hooks/students/useStudents';
import { fieldErrorsFrom } from '@/utils/fieldErrors';

/** Acciones de la ficha: editar y dar de baja (con confirmación) o reactivar (directo). */
export default function ProfileActions({ student, onEdit, onDeactivate }) {
  const update = useUpdateStudent(student.id);
  const reactivate = () => update.mutate({ active: true });
  const error = update.error
    ? fieldErrorsFrom(update.error, { fields: [], fallback: 'No pudimos reactivar al alumno' }).form
    : null;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Editar alumno
        </Button>
        {student.active === false ? (
          <Button variant="dark" size="sm" onClick={reactivate} loading={update.isPending}>
            Reactivar
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onDeactivate}>
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
