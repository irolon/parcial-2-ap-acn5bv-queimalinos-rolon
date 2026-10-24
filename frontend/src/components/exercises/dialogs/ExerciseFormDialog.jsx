import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Input from '@/components/shared/ui/Input';
import Select from '@/components/shared/ui/Select';
import Textarea from '@/components/shared/ui/Textarea';
import { useCreateExercise, useUpdateExercise } from '@/hooks/exercises/useExercises';
import { NO_FIELD_ERRORS } from '@/utils/fieldErrors';
import { MUSCLE_OPTIONS } from '@/utils/exercises/exerciseOptions';
import {
  buildExerciseBody,
  changedFields,
  equipmentOptionsFor,
  formDefaults,
  initialBody,
  toExerciseErrors,
  validateExerciseBody,
} from '@/utils/exercises/exerciseForm';

const FORM_ID = 'exercise-form';
const MUSCLE_PLACEHOLDER = { value: '', label: 'Elegí un grupo' };

/**
 * Modal para crear (`exercise` ausente) o editar un ejercicio propio. Formulario no controlado:
 * la página lo monta con otra `key` en cada apertura, así arranca limpio.
 */
export default function ExerciseFormDialog({ open, exercise, onClose }) {
  const [errors, setErrors] = useState(NO_FIELD_ERRORS);
  const create = useCreateExercise();
  const update = useUpdateExercise();
  const editing = Boolean(exercise);
  const saving = create.isPending || update.isPending;
  const defaults = formDefaults(exercise);
  const { fields } = errors;

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    const built = buildExerciseBody(new FormData(event.currentTarget));
    // Editar manda solo lo que cambió: un dato viejo sin tocar no bloquea ni se reescribe.
    const body = editing ? changedFields(built, initialBody(exercise)) : built;
    if (editing && Object.keys(body).length === 0) {
      onClose();
      return;
    }
    const clientErrors = validateExerciseBody(body);
    if (Object.keys(clientErrors).length > 0) {
      setErrors({ form: null, fields: clientErrors });
      return;
    }
    setErrors(NO_FIELD_ERRORS);
    try {
      await (editing ? update.mutateAsync({ id: exercise.id, body }) : create.mutateAsync(body));
      onClose();
    } catch (error) {
      setErrors(toExerciseErrors(error));
    }
  }

  return (
    <Dialog
      open={open}
      dismissible={!saving}
      onOpenChange={(next) => !next && onClose()}
      title={editing ? 'Editar ejercicio' : 'Nuevo ejercicio'}
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
          label="Grupo muscular"
          name="muscle_group"
          options={editing ? MUSCLE_OPTIONS : [MUSCLE_PLACEHOLDER, ...MUSCLE_OPTIONS]}
          defaultValue={defaults.muscle_group}
          error={fields.muscle_group}
        />
        <Select
          label="Equipamiento (opcional)"
          name="equipment"
          options={equipmentOptionsFor(exercise)}
          defaultValue={defaults.equipment}
          error={fields.equipment}
        />
        <Textarea
          label="Descripción (opcional)"
          name="description"
          defaultValue={defaults.description}
          hint="Hasta 1000 caracteres"
          error={fields.description}
        />
        <Input
          label="Link del video (opcional)"
          name="video_url"
          type="url"
          autoComplete="off"
          defaultValue={defaults.video_url}
          hint="YouTube u otro link http/https"
          error={fields.video_url}
        />
      </form>
    </Dialog>
  );
}
