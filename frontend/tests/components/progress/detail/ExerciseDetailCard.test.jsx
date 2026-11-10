import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import ExerciseDetailCard from '@/components/progress/detail/ExerciseDetailCard';
import { rangeFor } from '@/utils/progress/ranges';
import { renderWithQuery } from '../../../helpers/progress/progress';
import { errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const TODAY = rangeFor('1m').to;
const NAMES = ['Press banca', 'Sentadilla', 'Peso muerto', 'Remo', 'Militar', 'Hip thrust', 'Curl'];
const ex = (i, days = 10 - i) => ({ id: `ex-${i}`, name: NAMES[i], days, muscle_group: 'x', last_date: TODAY });
const pt = (day, kg) => ({ date: `2026-10-0${day}`, max_kg: kg, e1rm_kg: kg + 10, volume_kg: kg * 10, sets: 3, reps: 12 + day });
const KG = [pt(1, 60), pt(2, 65), pt(3, 70)];
const DOWN = [pt(1, 80), pt(2, 70), pt(3, 60)];
const BW = [1, 2, 3].map((d) => ({ ...pt(d, 0), e1rm_kg: null, volume_kg: 0 }));

/** `curves(id)` da los puntos (o un status de error) de cada ejercicio. */
function load({ exercises = [ex(0), ex(1), ex(2)], curves = () => KG, metric = 'max_kg', range = '3m' } = {}) {
  const fetchMock = stubFetch(async (url) => {
    const path = url.replace(/^.*\/api/, '');
    if (path.startsWith('/progress/overview')) return jsonResponse(200, { data: { exercises, weekly_volume: [] } });
    const id = /^\/progress\/exercise\/([^/?]+)/.exec(path)[1];
    const points = curves(id);
    if (typeof points === 'number') return errorResponse(points, 'INTERNAL');
    return jsonResponse(200, { data: { exercise: { id }, points, pr: {}, default_metric: 'e1rm_kg' } });
  });
  renderWithQuery(<ExerciseDetailCard studentId="s-1" range={range} metric={metric} />);
  return fetchMock;
}

describe('ExerciseDetailCard', () => {
  it('cada fila muestra valor actual, sparkline y % de mejora con su color', async () => {
    load({ curves: (id) => (id === 'ex-1' ? DOWN : id === 'ex-2' ? BW : KG) });
    expect(screen.getByRole('status')).toHaveTextContent('Cargando el detalle…');
    const banca = await screen.findByRole('listitem', { name: 'Press banca: 70 kg, +17 % en el rango' });
    expect(banca.querySelector('polyline')).toHaveAttribute('points', '2,24 32,13 62,2');
    expect(screen.getByText('+17 %')).toHaveClass('text-good');
    expect(screen.getByRole('listitem', { name: 'Sentadilla: 60 kg, -25 % en el rango' })).toBeInTheDocument();
    expect(screen.getByText('-25 %')).toHaveClass('text-hot');
    expect(screen.getByRole('listitem', { name: 'Peso muerto: 15 reps, +15 % en el rango' })).toBeInTheDocument();
    expect(screen.getByText('PESO MÁXIMO · 3 MESES')).toBeInTheDocument();
  });

  it('muestra hasta 6 y "Ver todos (N)" abre el resto', async () => {
    load({ exercises: NAMES.map((_, i) => ex(i)) });
    await screen.findByRole('listitem', { name: /^Press banca/ });
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Ver todos (7)' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByRole('listitem', { name: /^Curl/ })).toBeInTheDocument();
  });

  it('si una curva falla la omite y lo avisa al pie con Reintentar', async () => {
    let fail = true;
    const fetchMock = load({ curves: (id) => (id === 'ex-1' && fail ? 500 : KG) });
    expect(await screen.findByText('No pudimos cargar 1 ejercicio.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(3));
    expect(fetchMock).toHaveBeenCalled();
  });

  it('si fallan todas muestra el error con Reintentar', async () => {
    load({ curves: () => 500 });
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el detalle.');
  });

  it('sin ninguno con 3 puntos en el rango lo dice con el texto de la comparada', async () => {
    load({ curves: () => KG.slice(0, 2) });
    expect(await screen.findByText('En este rango ningún ejercicio tiene 3 entrenamientos. Probá con un rango más largo.')).toBeInTheDocument();
  });

  it('sin ejercicios de 3 días o más no se muestra', async () => {
    const fetchMock = load({ exercises: [ex(0, 2)] });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.queryByText('Por ejercicio')).not.toBeInTheDocument();
  });
});
