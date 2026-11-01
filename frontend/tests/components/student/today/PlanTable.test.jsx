import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PlanTable from '@/components/student/today/PlanTable';
import { routineExercise, todayRoutine } from '../../../helpers/routines/studentRoutines';

describe('PlanTable', () => {
  it('es una tabla "Plan de hoy" con #, ejercicio, series × reps y peso sugerido', () => {
    render(<PlanTable exercises={todayRoutine().exercises} />);
    const table = screen.getByRole('table', { name: 'Plan de hoy' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      '#', 'Ejercicio', 'Series × reps', 'Sugerido',
    ]);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual([
      ['01', 'Press banca', '4 × 10', '62,5 kg'],
      ['02', 'Remo con barra', '3 × 12', '—'],
    ]);
  });

  it('el peso sugerido es el de la última sesión y, si no hay, el del entrenador', () => {
    const exercises = [
      { ...routineExercise(), last_session_kg: 70, suggested_kg: 60 },
      { ...routineExercise({ routine_exercise_id: 're-2' }), last_session_kg: null, suggested_kg: 60 },
      { ...routineExercise({ routine_exercise_id: 're-3' }), last_session_kg: 0, suggested_kg: 0 },
    ];
    render(<PlanTable exercises={exercises} />);
    const cells = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[3].textContent);
    expect(cells).toEqual(['70 kg', '60 kg', '—']);
  });

  it('numera con dos dígitos desde 01 y respeta el orden recibido', () => {
    const exercises = Array.from({ length: 10 }, (_, i) => ({
      ...routineExercise({ routine_exercise_id: `re-${i}`, exercise: { id: `e-${i}`, name: `Ejercicio ${i + 1}` } }),
      last_session_kg: null,
    }));
    render(<PlanTable exercises={exercises} />);
    const numbers = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(numbers).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']);
  });

  it.each([[[]], [undefined], [null]])('sin ejercicios (%s) no dibuja una tabla vacía', (exercises) => {
    render(<PlanTable exercises={exercises} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
