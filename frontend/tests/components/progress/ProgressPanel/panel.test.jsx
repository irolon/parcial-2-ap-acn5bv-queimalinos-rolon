import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import ProgressPanel from '@/components/progress/ProgressPanel';
import { exerciseData, progressUrls, renderWithQuery, stubProgress } from '../../../helpers/progress/progress';

vi.mock('recharts', async (importOriginal) => {
  const { cloneElement } = await import('react');
  return {
    ...(await importOriginal()),
    ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 240 }),
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const pressed = (name) => screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true';

describe('ProgressPanel', () => {
  it('muestra el primer ejercicio con su métrica por defecto y pide con student_id', async () => {
    const fetchMock = stubProgress();
    renderWithQuery(<ProgressPanel studentId="st-9" />);
    expect(
      await screen.findByRole('img', { name: 'Progresión de Press banca' }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(pressed('1RM estimado')).toBe(true);
    expect(screen.getByLabelText('Ejercicio')).toHaveValue('ex-1');
    expect(screen.getByLabelText('Rango')).toHaveValue('3m');
    expect(progressUrls(fetchMock, 'overview')[0]).toMatch(/student_id=st-9&from=\d{4}-\d\d-\d\d&to=/);
    expect(progressUrls(fetchMock, 'exercise')[0]).toContain('/progress/exercise/ex-1?student_id=st-9');
    expect(screen.queryByText('Peso corporal y medidas')).not.toBeInTheDocument();
  });

  it('no vuelve a pedir en bucle (la query key es estable)', async () => {
    const fetchMock = stubProgress();
    renderWithQuery(<ProgressPanel studentId="st-9" />);
    await screen.findByRole('img', { name: 'Progresión de Press banca' });
    await new Promise((r) => setTimeout(r, 50));
    expect(progressUrls(fetchMock, 'overview')).toHaveLength(1);
    expect(progressUrls(fetchMock, 'exercise')).toHaveLength(1);
  });

  it('al cambiar el rango vuelve a pedir con el nuevo rango', async () => {
    const fetchMock = stubProgress();
    renderWithQuery(<ProgressPanel studentId="st-9" />);
    await screen.findByRole('img', { name: 'Progresión de Press banca' });
    fireEvent.change(screen.getByLabelText('Rango'), { target: { value: 'all' } });
    await waitFor(() => expect(progressUrls(fetchMock, 'overview')).toHaveLength(2));
    expect(progressUrls(fetchMock, 'overview')[1]).not.toContain('from=');
    expect(screen.getByLabelText('Rango')).toHaveValue('all');
  });

  it('al cambiar el rango se conservan el ejercicio y la métrica elegidos', async () => {
    const fetchMock = stubProgress();
    renderWithQuery(<ProgressPanel studentId="st-9" />);
    await screen.findByRole('img', { name: 'Progresión de Press banca' });
    fireEvent.change(screen.getByLabelText('Ejercicio'), { target: { value: 'ex-2' } });
    await waitFor(() => expect(progressUrls(fetchMock, 'exercise')).toHaveLength(2));
    await screen.findByRole('button', { name: 'Peso máximo' });
    fireEvent.click(screen.getByRole('button', { name: 'Peso máximo' }));

    fireEvent.change(screen.getByLabelText('Rango'), { target: { value: '1m' } });
    expect(screen.getByLabelText('Ejercicio')).toHaveValue('ex-2');
    await waitFor(() => expect(progressUrls(fetchMock, 'overview')).toHaveLength(2));
    await waitFor(() => expect(progressUrls(fetchMock, 'exercise')).toHaveLength(3));
    expect(progressUrls(fetchMock, 'exercise')[2]).toContain('/progress/exercise/ex-2');
    expect(await screen.findByRole('button', { name: 'Peso máximo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Ejercicio')).toHaveValue('ex-2');
  });

  it('cambiar de ejercicio resetea la métrica a la por defecto del nuevo', async () => {
    stubProgress({ exercise: (id) => exerciseData(id, { bodyweight: id === 'ex-2' }) });
    renderWithQuery(<ProgressPanel studentId="st-9" />);
    await screen.findByRole('img', { name: 'Progresión de Press banca' });
    fireEvent.click(screen.getByRole('button', { name: 'Peso máximo' }));
    expect(pressed('Peso máximo')).toBe(true);

    fireEvent.change(screen.getByLabelText('Ejercicio'), { target: { value: 'ex-2' } });
    expect(await screen.findByRole('img', { name: 'Progresión de Dominadas' })).toBeInTheDocument();
    expect(pressed('Repeticiones')).toBe(true);
    expect(screen.getByRole('button', { name: 'Peso máximo' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Ejercicio'), { target: { value: 'ex-1' } });
    await screen.findByRole('img', { name: 'Progresión de Press banca' });
    expect(pressed('1RM estimado')).toBe(true);
  });

  it('sin ejercicios muestra un único estado vacío para todo el panel', async () => {
    stubProgress({ overview: { exercises: [], weekly_volume: [] } });
    renderWithQuery(<ProgressPanel studentId="st-9" />);
    expect(await screen.findByText('Todavía no hay entrenamientos registrados')).toBeInTheDocument();
    expect(screen.getByText('Después de 3 entrenamientos vas a ver tu progresión acá.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Ejercicio')).not.toBeInTheDocument();
    expect(screen.queryByText('Volumen semanal')).not.toBeInTheDocument();
  });
});
