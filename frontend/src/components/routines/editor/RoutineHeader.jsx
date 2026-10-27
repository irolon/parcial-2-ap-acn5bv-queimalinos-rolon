import Input from '@/components/shared/ui/Input';
import Select from '@/components/shared/ui/Select';
import DayPicker from './DayPicker';
import { GOAL_OPTIONS } from '@/utils/students/studentOptions';

const OPTIONS = [{ value: '', label: 'Elegí un objetivo' }, ...GOAL_OPTIONS.filter((option) => option.value)];

/** Nombre, objetivo y días de la rutina; `errors` es el `header` de `validateRoutine`. */
export default function RoutineHeader({ state, errors = {}, onChange, onToggleDay }) {
  return (
    <div className="flex flex-col gap-4">
      {state.templateName && (
        <p className="font-mono text-[11px] uppercase text-ink6">Desde: {state.templateName}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nombre de la rutina"
          value={state.name}
          error={errors.name}
          onChange={(event) => onChange('name', event.target.value)}
          className="min-w-0"
        />
        <Select
          label="Objetivo"
          options={OPTIONS}
          value={state.goal}
          error={errors.goal}
          onChange={(event) => onChange('goal', event.target.value)}
          className="min-w-0"
        />
      </div>
      <DayPicker value={state.days} onToggle={onToggleDay} error={errors.days} />
    </div>
  );
}
