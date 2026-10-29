import { useRef, useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Select from '@/components/shared/ui/Select';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useCreateRoutine } from '@/hooks/routines/useRoutines';
import { useStudentsQuery } from '@/hooks/students/useStudents';
import { fieldErrorsFrom } from '@/utils/fieldErrors';
import { clearDraft } from '@/utils/routines/draft';
import { buildRoutineBody } from '@/utils/routines/routineForm';

const INVALID = 'Revisá los datos de la rutina';
const TEMPLATE_GONE = 'La plantilla de origen ya no existe. Volvé a asignar y se guarda sin plantilla.';

function failureMessage(err, invalid) {
  if (invalid) return INVALID;
  if (err?.code === 'TEMPLATE_NOT_FOUND') return TEMPLATE_GONE;
  return fieldErrorsFrom(err, { fields: [], fallback: 'No pudimos asignar la rutina' }).form;
}

/**
 * Elige el alumno activo y crea la rutina (un solo POST aunque se haga doble clic).
 * Un 400 le pasa el error a la página (`onInvalid`) para marcar las celdas; si la plantilla de origen ya no existe
 * (404) la página la desvincula (`onTemplateGone`) y hay que volver a asignar; el resto se muestra acá.
 */
export default function AssignRoutineDialog({ state, preselectedStudentId, onAssigned, onInvalid, onTemplateGone, onClose }) {
  const trainerId = useAuthStore((s) => s.user?.id);
  const students = useStudentsQuery({ active: true });
  const create = useCreateRoutine();
  const sending = useRef(false);
  const [chosen, setChosen] = useState(null);
  const [error, setError] = useState(null);
  const list = students.data ?? [];
  const student = list.find((s) => s.id === (chosen ?? preselectedStudentId));
  const options = [{ value: '', label: 'Elegí un alumno' }, ...list.map((s) => ({ value: s.id, label: s.name }))];

  async function handleSubmit() {
    if (sending.current) return;
    if (!student) {
      setError('Elegí un alumno');
      return;
    }
    sending.current = true;
    setError(null);
    try {
      await create.mutateAsync(buildRoutineBody(state, student.id));
      clearDraft(trainerId);
      onAssigned(student);
    } catch (err) {
      sending.current = false;
      const invalid = err?.code === 'VALIDATION_ERROR';
      if (invalid) onInvalid(err);
      if (err?.code === 'TEMPLATE_NOT_FOUND') onTemplateGone();
      setError(failureMessage(err, invalid));
    }
  }

  return (
    <Dialog
      open
      dismissible={!create.isPending}
      onOpenChange={(next) => !next && onClose()}
      title="Asignar a alumno"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={create.isPending}>Asignar</Button>
        </>
      }
    >
      <Select
        label="Alumno"
        options={options}
        value={student?.id ?? ''}
        onChange={(event) => { setChosen(event.target.value); setError(null); }}
        disabled={students.isPending}
        error={error}
        hint={students.isError ? 'No pudimos cargar tus alumnos' : undefined}
      />
    </Dialog>
  );
}
