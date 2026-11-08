import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAttendanceQuery } from '@/hooks/students/useAttendance';
import { useCommitment } from '@/hooks/students/useCommitment';
import { STREAK } from '../../helpers/achievements/gamification';
import { sessionItem, sessionsPage } from '../../helpers/sessions/sessions';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { ATTENDANCE } from '../../helpers/students/attendance';

const NOW = new Date('2026-11-08T15:00:00Z');
const WEEKS = [1000, 1000, 1000, 1000, 1200, 1000, 1000, 1160].map((v, i) => ({
  week_start: `2026-09-${10 + i}`,
  volume_kg: v,
  sessions: 1,
}));
const SESSIONS = sessionsPage([
  sessionItem({ id: 'a', started_at: '2026-11-06T20:00:00Z', finished_at: '2026-11-06T21:00:00Z', rpe: 8 }),
  sessionItem({ id: 'b', started_at: '2026-11-04T20:00:00Z', finished_at: '2026-11-04T21:00:00Z', rpe: 7 }),
  sessionItem({ id: 'c', started_at: '2026-10-28T20:00:00Z', finished_at: '2026-10-28T21:00:00Z', rpe: 3 }),
]);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Stub con las 4 rutas; `fail` es la lista de las que dan 500 (attendance, streak, overview, sessions). */
function stub(fail = []) {
  return stubFetch(async (url) => {
    const path = url.replace(/^.*\/api/, '');
    const kind = ['attendance', 'streak', 'overview', 'sessions'].find((k) => path.includes(`/${k}`));
    if (fail.includes(kind)) return errorResponse(500, 'INTERNAL');
    if (kind === 'attendance') return jsonResponse(200, { data: ATTENDANCE });
    if (kind === 'streak') return jsonResponse(200, { data: STREAK });
    if (kind === 'overview') return jsonResponse(200, { data: { exercises: [], weekly_volume: WEEKS } });
    if (kind === 'sessions') return jsonResponse(200, SESSIONS);
    return errorResponse(500, 'INTERNAL', 'Sin handler');
  });
}

function renderCommitment(options = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(() => useCommitment('s-1', { now: NOW, ...options }), { wrapper }) };
}

const paths = (fetchMock) => calls(fetchMock).map(([path]) => path);

describe('useAttendanceQuery', () => {
  it('guarda la asistencia bajo ["students", id, "attendance", mes]', async () => {
    stub();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useAttendanceQuery('s-1', '2026-11'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(['students', 's-1', 'attendance', '2026-11'])).toEqual(ATTENDANCE);
  });
});

describe('useCommitment', () => {
  it('junta la asistencia del mes y la racha; sin opciones no pide historial ni overview', async () => {
    const fetchMock = stub();
    const { result } = renderCommitment();
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current).toMatchObject({ month: '2026-11', isError: false, attendance: ATTENDANCE, streak: STREAK });
    expect(paths(fetchMock).sort()).toEqual(['/students/s-1/attendance?month=2026-11', '/students/s-1/streak']);
  });

  it('con withVolume pide las 8 semanas completas de overview (sin la en curso) y suma las 4 últimas', async () => {
    const fetchMock = stub();
    const { result } = renderCommitment({ withVolume: true });
    await waitFor(() => expect(result.current.volume).toEqual({ total: 4360, deltaPct: 9 }));
    expect(paths(fetchMock)).toContain('/progress/overview?student_id=s-1&from=2026-09-07&to=2026-11-01');
  });

  it('con withRpe promedia el RPE del mes desde la primera página del historial', async () => {
    const fetchMock = stub();
    const { result } = renderCommitment({ withRpe: true });
    await waitFor(() => expect(result.current.rpe).toEqual({ average: 7.5, count: 2, partial: false }));
    expect(paths(fetchMock).filter((p) => p.includes('/sessions'))).toEqual(['/students/s-1/sessions?page=1&limit=20']);
  });

  it('si fallan el overview o el historial, solo esos datos quedan marcados como fallidos', async () => {
    stub(['overview', 'sessions']);
    const { result } = renderCommitment({ withRpe: true, withVolume: true });
    await waitFor(() => expect(result.current.volumeFailed && result.current.rpeFailed).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(result.current.attendance).toEqual(ATTENDANCE);
  });

  it('si falla la asistencia hay error y Reintentar vuelve a pedir solo lo que falló', async () => {
    const fail = ['attendance'];
    const fetchMock = stub(fail);
    const { result } = renderCommitment();
    await waitFor(() => expect(result.current.isError).toBe(true));
    fail.length = 0;
    await act(() => result.current.retry());
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(paths(fetchMock).filter((p) => p.includes('/attendance'))).toHaveLength(2);
    expect(paths(fetchMock).filter((p) => p.endsWith('/streak'))).toHaveLength(1);
  });

  it('al pasar la medianoche dentro del mismo mes vuelve a pedir la asistencia y la racha', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-11-11T02:59:00Z')); // 23:59 del 10/11 en Argentina
    try {
      const fetchMock = stub();
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useCommitment('s-1'), { wrapper });
      await vi.waitFor(() => expect(result.current.isPending).toBe(false));
      const count = (suffix) => paths(fetchMock).filter((p) => p.endsWith(suffix)).length;
      expect([count('/attendance?month=2026-11'), count('/streak')]).toEqual([1, 1]);
      act(() => vi.advanceTimersByTime(2 * 60_000));
      expect(result.current.month).toBe('2026-11');
      await vi.waitFor(() => expect([count('/attendance?month=2026-11'), count('/streak')]).toEqual([2, 2]));
    } finally {
      vi.useRealTimers();
    }
  });

  it('al pasar la medianoche del día 1 (hora argentina) con la pantalla abierta pide la asistencia del mes nuevo', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-12-01T02:59:00Z')); // 23:59 del 30/11 en Argentina
    try {
      const fetchMock = stub();
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
      const { result } = renderHook(() => useCommitment('s-1'), { wrapper });
      await vi.waitFor(() => expect(result.current.isPending).toBe(false));
      expect(result.current.month).toBe('2026-11');
      act(() => vi.advanceTimersByTime(2 * 60_000));
      expect(result.current.month).toBe('2026-12');
      await vi.waitFor(() =>
        expect(paths(fetchMock)).toContain('/students/s-1/attendance?month=2026-12'),
      );
      // Cambiar de día también invalida la asistencia, pero sin pedir dos veces la del mes nuevo.
      expect(paths(fetchMock).filter((p) => p.endsWith('month=2026-12'))).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
