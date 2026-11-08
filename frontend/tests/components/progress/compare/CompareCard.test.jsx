import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import CompareCard from '@/components/progress/compare/CompareCard';
import { rangeFor } from '@/utils/progress/ranges';
import { progressUrls, renderWithQuery } from '../../../helpers/progress/progress';
import { errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

vi.mock('recharts', async (importOriginal) => (await import('../../../helpers/progress/recharts')).mockRecharts(importOriginal));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const ex = (id, name, days) => ({ id, name, days, muscle_group: 'x', last_date: '2026-10-27' });
const EXERCISES = [
  ex('ex-1', 'Press banca', 8), ex('ex-2', 'Sentadilla', 7), ex('ex-3', 'Peso muerto', 6), ex('ex-4', 'Dominadas', 9),
  ex('ex-5', 'Remo', 5), ex('ex-6', 'Fondos', 4), ex('ex-7', 'Militar', 3),
];
const COUNTS = { 'ex-1': 5, 'ex-2': 4, 'ex-3': 4, 'ex-4': 6, 'ex-5': 3, 'ex-6': 1, 'ex-7': 3 };

const points = (n, kg) => Array.from({ length: n }, (_, i) => ({
  date: `2026-10-${String(i * 3 + 1).padStart(2, '0')}`, max_kg: kg, e1rm_kg: kg === null ? null : kg + i, sets: 3, reps: 24,
}));

/** `counts(id, short)` da los puntos de cada curva (`short`: rango de 1 mes); `fail(id)` la hace fallar. */
function load({ exercises = EXERCISES, counts = (id) => COUNTS[id], fail = () => false } = {}) {
  const fetchMock = stubFetch(async (url) => {
    const path = url.replace(/^.*\/api/, '');
    if (path.startsWith('/progress/overview')) return jsonResponse(200, { data: { exercises, weekly_volume: [] } });
    const id = /^\/progress\/exercise\/([^/?]+)/.exec(path)[1];
    if (fail(id)) return errorResponse(500, 'INTERNAL');
    const short = path.includes(`from=${rangeFor('1m').from}`);
    const data = { exercise: { id }, points: points(counts(id, short), id === 'ex-4' ? null : 80), pr: {}, default_metric: 'e1rm_kg' };
    return jsonResponse(200, { data });
  });
  const utils = renderWithQuery(<CompareCard studentId="s-1" />);
  return { fetchMock, ...utils };
}

const chart = (names) => screen.findByRole('img', { name: `Progresión comparada de ${names}` });

describe('CompareCard', () => {
  it('dibuja los 3 más entrenados con kg, cada uno con su selector', async () => {
    const { fetchMock } = load();
    expect(await screen.findByRole('status')).toHaveTextContent('Cargando la progresión…');
    expect(await chart('Press banca, Sentadilla y Peso muerto')).toBeInTheDocument();
    expect(screen.getByText('Progresión comparada')).toBeInTheDocument();
    expect(screen.getByLabelText('Ejercicio 1')).toHaveValue('ex-1');
    expect(screen.getByLabelText('Ejercicio 2')).toHaveValue('ex-2');
    expect(screen.getByLabelText('Ejercicio 3')).toHaveValue('ex-3');
    expect(screen.getByLabelText('Rango de la comparación')).toHaveValue('3m');
    expect(progressUrls(fetchMock, 'exercise')).toHaveLength(6);
    expect(progressUrls(fetchMock, 'exercise')[0]).toMatch(/^\/progress\/exercise\/ex-4\?student_id=s-1&from=/);
  });

  it('los de peso corporal aparecen deshabilitados y cada select no ofrece lo elegido en los otros', async () => {
    load();
    await chart('Press banca, Sentadilla y Peso muerto');
    const select = within(screen.getByLabelText('Ejercicio 2'));
    expect(select.getByRole('option', { name: 'Dominadas (sin peso registrado)' })).toBeDisabled();
    expect(select.queryByRole('option', { name: 'Press banca' })).not.toBeInTheDocument();
    expect(select.getByRole('option', { name: 'Sentadilla' })).toBeInTheDocument();
    expect(select.getByRole('option', { name: 'Militar' })).toBeEnabled();
  });

  it('cambiar el select 2 pide la curva nueva y reemplaza esa línea', async () => {
    const { fetchMock } = load();
    await chart('Press banca, Sentadilla y Peso muerto');
    fireEvent.change(screen.getByLabelText('Ejercicio 2'), { target: { value: 'ex-7' } });
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(screen.queryByText('Cargando la progresión…')).not.toBeInTheDocument();
    expect(await chart('Press banca, Militar y Peso muerto')).toBeInTheDocument();
    expect(screen.queryByText('Cargando…')).not.toBeInTheDocument();
    expect(progressUrls(fetchMock, 'exercise').filter((p) => p.startsWith('/progress/exercise/ex-7'))).toHaveLength(1);
  });

  it('con el rango de 1 mes vuelve a elegir con las curvas de ese rango', async () => {
    load({ counts: (id, short) => (short && id !== 'ex-5' ? 1 : COUNTS[id]) });
    await chart('Press banca, Sentadilla y Peso muerto');
    fireEvent.change(screen.getByLabelText('Rango de la comparación'), { target: { value: '1m' } });
    expect(await chart('Remo')).toBeInTheDocument();
    expect(screen.getByLabelText('Ejercicio 1')).toHaveValue('ex-5');
    expect(screen.getByLabelText('Ejercicio 2')).toHaveValue('');
    expect(within(screen.getByLabelText('Ejercicio 3')).getByRole('option', { selected: true })).toHaveTextContent('Elegí un ejercicio');
  });

  it('si ninguno llega a 3 entrenamientos en el rango lo dice y deja cambiar el rango', async () => {
    load({ counts: (id) => (id === 'ex-4' ? 6 : 2) });
    expect(await screen.findByText('En este rango ningún ejercicio tiene 3 entrenamientos. Probá con un rango más largo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Rango de la comparación')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('sin candidatos, o si todos son de peso corporal, no muestra la tarjeta', async () => {
    const { container, fetchMock } = load({ exercises: [ex('ex-1', 'Press banca', 2)] });
    await waitFor(() => expect(progressUrls(fetchMock, 'overview')).toHaveLength(1));
    expect(container).toBeEmptyDOMElement();
    vi.unstubAllGlobals();
    const bodyweight = load({ exercises: [ex('ex-4', 'Dominadas', 9)] });
    await waitFor(() => expect(progressUrls(bodyweight.fetchMock, 'exercise')).toHaveLength(1));
    await waitFor(() => expect(bodyweight.container).toBeEmptyDOMElement());
  });

  it('si una curva falla no la dibuja y ofrece reintentarla', async () => {
    let broken = true;
    load({ fail: (id) => id === 'ex-2' && broken });
    expect(await chart('Press banca, Peso muerto y Remo')).toBeInTheDocument();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('No pudimos cargar Sentadilla.');
    broken = false;
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('si fallan todas muestra el error de la tarjeta', async () => {
    load({ fail: () => true });
    expect(await screen.findByText('No pudimos cargar la progresión.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
