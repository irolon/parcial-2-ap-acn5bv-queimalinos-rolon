import Input from '@/components/shared/ui/Input';
import Select from '@/components/shared/ui/Select';
import DayPicker from './DayPicker';
import { ROUTINE_GOAL_OPTIONS } from '@/utils/routines/routineForm';

const OPTIONS = [{ value: '', label: 'Elegí un objetivo' }, ...ROUTINE_GOAL_OPTIONS];

/** Nombre, objetivo y días de la rutina; `errors` es el `header` de `validateRoutine`. `disabled` bloquea los campos mientras no cargó la biblioteca. `onClearTemplate` desvincula la plantilla de origen. */
export default function RoutineHeader({ state, errors = {}, disabled = false, onChange, onToggleDay, onClearTemplate }) {
  return (
    <div className="flex flex-col gap-4">
      {state.templateName && (
        <p className="flex items-center gap-3 font-mono text-[11px] uppercase text-ink6">
          <span>Desde: {state.templateName}</span>
          <button
            type="button"
            aria-label="Quitar plantilla de origen"
            onClick={onClearTemplate}
            className="cursor-pointer underline hover:text-bone0 focus-visible:outline-2 focus-visible:outline-accentText"
          >
            Quitar
          </button>
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nombre de la rutina"
          value={state.name}
          error={errors.name}
          disabled={disabled}
          onChange={(event) => onChange('name', event.target.value)}
          className="min-w-0"
        />
        <Select
          label="Objetivo"
          options={OPTIONS}
          value={state.goal}
          error={errors.goal}
          disabled={disabled}
          onChange={(event) => onChange('goal', event.target.value)}
          className="min-w-0"
        />
      </div>
      <DayPicker value={state.days} onToggle={onToggleDay} error={errors.days} disabled={disabled} />
    </div>
  );
}
