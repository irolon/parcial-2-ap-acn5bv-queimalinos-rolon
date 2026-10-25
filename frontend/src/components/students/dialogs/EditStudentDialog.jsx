import { useState } from 'react';
import { GOAL_OPTIONS, LEVEL_OPTIONS } from '@/components/invitations/studentFormOptions';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Input from '@/components/shared/ui/Input';
import Select from '@/components/shared/ui/Select';
import { useUpdateStudent } from '@/hooks/students/useStudents';
import { NO_FIELD_ERRORS } from '@/utils/fieldErrors';
import {
  buildStudentBody,
  studentFormDefaults,
  todayString,
  toStudentErrors,
  validateStudentBody,
} from '@/utils/students/studentForm';

const FORM_ID = 'edit-student-form';

/** Objetivo y nivel no se pueden vaciar (el backend no admite `null`): "Sin definir" solo si ya lo estaban. */
const optionsFor = (options, current) => (current ? options.filter((o) => o.value) : options);

/** Edita nombre, objetivo, nivel y fecha de nacimiento; manda solo lo que cambió. */
export default function EditStudentDialog({ student, onClose }) {
  const [errors, setErrors] = useState(NO_FIELD_ERRORS);
  const update = useUpdateStudent(student.id);
  const saving = update.isPending;
  const defaults = studentFormDefaults(student);
  const { fields } = errors;

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    const body = buildStudentBody(new FormData(event.currentTarget), student);
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    const clientErrors = validateStudentBody(body);
    if (Object.keys(clientErrors).length > 0) {
      setErrors({ form: null, fields: clientErrors });
      return;
    }
    setErrors(NO_FIELD_ERRORS);
    try {
      await update.mutateAsync(body);
      onClose();
    } catch (error) {
      setErrors(toStudentErrors(error));
    }
  }

  return (
    <Dialog
      open
      dismissible={!saving}
      onOpenChange={(next) => !next && onClose()}
      title="Editar alumno"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {errors.form && (
          <p
            role="alert"
            className="rounded-md border border-hot/25 bg-hot/[0.14] px-3 py-2.5 font-body text-sm text-hot"
          >
            {errors.form}
          </p>
        )}
        <Input label="Nombre" name="name" autoComplete="off" defaultValue={defaults.name} error={fields.name} />
        <Select
          label="Objetivo"
          name="goal"
          options={optionsFor(GOAL_OPTIONS, defaults.goal)}
          defaultValue={defaults.goal}
          error={fields.goal}
        />
        <Select
          label="Nivel"
          name="level"
          options={optionsFor(LEVEL_OPTIONS, defaults.level)}
          defaultValue={defaults.level}
          error={fields.level}
        />
        <Input
          label="Fecha de nacimiento"
          name="birth_date"
          type="date"
          max={todayString()}
          defaultValue={defaults.birth_date}
          error={fields.birth_date}
        />
      </form>
    </Dialog>
  );
}
