import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSessionsInfinite } from '@/hooks/sessions/useSessions';
import { useCommitment } from '@/hooks/students/useCommitment';
import { STREAK } from '../../helpers/achievements/gamification';
import { sessionItem, sessionsPage } from '../../helpers/sessions/sessions';
import { errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { ATTENDANCE } from '../../helpers/students/attendance';

const NOW = new Date('2026-11-08T15:00:00Z');
const november = (i) =>
  sessionItem({ id: `n-${i}`, started_at: '2026-11-06T20:00:00Z', finished_at: '2026-11-06T21:00:00Z', rpe: 8 });
// Primera página llena de sesiones del mes (hay más): el promedio es solo de las últimas 20.
const FIRST = sessionsPage(Array.from({ length: 20 }, (_, i) => november(i)), { totalPages: 2, total: 21 });
const SECOND = sessionsPage([november(20)], { page: 2, totalPages: 2, total: 21 });
const AVERAGE = { average: 8, count: 20, partial: true };

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Asistencia, racha y las dos páginas del historial; con `failSecond` la segunda da 500. */
function stub({ failSecond = false } = {}) {
  return stubFetch(async (url) => {
    const path = url.replace(/^.*\/api/, '');
    if (path.includes('/attendance')) return jsonResponse(200, { data: ATTENDANCE });
    if (path.endsWith('/streak')) return jsonResponse(200, { data: STREAK });
    if (path.includes('/sessions?page=1')) return jsonResponse(200, FIRST);
    if (path.includes('/sessions?page=2')) return failSecond ? errorResponse(500, 'INTERNAL') : jsonResponse(200, SECOND);
    return errorResponse(500, 'INTERNAL', 'Sin handler');
  });
}

/** El compromiso con RPE y, al lado, el historial de la ficha (`SessionsHistory`), que comparte la caché. */
function renderWithHistory() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(
    () => ({ commitment: useCommitment('s-1', { withRpe: true, now: NOW }), history: useSessionsInfinite('s-1') }),
    { wrapper },
  );
}

describe('useCommitment con el historial paginado', () => {
  it('con todas las páginas cargadas ("Cargar más"), el promedio sigue aclarando que es de las últimas 20', async () => {
    stub();
    const { result } = renderWithHistory();
    await waitFor(() => expect(result.current.commitment.rpe).toEqual(AVERAGE));
    await act(() => result.current.history.fetchNextPage());
    await waitFor(() => expect(result.current.history.data.pages).toHaveLength(2));
    expect(result.current.history.hasNextPage).toBe(false);
    expect(result.current.commitment.rpe).toEqual(AVERAGE);
  });

  it('si falla solo "Cargar más", el promedio de la primera página se conserva', async () => {
    stub({ failSecond: true });
    const { result } = renderWithHistory();
    await waitFor(() => expect(result.current.commitment.rpe).toEqual(AVERAGE));
    await act(() => result.current.history.fetchNextPage());
    await waitFor(() => expect(result.current.history.isError).toBe(true));
    expect(result.current.commitment.rpeFailed).toBe(false);
    expect(result.current.commitment.rpe).toEqual(AVERAGE);
  });
});
