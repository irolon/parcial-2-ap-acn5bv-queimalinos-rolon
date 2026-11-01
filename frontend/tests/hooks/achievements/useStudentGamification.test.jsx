import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useStudentStreakQuery } from '@/hooks/achievements/useStudentGamification';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderQuery(id) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(() => useStudentStreakQuery(id), { wrapper }) };
}

describe('useStudentStreakQuery', () => {
  it('pide la racha del alumno y la guarda con la clave ["student-streak", id]', async () => {
    const data = { current_streak_days: 4, longest_streak_days: 9, last_session_date: '2026-10-31' };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    const { result, client } = renderQuery('s-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/students/s-1/streak']);
    expect(client.getQueryData(['student-streak', 's-1'])).toEqual(data);
  });

  it('sin id no pide nada', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: {} }));
    const { result } = renderQuery(undefined);
    await act(() => Promise.resolve());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('un error del servidor queda como error', async () => {
    stubFetch(async () => errorResponse(500, 'INTERNAL'));
    const { result } = renderQuery('s-1');
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
