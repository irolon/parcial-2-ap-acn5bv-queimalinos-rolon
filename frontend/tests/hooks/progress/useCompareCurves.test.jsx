import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCompareCurves } from '@/hooks/progress/useCompareCurves';
import { useExerciseProgress } from '@/hooks/progress/useProgress';
import { progressUrls } from '../../helpers/progress/progress';
import { jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const ex = (id, name, days) => ({ id, name, days, muscle_group: 'x', last_date: '2026-10-27' });
const EXERCISES = [
  ex('ex-1', 'Press banca', 8), ex('ex-2', 'Sentadilla', 7), ex('ex-3', 'Peso muerto', 6), ex('ex-4', 'Dominadas', 9),
  ex('ex-5', 'Remo', 5), ex('ex-6', 'Fondos', 4), ex('ex-7', 'Militar', 3), ex('ex-8', 'Curl', 2),
];
const COUNTS = { 'ex-1': 5, 'ex-2': 4, 'ex-3': 4, 'ex-5': 3, 'ex-6': 1, 'ex-7': 3 };
const RANGE = { from: '2026-08-03', to: '2026-11-08' };
const SHORT = { from: '2026-10-05', to: '2026-11-08' };

const points = (n, kg) => Array.from({ length: n }, (_, i) => ({
  date: `2026-10-${String(i * 3 + 1).padStart(2, '0')}`, max_kg: kg, e1rm_kg: kg === null ? null : kg + i, sets: 3, reps: 24,
}));

// Dominadas (ex-4) es de peso corporal; con el rango corto solo Remo (ex-5) tiene 3 puntos.
function stub() {
  return stubFetch(async (url) => {
    const path = url.replace(/^.*\/api/, '');
    const id = /^\/progress\/exercise\/([^/?]+)/.exec(path)[1];
    const short = path.includes(`from=${SHORT.from}`);
    const count = id === 'ex-4' ? 6 : short && id !== 'ex-5' ? 1 : COUNTS[id];
    return jsonResponse(200, { data: { exercise: { id }, points: points(count, id === 'ex-4' ? null : 80), pr: {}, default_metric: 'e1rm_kg' } });
  });
}

function mount(hook, initialProps = { range: RANGE }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(hook, { wrapper, initialProps });
}

const ids = (fetchMock) => progressUrls(fetchMock, 'exercise').map((p) => /exercise\/([^?]+)/.exec(p)[1]);

describe('useCompareCurves', () => {
  it('pide la curva de los 6 candidatos por días y elige los 3 con más puntos con kg', async () => {
    const fetchMock = stub();
    const { result } = mount(({ range }) => useCompareCurves('s-1', EXERCISES, range));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(ids(fetchMock)).toEqual(['ex-4', 'ex-1', 'ex-2', 'ex-3', 'ex-5', 'ex-6']);
    expect(progressUrls(fetchMock, 'exercise')[0]).toBe(`/progress/exercise/ex-4?student_id=s-1&from=${RANGE.from}&to=${RANGE.to}`);
    expect(result.current.slots).toEqual(['ex-1', 'ex-2', 'ex-3']);
    expect(result.current.lines.map((l) => l.name)).toEqual(['Press banca', 'Sentadilla', 'Peso muerto']);
    expect(result.current.lines.map((l) => l.color)).toEqual(['var(--color-accent)', 'var(--color-cool)', 'var(--color-hot)']);
    expect(result.current.bodyweight).toEqual(new Set(['ex-4']));
    expect(result.current.options.map((o) => o.id)).toEqual(['ex-4', 'ex-1', 'ex-2', 'ex-3', 'ex-5', 'ex-6', 'ex-7']);
    expect(result.current.hidden).toBe(false);
  });

  it('cambiar una línea pide la curva nueva si no estaba y reemplaza solo esa', async () => {
    const fetchMock = stub();
    const { result } = mount(({ range }) => useCompareCurves('s-1', EXERCISES, range));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSlot(1, 'ex-7'));
    expect(result.current.slots).toEqual(['ex-1', 'ex-7', 'ex-3']);
    await waitFor(() => expect(result.current.lines.map((l) => l.id)).toEqual(['ex-1', 'ex-7', 'ex-3']));
    expect(ids(fetchMock).filter((id) => id === 'ex-7')).toHaveLength(1);
    act(() => result.current.setSlot(2, ''));
    expect(result.current.slots).toEqual(['ex-1', 'ex-7', null]);
  });

  it('al cambiar el rango vuelve a elegir con las curvas de ese rango', async () => {
    stub();
    const { result, rerender } = mount(({ range }) => useCompareCurves('s-1', EXERCISES, range));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSlot(0, 'ex-7'));
    rerender({ range: SHORT });
    await waitFor(() => expect(result.current.slots).toEqual(['ex-5', null, null]));
  });

  it('se oculta sin candidatos o si todos son de peso corporal', async () => {
    stub();
    const none = mount(() => useCompareCurves('s-1', [ex('ex-8', 'Curl', 2)], RANGE));
    expect(none.result.current.hidden).toBe(true);
    const onlyBodyweight = mount(() => useCompareCurves('s-1', [ex('ex-4', 'Dominadas', 9)], RANGE));
    await waitFor(() => expect(onlyBodyweight.result.current.loading).toBe(false));
    expect(onlyBodyweight.result.current.hidden).toBe(true);
  });

  it('comparte la caché con la curva del panel: un solo GET por ejercicio y rango', async () => {
    const fetchMock = stub();
    const { result } = mount(({ range }) => ({
      compare: useCompareCurves('s-1', EXERCISES, range),
      panel: useExerciseProgress('ex-1', 's-1', range),
    }));
    await waitFor(() => expect(result.current.compare.loading).toBe(false));
    await waitFor(() => expect(result.current.panel.isSuccess).toBe(true));
    expect(ids(fetchMock).filter((id) => id === 'ex-1')).toHaveLength(1);
  });
});
