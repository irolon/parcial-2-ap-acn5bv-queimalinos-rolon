import { useState } from 'react';
import { Check, Dumbbell, Sparkles } from 'lucide-react';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import {
  KG_INPUT, KG_STEP, REPS_INPUT, REPS_STEP, cleanKgText, cleanRepsText, stepKg, stepReps, validateLoad,
} from '@/utils/sessions/loadFields';
import { kgLabel, kgText } from '@/utils/sessions/workoutFormat';
import { exerciseSets, planLoad, prefill } from '@/utils/workout/workoutState';
import LoadField from './LoadField';

const MINUS = '−';

// "SERIE 3 DE 4 · SUGERIDO 70 KG × 8". Pasadas las series del plan, la que sigue es una extra.
function chipText(exercise, done) {
  const plan = planLoad(exercise);
  const serie = done < exercise.sets ? `SERIE ${done + 1} DE ${exercise.sets}` : `SERIE ${done + 1} · EXTRA`;
  const suggested = plan.kg === null ? `SUGERIDO ${plan.reps} REPS` : `SUGERIDO ${kgText(plan.kg)} KG × ${plan.reps}`;
  return `${serie} · ${suggested}`;
}

const goal = (exercise) => [
  `OBJETIVO ${exercise.sets} × ${exercise.reps}`,
  exercise.restSeconds > 0 ? `DESCANSO ${exercise.restSeconds}″` : 'SIN DESCANSO',
].join(' · ');

const initialFields = (workout) => {
  const { kg, reps } = prefill(workout);
  return { kg: kgText(kg), reps: String(reps) };
};

/**
 * El ejercicio a la vista: su nombre, la serie que toca, los campos de peso y reps (con sus botones de paso) y
 * Registrar serie. Los campos se precargan con `prefill` cada vez que cambia el ejercicio o las series registradas.
 * `onRegister(kg, reps)` devuelve la sesión nueva (o la misma si el motor no registró). `registerRef` es el ref del
 * botón Registrar serie: la página lo usa para llevar el foco ahí cuando el botón que lo tenía desaparece.
 */
export default function ExercisePanel({ workout, onRegister, registerRef }) {
  const exercise = workout.exercises[workout.cursor];
  const done = exerciseSets(workout).length;
  const prefillKey = `${workout.cursor}:${done}`;
  const [fields, setFields] = useState(() => initialFields(workout));
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [seenKey, setSeenKey] = useState(prefillKey);
  if (seenKey !== prefillKey) {
    setSeenKey(prefillKey);
    setFields(initialFields(workout));
    setErrors({});
    // El aviso es de la serie que se acaba de registrar: si cambia el ejercicio o las series (se borra una, se sigue
    // registrando), ya no corresponde y no vuelve aunque se regrese a este mismo punto.
    if (notice?.key !== prefillKey) setNotice(null);
  }

  const edit = (field, value) => {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };
  const typing = (field, allowed) => (event) => allowed.test(event.target.value) && edit(field, event.target.value);

  function submit(event) {
    event.preventDefault();
    const problems = validateLoad(fields.kg, fields.reps);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    const next = onRegister(fields.kg, fields.reps);
    if (!next || next.sets.length === workout.sets.length) {
      setErrors({ form: 'No pudimos registrar la serie.' });
      return;
    }
    const set = next.sets.at(-1);
    setNotice({
      key: `${workout.cursor}:${done + 1}`, // el prefillKey con el que queda el panel después de registrar
      text: `Serie ${set.setNumber} registrada · ${kgLabel(set.kg)} × ${set.reps}`,
    });
  }

  return (
    <Card padding={24} className="flex h-full flex-col">
      <div className="mb-5 flex items-center gap-4">
        <div aria-hidden="true" className="hidden size-[72px] shrink-0 items-center justify-center rounded-lg bg-ink3 text-ink6 sm:flex">
          <Dumbbell size={30} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold tracking-[-1px] text-bone0 sm:text-[26px]">{exercise.name}</h2>
          <p className="mt-1 font-mono text-[10px] tracking-[0.5px] text-ink6">{goal(exercise)}</p>
        </div>
      </div>

      <p className="mb-5 inline-flex items-center gap-2 self-start rounded-pill border border-accent/40 bg-accent/15 px-3.5 py-2 font-mono text-[10px] tracking-[0.5px] text-bone0">
        <Sparkles size={13} className="text-accentText" aria-hidden="true" />
        {chipText(exercise, done)}
      </p>

      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <div className="mb-5 flex gap-3 sm:gap-4">
          <LoadField
            label="Peso"
            ariaLabel="Peso (kg)"
            unit="KG"
            inputMode="decimal"
            placeholder="Peso corporal"
            value={fields.kg}
            error={errors.kg}
            onChange={typing('kg', KG_INPUT)}
            onBlur={() => edit('kg', cleanKgText(fields.kg))}
            steps={[
              { text: `${MINUS}2,5`, label: `${MINUS}2,5 kg`, onClick: () => edit('kg', stepKg(fields.kg, -KG_STEP)) },
              { text: '+2,5', label: '+2,5 kg', onClick: () => edit('kg', stepKg(fields.kg, KG_STEP)) },
            ]}
          />
          <LoadField
            label="Repeticiones"
            ariaLabel="Repeticiones"
            unit="×"
            inputMode="numeric"
            value={fields.reps}
            error={errors.reps}
            onChange={typing('reps', REPS_INPUT)}
            onBlur={() => edit('reps', cleanRepsText(fields.reps))}
            steps={[
              { text: `${MINUS}1`, label: `${MINUS}1 rep`, onClick: () => edit('reps', stepReps(fields.reps, -REPS_STEP)) },
              { text: '+1', label: '+1 rep', onClick: () => edit('reps', stepReps(fields.reps, REPS_STEP)) },
            ]}
          />
        </div>
        {errors.form && <p role="alert" className="mb-3 font-mono text-[11px] text-hot">{errors.form}</p>}
        <div className="mt-auto">
          <Button ref={registerRef} type="submit" size="lg" full>
            <Check size={18} aria-hidden="true" />
            Registrar serie
          </Button>
          <p role="status" className="mt-3 min-h-4 text-center font-mono text-[11px] text-good">
            {notice?.key === prefillKey ? notice.text : ''}
          </p>
        </div>
      </form>
    </Card>
  );
}
