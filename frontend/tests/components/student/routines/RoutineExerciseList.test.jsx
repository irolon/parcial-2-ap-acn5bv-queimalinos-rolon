import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import RoutineExerciseList from '@/components/student/routines/RoutineExerciseList';
import { routineExercise } from '../../../helpers/routines/studentRoutines';

const second = (overrides = {}) => routineExercise({
  routine_exercise_id: 're-2',
  exercise: { id: 'e-2', name: 'Remo con barra', video_url: null },
  ...overrides,
});
const items = () => within(screen.getByRole('list', { name: 'Ejercicios' })).getAllByRole('listitem');

describe('RoutineExerciseList', () => {
  it('lista los ejercicios en el orden recibido con series × reps y descanso', () => {
    render(<RoutineExerciseList exercises={[routineExercise(), second({ sets: 3, reps: 12, rest_seconds: 60 })]} />);
    expect(items()).toHaveLength(2);
    expect(items()[0]).toHaveTextContent('01');
    expect(items()[0]).toHaveTextContent('Press banca');
    expect(items()[0]).toHaveTextContent('4 × 10 · Descanso 90 s');
    expect(items()[1]).toHaveTextContent('02');
    expect(items()[1]).toHaveTextContent('Remo con barra');
    expect(items()[1]).toHaveTextContent('3 × 12 · Descanso 60 s');
  });

  it('suma el tempo y las notas cuando los tiene', () => {
    render(<RoutineExerciseList exercises={[routineExercise({ tempo: '3-1-1', notes: 'Bajá controlado' })]} />);
    expect(screen.getByText('4 × 10 · Descanso 90 s · Tempo 3-1-1')).toBeInTheDocument();
    expect(screen.getByText('Bajá controlado')).toBeInTheDocument();
  });

  it('sin tempo ni notas no deja separadores ni textos vacíos', () => {
    render(<RoutineExerciseList exercises={[routineExercise({ tempo: null, notes: '' })]} />);
    expect(items()[0]).not.toHaveTextContent('Tempo');
    expect(screen.getByText('4 × 10 · Descanso 90 s')).toBeInTheDocument();
  });

  it('lo que la rutina no trae sale con los valores por defecto (3 × 10, 90 s) y un descanso en 0 es "Sin descanso"', () => {
    render(<RoutineExerciseList exercises={[
      routineExercise({ sets: null, reps: null, rest_seconds: null }),
      second({ rest_seconds: 0 }),
    ]} />);
    expect(screen.getByText('3 × 10 · Descanso 90 s')).toBeInTheDocument();
    expect(screen.getByText('4 × 10 · Sin descanso')).toBeInTheDocument();
  });

  it('el link "Ver video" abre en otra pestaña solo si el ejercicio tiene un video http(s)', () => {
    const exercises = [
      routineExercise({ exercise: { id: 'e-1', name: 'Press banca', video_url: 'https://youtu.be/abc' } }),
      second(),
      second({ routine_exercise_id: 're-3', exercise: { id: 'e-3', name: 'Dominadas', video_url: 'javascript:alert(1)' } }),
    ];
    render(<RoutineExerciseList exercises={exercises} />);
    const link = screen.getByRole('link', { name: 'Ver video de Press banca (se abre en otra pestaña)' });
    expect(link).toHaveTextContent('Ver video');
    expect(link).toHaveAttribute('href', 'https://youtu.be/abc');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(within(items()[0]).getByRole('link')).toBe(link);
  });

  it('un ejercicio sin datos del ejercicio no rompe la lista', () => {
    render(<RoutineExerciseList exercises={[routineExercise({ exercise: null })]} />);
    expect(items()[0]).toHaveTextContent('Ejercicio');
  });

  it.each([[[]], [undefined], [null]])('sin ejercicios (%s) no dibuja una lista vacía', (exercises) => {
    const { container } = render(<RoutineExerciseList exercises={exercises} />);
    expect(container).toBeEmptyDOMElement();
  });
});
