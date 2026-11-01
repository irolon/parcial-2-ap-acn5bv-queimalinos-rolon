import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCreateMetric, useDeleteMetric, useMetricsQuery } from '@/hooks/body-metrics/useBodyMetrics';
import { useBodyProgress, useProgressOverview } from '@/hooks/progress/useProgress';
import { useStudentQuery } from '@/hooks/students/useStudents';
import { calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { metric, studentDetail } from '../../helpers/students/fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const BODY = { points: [], summary: { weight_kg: null, body_fat_pct: null, waist_cm: null } };
const NEW_METRIC = { id: 'm-new', weight_kg: 80, recorded_at: '2026-11-01T13:00:00.000Z' };

// Todo lo que depende de las medidas, activo a la vez, como cuando se ve en pantalla.
function mount() {
  const fetchMock = stubFetch(async (url, init = {}) => {
    const path = url.replace(/^.*\/api/, '');
    if (init.method === 'POST') return jsonResponse(201, { data: metric() });
    if (init.method === 'DELETE') return jsonResponse(204);
    if (path.startsWith('/progress/body/')) return jsonResponse(200, { data: BODY });
    if (path.startsWith('/progress/overview')) return jsonResponse(200, { data: { exercises: [], weekly_volume: [] } });
    if (path.endsWith('/metrics')) return jsonResponse(200, { data: [] });
    return jsonResponse(200, { data: studentDetail({ id: 's-1' }) });
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(
    () => ({
      list: useMetricsQuery('s-1'),
      student: useStudentQuery('s-1'),
      body: useBodyProgress('s-1'),
      overview: useProgressOverview('s-1'),
      create: useCreateMetric('s-1'),
      remove: useDeleteMetric('s-1'),
    }),
    { wrapper },
  );
  return { fetchMock, ...hook };
}

// Los GET a `path` (sin la query).
const gets = (fetchMock, path) =>
  calls(fetchMock).filter(([p, init]) => init.method === 'GET' && p.split('?')[0] === path);

async function ready(result) {
  await waitFor(() => {
    const { list, student, body, overview } = result.current;
    expect([list, student, body, overview].every((query) => query.isSuccess)).toBe(true);
  });
}

describe('useCreateMetric / useDeleteMetric', () => {
  it('cargar una medida vuelve a pedir el historial, la ficha y el progreso corporal del alumno', async () => {
    const { fetchMock, result } = mount();
    await ready(result);
    await act(() => result.current.create.mutateAsync(NEW_METRIC));
    await waitFor(() => {
      expect(gets(fetchMock, '/students/s-1/metrics')).toHaveLength(2);
      expect(gets(fetchMock, '/students/s-1')).toHaveLength(2);
      expect(gets(fetchMock, '/progress/body/s-1')).toHaveLength(2);
    });
  });

  it('borrar una medida vuelve a pedir lo mismo', async () => {
    const { fetchMock, result } = mount();
    await ready(result);
    await act(() => result.current.remove.mutateAsync('m-1'));
    await waitFor(() => {
      expect(gets(fetchMock, '/students/s-1/metrics')).toHaveLength(2);
      expect(gets(fetchMock, '/progress/body/s-1')).toHaveLength(2);
    });
    const deletes = calls(fetchMock).filter(([, init]) => init.method === 'DELETE');
    expect(deletes.map(([path]) => path)).toEqual(['/students/s-1/metrics/m-1']);
  });

  it('del progreso solo pide de nuevo el corporal: el overview de los ejercicios no cambia con una medida', async () => {
    const { fetchMock, result } = mount();
    await ready(result);
    await act(() => result.current.create.mutateAsync(NEW_METRIC));
    await waitFor(() => expect(gets(fetchMock, '/progress/body/s-1')).toHaveLength(2));
    expect(gets(fetchMock, '/progress/overview')).toHaveLength(1);
  });

  it('si la mutación falla no invalida nada', async () => {
    const { fetchMock, result } = mount();
    await ready(result);
    fetchMock.mockImplementationOnce(async () => jsonResponse(500, { error: { code: 'INTERNAL', message: 'x' } }));
    await act(() => result.current.create.mutateAsync(NEW_METRIC).catch(() => {}));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(result.current.create.isError).toBe(true);
    expect(gets(fetchMock, '/progress/body/s-1')).toHaveLength(1);
    expect(gets(fetchMock, '/students/s-1/metrics')).toHaveLength(1);
  });
});
