import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { useApplySuggestion } from '@/hooks/chat/useApplySuggestion';
import { readWorkout, resetWorkoutStore, writeWorkout } from '@/hooks/workout/workoutStore';
import { setCursor } from '@/utils/workout/workoutState/workoutState';
import { STUDENT, signInAs } from '../../helpers/workout/activeWorkout';
import { freshWorkout, withSets } from '../../helpers/workout/workout';

const INCLINE = { exercise_id: 'e-9', name: 'Press inclinado', reason: 'Otro ángulo' };
const answer = (exerciseId = 'e-1', createdAt = new Date().toISOString()) =>
  ({ id: 'a-1', role: 'assistant', content: 'Ok', created_at: createdAt, exercise_id: exerciseId });

function renderApply(message) {
  const client = new QueryClient();
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useApplySuggestion(message)(INCLINE), { wrapper });
}

beforeEach(() => {
  localStorage.clear();
  resetWorkoutStore();
  signInAs(STUDENT);
});
afterEach(resetWorkoutStore);

describe('useApplySuggestion', () => {
  it('con la sesión en curso en ese ejercicio: se puede y apply la reemplaza', () => {
    writeWorkout(STUDENT, freshWorkout());
    const { result } = renderApply(answer());
    expect(result.current).toMatchObject({ status: 'can', planned: 'Press banca' });
    act(() => { result.current.apply(); });
    expect(readWorkout(STUDENT).exercises[0]).toMatchObject({ exerciseId: 'e-9', name: 'Press inclinado', originalExerciseId: 'e-1' });
    expect(result.current.status).toBe('applied');
  });

  it('pedida en A con el cursor en B: no se aplica', () => {
    writeWorkout(STUDENT, setCursor(freshWorkout(), 1));
    expect(renderApply(answer()).result.current.status).toBe('none');
  });

  it('con series: bloqueado; sin sesión: nada', () => {
    writeWorkout(STUDENT, withSets(freshWorkout(), [[0, 60, 10]]));
    expect(renderApply(answer()).result.current.status).toBe('locked');
    writeWorkout(STUDENT, null);
    expect(renderApply(answer()).result.current.status).toBe('none');
  });

  it('una respuesta de ayer no se aplica', () => {
    writeWorkout(STUDENT, freshWorkout());
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    expect(renderApply(answer('e-1', yesterday)).result.current.status).toBe('none');
  });
});
