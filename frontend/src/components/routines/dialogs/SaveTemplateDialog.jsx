import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Input from '@/components/shared/ui/Input';
import Select from '@/components/shared/ui/Select';
import { useCreateTemplate } from '@/hooks/routine-templates/useRoutineTemplates';
import { fieldErrorsFrom } from '@/utils/fieldErrors';
import { buildTemplateBody } from '@/utils/routines/routineForm';
import { GOAL_OPTIONS, LEVEL_OPTIONS } from '@/utils/students/studentOptions';

const MAX_EXERCISES = 50;
const FORM_ID = 'save-template-form';
const GOALS = [{ value: '', label: 'Elegí un objetivo' }, ...GOAL_OPTIONS.filter((o) => o.value)];

function validate(form, state) {
  const errors = {};
  const name = form.name.trim();
  if (name.length < 2 || name.length > 120) errors.name = 'El nombre debe tener entre 2 y 120 caracteres';
  if (!form.goal) errors.goal = 'Elegí un objetivo';
  if (state.days.length === 0) errors.form = 'Elegí al menos un día en la rutina';
  if (state.exercises.length === 0) errors.form = 'Agregá al menos un ejercicio';
  if (state.exercises.length > MAX_EXERCISES) errors.form = `Una plantilla admite hasta ${MAX_EXERCISES} ejercicios`;
  return errors;
}

/** Guarda la estructura del editor como plantilla (no hace falta asignar antes). */
export default function SaveTemplateDialog({ state, onSaved, onClose }) {
  const [form, setForm] = useState({ name: state.name, goal: state.goal, level: '' });
  const [errors, setErrors] = useState({});
  const create = useCreateTemplate();
  const set = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (create.isPending) return;
    const found = validate(form, state);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await create.mutateAsync(buildTemplateBody(state, form));
      onSaved();
    } catch (err) {
      setErrors({ form: fieldErrorsFrom(err, { fields: [], fallback: 'No pudimos guardar la plantilla' }).form });
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
