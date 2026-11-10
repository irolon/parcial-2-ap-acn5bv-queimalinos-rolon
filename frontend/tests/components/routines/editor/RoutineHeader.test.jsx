import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoutineHeader from '@/components/routines/editor/RoutineHeader';
import { EMPTY_ROUTINE, makeExercise, updateExercise } from '@/utils/routines/editorState';

const DURATION = /^Duración estimada/;
const handlers = { onChange: vi.fn(), onToggleDay: vi.fn(), onClearTemplate: vi.fn() };
const show = (state) => render(<RoutineHeader state={state} {...handlers} />);

// 4 × (45 + 90) = 540 s y 3 × (45 + 60) = 315 s: 14,25 min.
const withTwo = () => ({
  ...EMPTY_ROUTINE,
  exercises: [
    makeExercise('e-1', { sets: 4, reps: 10, rest_seconds: 90 }),
    makeExercise('e-2', { sets: 3, reps: 12, rest_seconds: 60 }),
  ],
});

describe('RoutineHeader: duración estimada', () => {
  it('con dos ejercicios muestra la duración y cómo se calcula', () => {
    show(withTwo());
    const duration = screen.getByText(DURATION);
    expect(duration).toHaveTextContent('Duración estimada ~14 min');
    expect(duration).toHaveAttribute('title', 'Series × (45 s de trabajo + descanso)');
  });

  it('se recalcula al cambiar las series', () => {
    const state = withTwo();
    const { rerender } = show(state);
    const fewer = updateExercise(state, state.exercises[0].key, 'sets', '1');
    rerender(<RoutineHeader state={fewer} {...handlers} />);
    expect(screen.getByText(DURATION)).toHaveTextContent('~8 min'); // 135 s + 315 s = 7,5 min
  });

  it('sin ejercicios no aparece', () => {
    show(EMPTY_ROUTINE);
    expect(screen.queryByText(DURATION)).toBeNull();
  });

  it('con ejercicios pero todo vacío (0 min) tampoco aparece', () => {
    const state = withTwo();
    const empty = state.exercises.reduce(
      (acc, ex) => ['sets', 'reps', 'rest_seconds'].reduce((s, field) => updateExercise(s, ex.key, field, ''), acc),
      state,
    );
    show(empty);
    expect(screen.queryByText(DURATION)).toBeNull();
  });
});
