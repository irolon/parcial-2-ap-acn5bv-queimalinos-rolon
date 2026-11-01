import { useState } from 'react';
import { screen } from '@testing-library/react';
import ExercisePanel from '@/components/workout/session/ExercisePanel';
import { registerSet } from '@/utils/workout/workoutState';
import { freshWorkout } from './workout';

/** Hace de página: guarda la sesión y registra con el motor, como lo hace `useActiveWorkout`. */
export function PanelHarness({ initial = freshWorkout(), spy, children }) {
  const [workout, setWorkout] = useState(initial);
  const onRegister = (kg, reps) => {
    spy?.(kg, reps);
    const next = registerSet(workout, { kg, reps }, new Date());
    setWorkout(next);
    return next;
  };
  return (
    <>
      <ExercisePanel workout={workout} onRegister={onRegister} />
      {children?.(setWorkout)}
    </>
  );
}

export const weight = () => screen.getByLabelText('Peso (kg)');
export const reps = () => screen.getByLabelText('Repeticiones');
export const register = () => screen.getByRole('button', { name: 'Registrar serie' });
