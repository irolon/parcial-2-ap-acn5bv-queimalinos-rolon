import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CompareCard from '@/components/progress/compare/CompareCard';
import CompareControls from '@/components/progress/compare/CompareControls';
import { rangeFor } from '@/utils/progress/ranges';
import { progressUrls, renderWithQuery } from '../../../helpers/progress/progress';
import { jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

vi.mock('recharts', async (importOriginal) => (await import('../../../helpers/progress/recharts')).mockRecharts(importOriginal));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const EXERCISES = [
  { id: 'ex-1', name: 'Press banca', days: 8, muscle_group: 'x', last_date: rangeFor('1m').to },
  { id: 'ex-2', name: 'Sentadilla', days: 6, muscle_group: 'x', last_date: rangeFor('1m').to },
];
const points = Array.from({ length: 4 }, (_, i) => ({
  date: `2026-10-${String(i * 3 + 1).padStart(2, '0')}`, max_kg: 80 + i, e1rm_kg: 90 + i, volume_kg: 800 + i, sets: 3, reps: 24,
}));

function loadCard(props = {}) {
  const fetchMock = stubFetch(async (url) => {
    const path = url.replace(/^.*\/api/, '');
    if (path.startsWith('/progress/overview')) return jsonResponse(200, { data: { exercises: EXERCISES, weekly_volume: [] } });
    return jsonResponse(200, { data: { exercise: {}, points, pr: {}, default_metric: 'e1rm_kg' } });
  });
  renderWithQuery(<CompareCard studentId="s-1" {...props} />);
  return fetchMock;
}

describe('CompareControls', () => {
  it('ofrece rango y las tres métricas comparables, y avisa cada cambio', () => {
    const onRange = vi.fn();
    const onMetric = vi.fn();
    render(<CompareControls range="3m" onRange={onRange} metric="e1rm_kg" onMetric={onMetric} />);
    const metric = screen.getByLabelText('Métrica de la comparación');
    expect(within(metric).getAllByRole('option').map((o) => o.textContent)).toEqual(['1RM estimado', 'Peso máximo', 'Volumen']);
    expect(metric).toHaveValue('e1rm_kg');
    fireEvent.change(metric, { target: { value: 'volume_kg' } });
    expect(onMetric).toHaveBeenCalledWith('volume_kg');
    fireEvent.change(screen.getByLabelText('Rango de la comparación'), { target: { value: 'all' } });
    expect(onRange).toHaveBeenCalledWith('all');
  });
});

describe('CompareCard: métrica', () => {
  it('con su propio estado, elegir Volumen o Peso máximo cambia la nota sin pedir curvas nuevas', async () => {
    const fetchMock = loadCard();
    expect(await screen.findByText('1RM estimado · kg')).toBeInTheDocument();
    const before = progressUrls(fetchMock, 'exercise').length;
    fireEvent.change(screen.getByLabelText('Métrica de la comparación'), { target: { value: 'volume_kg' } });
    expect(await screen.findByText('Volumen · kg')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Métrica de la comparación'), { target: { value: 'max_kg' } });
    expect(await screen.findByText('Peso máximo · kg')).toBeInTheDocument();
    expect(progressUrls(fetchMock, 'exercise')).toHaveLength(before);
  });

  it('controlada, muestra el rango y la métrica de afuera y avisa los cambios', async () => {
    const onRange = vi.fn();
    const onMetric = vi.fn();
    loadCard({ range: 'all', onRange, metric: 'volume_kg', onMetric });
    expect(await screen.findByText('Volumen · kg')).toBeInTheDocument();
    expect(screen.getByLabelText('Rango de la comparación')).toHaveValue('all');
    fireEvent.change(screen.getByLabelText('Rango de la comparación'), { target: { value: '1m' } });
    fireEvent.change(screen.getByLabelText('Métrica de la comparación'), { target: { value: 'max_kg' } });
    expect(onRange).toHaveBeenCalledWith('1m');
    expect(onMetric).toHaveBeenCalledWith('max_kg');
    expect(screen.getByLabelText('Rango de la comparación')).toHaveValue('all');
  });
});
