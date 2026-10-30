import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { studentDetail } from '../../../helpers/students/fixtures';
import { loadProfile } from '../../../helpers/students/profile';
import { OVERVIEW, exerciseData, progressUrls } from '../../../helpers/progress/progress';

vi.mock('recharts', async (importOriginal) => {
  const { cloneElement } = await import('react');
  return {
    ...(await importOriginal()),
    ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 240 }),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('StudentProfilePage: progreso', () => {
  it('muestra la sección Progreso y pide con el student_id del alumno', async () => {
    const { fetchMock } = await loadProfile({ detail: studentDetail(), progress: OVERVIEW });
    expect(await screen.findByRole('heading', { level: 2, name: 'Progreso' })).toBeInTheDocument();
    expect(progressUrls(fetchMock, 'overview')[0]).toContain('student_id=st-1');
  });

  it('dibuja la curva del ejercicio más reciente, sin la tarjeta de medidas del alumno', async () => {
    const progress = (path) => (path.startsWith('/progress/overview') ? OVERVIEW : exerciseData('ex-1'));
    const { fetchMock } = await loadProfile({ detail: studentDetail(), progress });
    expect(await screen.findByRole('img', { name: 'Progresión de Press banca' })).toBeInTheDocument();
    expect(progressUrls(fetchMock, 'exercise')[0]).toContain('/progress/exercise/ex-1?student_id=st-1');
    expect(progressUrls(fetchMock, 'body')).toHaveLength(0);
    expect(screen.queryByText('Peso corporal y medidas')).not.toBeInTheDocument();
  });

  it('sin entrenamientos muestra el estado vacío', async () => {
    await loadProfile({ detail: studentDetail() });
    expect(await screen.findByText('Todavía no hay entrenamientos registrados')).toBeInTheDocument();
  });
});
