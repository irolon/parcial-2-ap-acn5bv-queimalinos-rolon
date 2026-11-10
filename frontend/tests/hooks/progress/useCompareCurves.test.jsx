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

const ex = (id, name, days, last = '2026-10-27') => ({ id, name, days, muscle_group: 'x', last_date: last });
const EXERCISES = [
  ex('ex-1', 'Press banca', 8), ex('ex-2', 'Sentadilla', 7), ex('ex-3', 'Peso muerto', 6), ex('ex-4', 'Dominadas', 9),
  ex('ex-5', 'Remo', 5), ex('ex-6', 'Fondos', 4), ex('ex-7', 'Militar', 3), ex('ex-8', 'Curl', 2),
];
const COUNTS = { 'ex-1': 5, 'ex-2': 4, 'ex-3': 4, 'ex-5': 3, 'ex-6': 1, 'ex-7': 3 };
const RANGE = { from: '2026-08-03', to: '2026-11-08' };
const SHORT = { from: '2026-10-05', to: '2026-11-08' };
const ALL = { from: null, to: null };

const points = (n, kg) => Array.from({ length: n }, (_, i) => ({
  date: `2026-10-${String(i * 3 + 1).padStart(2, '0')}`, max_kg: kg, e1rm_kg: kg === null ? null : kg + i, sets: 3, reps: 24,
}));

// Dominadas (ex-4) es de peso corporal; con el rango corto solo Remo (ex-5) tiene 3 puntos.
function stub(counts = COUNTS) {
  return stubFetch(async (url) => {
    const path = url.replace(/^.*\/api/, '');
    const id = /^\/progress\/exercise\/([^/?]+)/.exec(path)[1];
    const short = path.includes(`from=${SHORT.from}`);
    const count = id === 'ex-4' ? 6 : short && id !== 'ex-5' ? 1 : counts[id];
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
  it('pide la curva de todos los que entrenaron en el rango y elige los 3 con más puntos con kg', async () => {
    const fetchMock = stub();
    const { result } = mount(({ range }) => useCompareCurves('s-1', EXERCISES, range));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(ids(fetchMock)).toEqual(['ex-4', 'ex-1', 'ex-2', 'ex-3', 'ex-5', 'ex-6', 'ex-7']);
    expect(progressUrls(fetchMock, 'exercise')[0]).toBe(`/progress/exercise/ex-4?student_id=s-1&from=${RANGE.from}&to=${RANGE.to}`);
    expect(result.current.slots).toEqual(['ex-1', 'ex-2', 'ex-3']);
    expect(result.current.lines.map((l) => l.name)).toEqual(['Press banca', 'Sentadilla', 'Peso muerto']);
    expect(result.current.lines.map((l) => l.color)).toEqual(['var(--color-accent)', 'var(--color-cool)', 'var(--color-hot)']);
    expect(new Set(result.current.lines.map((l) => `${l.dash}|${l.shape}`)).size).toBe(3);
    expect(result.current.bodyweight).toEqual(new Set(['ex-4']));
    expect(result.current.options.map((o) => o.id)).toEqual(['ex-4', 'ex-1', 'ex-2', 'ex-3', 'ex-5', 'ex-6', 'ex-7']);
    expect(result.current.hidden).toBe(false);
  });

  it('sin rango pide todos los de 3 días o más (sin tope) y cambiar una línea reemplaza solo esa', async () => {
    const fetchMock = stub();
    const { result } = mount(({ range }) => useCompareCurves('s-1', EXERCISES, range), { range: ALL });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(ids(fetchMock)).toEqual(['ex-4', 'ex-1', 'ex-2', 'ex-3', 'ex-5', 'ex-6', 'ex-7']);
    act(() => result.current.setSlot(1, 'ex-7'));
    expect(result.current.lines.map((l) => l.id)).toEqual(['ex-1', 'ex-7', 'ex-3']);
    act(() => result.current.setSlot(2, ''));
    expect(result.current.slots).toEqual(['ex-1', 'ex-7', null]);
  });

  it('una elegida a mano que no se había pedido trae su curva y solo ese selector carga', async () => {
    const fetchMock = stub({ ...COUNTS, 'ex-9': 3 });
    const { result } = mount(({ range }) => useCompareCurves('s-1', [...EXERCISES, ex('ex-9', 'Hip thrust', 3, '2026-07-01')], range));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSlot(1, 'ex-9'));
    expect(result.current.slotLoading).toEqual([false, true, false]);
    await waitFor(() => expect(result.current.slotLoading).toEqual([false, false, false]));
    expect(ids(fetchMock).filter((id) => id === 'ex-9')).toHaveLength(1);
  });

  it('al cambiar el rango vuelve a elegir con las curvas de ese rango', async () => {
    stub();
    const { result, rerender } = mount(({ range }) => useCompareCurves('s-1', EXERCISES, range));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSlot(0, 'ex-7'));
    rerender({ range: SHORT });
    await waitFor(() => expect(result.current.slots).toEqual(['ex-5', null, null]));
  });

  it('volver al rango anterior no trae de vuelta la elección a mano', async () => {
    stub();
    const { result, rerender } = mount(({ range }) => useCompareCurves('s-1', EXERCISES, range));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSlot(0, 'ex-7'));
    expect(result.current.slots).toEqual(['ex-7', 'ex-2', 'ex-3']);
    rerender({ range: SHORT });
    await waitFor(() => expect(result.current.slots).toEqual(['ex-5', null, null]));
    rerender({ range: RANGE });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.slots).toEqual(['ex-1', 'ex-2', 'ex-3']);
  });

  it('una elegida a mano con 1 o 2 puntos en el rango no se dibuja y queda marcada', async () => {
    stub({ ...COUNTS, 'ex-7': 2 });
    const { result } = mount(({ range }) => useCompareCurves('s-1', EXERCISES, range));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSlot(1, 'ex-6'));
    expect(result.current.slots).toEqual(['ex-1', 'ex-6', 'ex-3']);
    expect(result.current.lines.map((l) => l.id)).toEqual(['ex-1', 'ex-3']);
    expect(result.current.few).toEqual(new Set(['ex-6', 'ex-7']));
    act(() => result.current.setSlot(1, 'ex-7'));
    await waitFor(() => expect(result.current.slotLoading).toEqual([false, false, false]));
    expect(result.current.lines.map((l) => l.id)).toEqual(['ex-1', 'ex-3']);
    expect(result.current.few).toEqual(new Set(['ex-6', 'ex-7']));
  });

  it('con un cambio de rutina los candidatos salen de los que entrenó en el rango', async () => {
    const old = '2026-09-20';
    const exercises = [
      ex('ex-1', 'Press banca', 20, old), ex('ex-2', 'Sentadilla', 19, old), ex('ex-3', 'Peso muerto', 18, old),
      ex('ex-5', 'Remo', 17, old), ex('ex-6', 'Fondos', 16, old), ex('ex-7', 'Militar', 15, old),
      ex('n-1', 'Hip thrust', 5, '2026-11-06'), ex('n-2', 'Prensa', 4, '2026-11-04'), ex('n-3', 'Estocadas', 4, '2026-11-02'),
    ];
    const fetchMock = stubFetch(async (url) => {
      const id = /\/progress\/exercise\/([^/?]+)/.exec(url)[1];
      const n = id.startsWith('n-') ? 4 : 0;
      return jsonResponse(200, { data: { exercise: { id }, points: points(n, 80), pr: {}, default_metric: 'e1rm_kg' } });
    });
    const { result } = mount(({ range }) => useCompareCurves('s-1', exercises, range), { range: SHORT });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(ids(fetchMock)).toEqual(['n-1', 'n-3', 'n-2']);
    expect(result.current.slots).toEqual(['n-1', 'n-3', 'n-2']);
    expect(result.current.few).toEqual(new Set(['ex-1', 'ex-2', 'ex-3', 'ex-5', 'ex-6', 'ex-7']));
  });

  it('si la rutina vieja se hizo una última vez en el rango, los nuevos igual se piden y se dibujan', async () => {
    const once = '2026-10-12';
    const exercises = [
      ex('ex-1', 'Press banca', 20, once), ex('ex-2', 'Sentadilla', 19, once), ex('ex-3', 'Peso muerto', 18, once),
      ex('ex-5', 'Remo', 17, once), ex('ex-6', 'Fondos', 16, once), ex('ex-7', 'Militar', 15, once),
      ex('n-1', 'Hip thrust', 4, '2026-11-06'),
    ];
    const fetchMock = stubFetch(async (url) => {
      const id = /\/progress\/exercise\/([^/?]+)/.exec(url)[1];
      return jsonResponse(200, { data: { exercise: { id }, points: points(id === 'n-1' ? 4 : 1, 80), pr: {}, default_metric: 'e1rm_kg' } });
    });
    const { result } = mount(({ range }) => useCompareCurves('s-1', exercises, range), { range: SHORT });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(ids(fetchMock)).toHaveLength(7);
    expect(result.current.slots).toEqual(['n-1', null, null]);
  });

  it('si la rutina cambió ayer, el de la anterior con más puntos en el rango igual se dibuja', async () => {
    const exercises = [
      ...[1, 2, 3, 4, 5, 6].map((i) => ex(`n-${i}`, `Nuevo ${i}`, 3, '2026-11-07')),
      ex('ex-1', 'Press banca', 12, '2026-10-31'),
    ];
    const fetchMock = stubFetch(async (url) => {
      const id = /\/progress\/exercise\/([^/?]+)/.exec(url)[1];
      return jsonResponse(200, { data: { exercise: { id }, points: points(id === 'ex-1' ? 4 : 1, 80), pr: {}, default_metric: 'e1rm_kg' } });
    });
    const { result } = mount(({ range }) => useCompareCurves('s-1', exercises, range), { range: SHORT });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(ids(fetchMock)).toContain('ex-1');
    expect(result.current.lines.map((l) => l.name)).toEqual(['Press banca']);
  });

  it('si nadie entrenó en el rango no pide curvas pero tampoco se oculta (queda el selector de rango)', async () => {
    const fetchMock = stub();
    const old = [ex('ex-1', 'Press banca', 8, '2026-09-20'), ex('ex-4', 'Dominadas', 9, '2026-09-20')];
    const { result } = mount(({ range }) => useCompareCurves('s-1', old, range), { range: SHORT });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(ids(fetchMock)).toEqual([]);
    expect(result.current.lines).toEqual([]);
    expect(result.current.hidden).toBe(false);
  });

  it('se oculta sin candidatos; si todos son de peso corporal lo avisa (la tarjeta decide)', async () => {
    stub();
    const none = mount(() => useCompareCurves('s-1', [ex('ex-8', 'Curl', 2)], RANGE));
    expect(none.result.current.hidden).toBe(true);
    const onlyBodyweight = mount(() => useCompareCurves('s-1', [ex('ex-4', 'Dominadas', 9)], ALL));
    await waitFor(() => expect(onlyBodyweight.result.current.loading).toBe(false));
    expect(onlyBodyweight.result.current).toMatchObject({ hidden: false, allBodyweight: true });
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
