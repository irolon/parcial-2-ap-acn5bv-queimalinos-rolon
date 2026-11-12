import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCompareCurves } from '@/hooks/progress/useCompareCurves';
import { progressUrls } from '../../../helpers/progress/progress';
import { jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const ex = (id, name, days) => ({ id, name, days, muscle_group: 'x', last_date: '2026-10-27' });
const EXERCISES = [ex('ex-1', 'Press banca', 8), ex('ex-2', 'Sentadilla', 7), ex('ex-3', 'Peso muerto', 6), ex('ex-5', 'Remo', 5)];
const RANGE = { from: '2026-08-03', to: '2026-11-08' };

// Remo (ex-5) no tiene ningún 1RM estimado; Peso muerto (ex-3) tiene volumen en un solo punto.
const points = (id) => Array.from({ length: 4 }, (_, i) => ({
  date: `2026-10-${String(i * 3 + 1).padStart(2, '0')}`,
  max_kg: 80 + i,
  e1rm_kg: id === 'ex-5' ? null : 90 + i,
  volume_kg: id === 'ex-3' && i > 0 ? null : 800 + i,
  sets: 3,
  reps: 24,
}));

function mount(initialProps) {
  const fetchMock = stubFetch(async (url) => {
    const id = /\/progress\/exercise\/([^/?]+)/.exec(url)[1];
    return jsonResponse(200, { data: { exercise: { id }, points: points(id), pr: {}, default_metric: 'e1rm_kg' } });
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const utils = renderHook(({ metric }) => useCompareCurves('s-1', EXERCISES, RANGE, metric), { wrapper, initialProps });
  return { fetchMock, ...utils };
}

describe('useCompareCurves: métrica elegida', () => {
  it('por defecto usa el 1RM estimado y cae a peso máximo en el que no tiene', async () => {
    const { result } = mount({});
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSlot(2, 'ex-5'));
    expect(result.current.lines.map((l) => [l.id, l.metric])).toEqual([['ex-1', 'e1rm_kg'], ['ex-2', 'e1rm_kg'], ['ex-5', 'max_kg']]);
  });

  it('con volumen todas las líneas usan volumen y cuenta sus puntos válidos', async () => {
    const { result } = mount({ metric: 'volume_kg' });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.slots).toEqual(['ex-1', 'ex-2', 'ex-5']);
    expect(result.current.lines.every((l) => l.metric === 'volume_kg')).toBe(true);
    expect(result.current.few).toEqual(new Set(['ex-3']));
  });

  it('cambiar la métrica no borra la elección a mano ni pide curvas nuevas', async () => {
    const { result, rerender, fetchMock } = mount({ metric: 'e1rm_kg' });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSlot(0, 'ex-5'));
    const before = progressUrls(fetchMock, 'exercise').length;
    rerender({ metric: 'max_kg' });
    expect(result.current.slots).toEqual(['ex-5', 'ex-2', 'ex-3']);
    expect(result.current.lines.every((l) => l.metric === 'max_kg')).toBe(true);
    expect(progressUrls(fetchMock, 'exercise')).toHaveLength(before);
  });
});
