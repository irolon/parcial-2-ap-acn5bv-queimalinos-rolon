import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Input from '@/components/shared/ui/Input';
import Select from '@/components/shared/ui/Select';
import { useCreateTemplate } from '@/hooks/routine-templates/useRoutineTemplates';
import { fieldErrorsFrom } from '@/utils/fieldErrors';
import {
  MAX_EXERCISES, NAME_ERROR, ROUTINE_GOAL_OPTIONS, buildTemplateBody, isValidName, validateRoutine,
} from '@/utils/routines/routineForm';
import { templateErrorsFor } from '@/utils/routines/serverErrors';
import { LEVEL_OPTIONS } from '@/utils/students/studentOptions';

const INVALID = 'Revisá los datos de la rutina';
const FORM_ID = 'save-template-form';
const GOALS = [{ value: '', label: 'Elegí un objetivo' }, ...ROUTINE_GOAL_OPTIONS];

function validate(form, state) {
  const errors = {};
  if (!isValidName(form.name)) errors.name = NAME_ERROR;
  if (!form.goal) errors.goal = 'Elegí un objetivo';
  if (state.days.length === 0) errors.form = 'Elegí al menos un día en la rutina';
  if (state.exercises.length === 0) errors.form = 'Agregá al menos un ejercicio';
  if (state.exercises.length > MAX_EXERCISES) errors.form = `Una plantilla admite hasta ${MAX_EXERCISES} ejercicios`;
  if (!errors.form && Object.keys(validateRoutine(state).exercises).length > 0) {
    errors.form = 'Revisá los valores de los ejercicios en la tabla';
    errors.rows = true;
  }
  return errors;
}

/**
 * Guarda la estructura del editor como plantilla (no hace falta asignar antes).
 * `onInvalid` marca la tabla (valores locales); `onServerInvalid(error)` recibe el 400 del backend para marcarla.
 */
export default function SaveTemplateDialog({ state, onSaved, onInvalid, onServerInvalid, onClose }) {
  const [form, setForm] = useState({ name: state.name, goal: state.goal, level: '' });
  const [errors, setErrors] = useState({});
  const create = useCreateTemplate();
  const set = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (create.isPending) return;
    const { rows, ...found } = validate(form, state);
    setErrors(found);
    if (rows) onInvalid?.();
    if (Object.keys(found).length > 0) return;
    try {
      await create.mutateAsync(buildTemplateBody(state, form));
      onSaved();
    } catch (err) {
      if (err?.code === 'VALIDATION_ERROR') {
        onServerInvalid?.(err);
        setErrors({ ...templateErrorsFor(err, state).dialog, form: INVALID });
      } else {
        setErrors({ form: fieldErrorsFrom(err, { fields: [], fallback: 'No pudimos guardar la plantilla' }).form });
      }
    }
  }

  return (
    <Dialog
      open
      dismissible={!create.isPending}
      onOpenChange={(next) => !next && onClose()}
      title="Guardar como plantilla"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} loading={create.isPending}>Guardar</Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {errors.form && <p role="alert" className="font-mono text-xs text-hot">{errors.form}</p>}
        <Input label="Nombre" value={form.name} onChange={set('name')} error={errors.name} />
        <Select label="Objetivo" options={GOALS} value={form.goal} onChange={set('goal')} error={errors.goal} />
        <Select label="Nivel (opcional)" options={LEVEL_OPTIONS} value={form.level} onChange={set('level')} />
      </form>
    </Dialog>
  );
}
