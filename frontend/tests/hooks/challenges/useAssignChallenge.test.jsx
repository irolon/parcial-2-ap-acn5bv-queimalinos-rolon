import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { useAssignChallenge } from '@/hooks/challenges/useChallenges';
import { jsonResponse } from '../../helpers/shared/fetchMock';
import { stubChallengesApi } from '../../helpers/challenges/challenges';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Asignación como la devuelve el backend (`toAssignmentView`): no trae `student_id`. */
const view = (id) => ({ id, challenge: { id: 'c-1' }, status: 'active', current_progress: 0, progress_pct: 0 });

async function assign(response, studentIds) {
  stubChallengesApi({ assign: async () => jsonResponse(201, { data: response }) });
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useAssignChallenge(), { wrapper });
  await act(() => result.current.mutateAsync({ id: 'c-1', studentIds }));
  return invalidate.mock.calls.map(([filters]) => filters.queryKey);
}

describe('useAssignChallenge', () => {
  it('refresca la ficha de cada alumno pedido, menos los salteados, aunque created no traiga student_id', async () => {
    const keys = await assign(
      { created: [view('sc-1'), view('sc-2')], skipped: [{ student_id: 's-3', reason: 'already_active' }] },
      ['s-1', 's-2', 's-3'],
    );
    expect(keys).toContainEqual(['student-challenges', 's-1']);
    expect(keys).toContainEqual(['student-challenges', 's-2']);
    expect(keys).not.toContainEqual(['student-challenges', 's-3']);
    expect(keys).not.toContainEqual(['student-challenges', undefined]);
  });

  it('también refresca desafíos y alumnos', async () => {
    const keys = await assign({ created: [view('sc-1')], skipped: [] }, ['s-1']);
    expect(keys).toContainEqual(['challenges']);
    expect(keys.some((key) => key[0] === 'students')).toBe(true);
  });

  it('si no se creó ninguna, no refresca ninguna ficha', async () => {
    const keys = await assign({ created: [], skipped: [{ student_id: 's-1', reason: 'not_your_student' }] }, ['s-1']);
    expect(keys.some((key) => key[0] === 'student-challenges')).toBe(false);
  });
});
