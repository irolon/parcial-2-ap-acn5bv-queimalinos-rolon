import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { studentDetail } from '../../../../helpers/students/fixtures';
import { loadProfile } from '../../../../helpers/students/profile';
import { OVERVIEW, exerciseData, progressUrls } from '../../../../helpers/progress/progress';

vi.mock('recharts', async (importOriginal) => (await import('../../../../helpers/progress/recharts')).mockRecharts(importOriginal));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// Dominadas (ex-2) es de peso corporal: no entra en la comparación.
const progress = (path) => {
  if (path.startsWith('/progress/overview')) return OVERVIEW;
  const id = /^\/progress\/exercise\/([^/?]+)/.exec(path)[1];
  return exerciseData(id, { bodyweight: id === 'ex-2' });
};

describe('StudentProfilePage: progresión comparada', () => {
  it('va en la sección Progreso, arriba del panel, con el student_id del alumno', async () => {
    const { fetchMock } = await loadProfile({ detail: studentDetail(), progress });
    const section = within(screen.getByRole('region', { name: 'Progreso' }));
    const compare = await section.findByRole('img', { name: 'Progresión comparada de Press banca' });
    const curve = await section.findByRole('img', { name: 'Progresión de Press banca' });
    expect(compare.compareDocumentPosition(curve) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const urls = progressUrls(fetchMock, 'exercise');
    expect(urls.every((p) => p.includes('student_id=st-1'))).toBe(true);
    expect(urls.filter((p) => p.startsWith('/progress/exercise/ex-1?'))).toHaveLength(1);
  });

  it('sin entrenamientos no muestra la comparación', async () => {
    await loadProfile({ detail: studentDetail() });
    expect(await screen.findByText('Todavía no hay entrenamientos registrados')).toBeInTheDocument();
    expect(screen.queryByText('Progresión comparada')).not.toBeInTheDocument();
  });
});
