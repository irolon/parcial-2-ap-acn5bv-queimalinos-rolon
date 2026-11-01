import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  ACHIEVEMENT_PROGRESS_KEY,
  STUDENT_ACHIEVEMENTS_KEY,
  STUDENT_CHALLENGES_KEY,
  STUDENT_STREAK_KEY,
  useAchievementProgressQuery,
  useStudentAchievementsQuery,
  useStudentChallengesQuery,
  useStudentStreakQuery,
} from '@/hooks/achievements/useStudentGamification';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderQuery(hook, id) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(() => hook(id), { wrapper }) };
}

describe('claves de las consultas del alumno', () => {
  it('son los prefijos que invalidan quienes cambian sus datos (un entrenamiento, una asignación, un día nuevo)', () => {
    expect(STUDENT_STREAK_KEY).toEqual(['student-streak']);
    expect(STUDENT_ACHIEVEMENTS_KEY).toEqual(['student-achievements']);
    expect(STUDENT_CHALLENGES_KEY).toEqual(['student-challenges']);
    expect(ACHIEVEMENT_PROGRESS_KEY).toEqual(['student-achievement-progress']);
  });

  it.each([
    ['useStudentStreakQuery', useStudentStreakQuery, STUDENT_STREAK_KEY],
    ['useStudentAchievementsQuery', useStudentAchievementsQuery, STUDENT_ACHIEVEMENTS_KEY],
    ['useStudentChallengesQuery', useStudentChallengesQuery, STUDENT_CHALLENGES_KEY],
    ['useAchievementProgressQuery', useAchievementProgressQuery, ACHIEVEMENT_PROGRESS_KEY],
  ])('%s guarda su dato bajo [prefijo, id del alumno]', async (name, hook, key) => {
    stubFetch(async () => jsonResponse(200, { data: [{ id: 'x' }] }));
    const { result, client } = renderQuery(hook, 's-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData([...key, 's-1'])).toEqual([{ id: 'x' }]);
  });
});

describe('useStudentStreakQuery', () => {
  it('pide la racha del alumno y la guarda con la clave ["student-streak", id]', async () => {
    const data = { current_streak_days: 4, longest_streak_days: 9, last_session_date: '2026-10-31' };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    const { result, client } = renderQuery(useStudentStreakQuery, 's-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/students/s-1/streak']);
    expect(client.getQueryData(['student-streak', 's-1'])).toEqual(data);
  });

  it('sin id no pide nada', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: {} }));
    const { result } = renderQuery(useStudentStreakQuery, undefined);
    await act(() => Promise.resolve());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('un error del servidor queda como error', async () => {
    stubFetch(async () => errorResponse(500, 'INTERNAL'));
    const { result } = renderQuery(useStudentStreakQuery, 's-1');
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useAchievementProgressQuery', () => {
  it('pide el progreso de logros del alumno y lo devuelve entero', async () => {
    const data = { streak: {}, facts: {}, assigned_days: [], achievements: [{ code: 'SESSIONS_10', current: 3, target: 10 }] };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    const { result } = renderQuery(useAchievementProgressQuery, 's-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/students/s-1/achievements/progress']);
  });

  it('sin id no pide nada', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: {} }));
    const { result } = renderQuery(useAchievementProgressQuery, undefined);
    await act(() => Promise.resolve());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('un error del servidor queda como error', async () => {
    stubFetch(async () => errorResponse(500, 'INTERNAL'));
    const { result } = renderQuery(useAchievementProgressQuery, 's-1');
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
