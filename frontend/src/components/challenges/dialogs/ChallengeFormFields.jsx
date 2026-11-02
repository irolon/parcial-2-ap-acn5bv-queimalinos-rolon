import { useId } from 'react';
import Input from '@/components/shared/ui/Input';
import Select from '@/components/shared/ui/Select';
import Textarea from '@/components/shared/ui/Textarea';
import { GOAL_OPTIONS, MAX_DESCRIPTION, MAX_NAME } from '@/utils/challenges/challengeForm';

export const REWARD_HINT = 'Se otorga la primera vez que el alumno cumple un desafío';

/** Checkbox del premio "Desafío cumplido" con su ayuda. */
function RewardField({ checked, onChange }) {
  const hintId = useId();
  return (
    <div>
      <label className="flex cursor-pointer items-center gap-3 font-body text-sm text-bone0">
        <input
          type="checkbox"
          className="size-4 accent-accent"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={hintId}
        />
        Premio: Desafío cumplido
      </label>
      <p id={hintId} className="mt-1.5 font-mono text-[10px] text-ink6">
        {REWARD_HINT}
      </p>
    </div>
  );
}

/**
 * Campos del formulario de desafío. `values` como `DEFAULT_CHALLENGE_FORM`, `errors` por campo y
 * `onChange(field, value)`. Sin `withReward` (el catálogo no tiene `CHALLENGE_DONE`) no se ofrece premio.
 */
export default function ChallengeFormFields({ values, errors, onChange, withReward }) {
  const goal = GOAL_OPTIONS.find((o) => o.value === values.goal_type) ?? GOAL_OPTIONS[0];
  const text = (field) => (event) => onChange(field, event.target.value);

  return (
    <div className="flex flex-col gap-4">
      <Input label="Nombre" value={values.name} maxLength={MAX_NAME} error={errors.name} onChange={text('name')} />
      <Select
        label="Tipo de meta"
        options={GOAL_OPTIONS}
        value={values.goal_type}
        error={errors.goal_type}
        hint={goal.hint}
        onChange={text('goal_type')}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={`Valor (${goal.unit})`}
          inputMode="decimal"
          value={values.goal_value}
          error={errors.goal_value}
          onChange={text('goal_value')}
        />
        <Input
          label="Duración (días)"
          inputMode="numeric"
          value={values.duration_days}
          error={errors.duration_days}
          onChange={text('duration_days')}
        />
      </div>
      {withReward && <RewardField checked={values.reward} onChange={(checked) => onChange('reward', checked)} />}
      <Textarea
        label="Descripción (opcional)"
        value={values.description}
        maxLength={MAX_DESCRIPTION}
        error={errors.description}
        onChange={text('description')}
      />
    </div>
  );
}
