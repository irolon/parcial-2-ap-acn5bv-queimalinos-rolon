import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { rangeFor } from '@/utils/progress/ranges';
import { gamificationResponse } from '../../../helpers/achievements/gamification';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { BODY, exerciseData, progressUrls, stubProgress } from '../../../helpers/progress/progress';
import { STUDENT, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { allowSlowScreens } from '../../../helpers/shared/patience';

vi.mock('recharts', async (importOriginal) => (await import('../../../helpers/progress/recharts')).mockRecharts(importOriginal));

allowSlowScreens();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// Dominadas (ex-2) es de peso corporal: no entra en la comparación.
function load() {
  resetAuthStore();
  setSession(STUDENT);
  const exercise = (id) => exerciseData(id, { bodyweight: id === 'ex-2' });
  const fetchMock = stubProgress({ body: BODY, exercise, otherwise: (path) => gamificationResponse(path) });
  renderRoute('/alumno/progreso');
  return fetchMock;
}

describe('MyProgressPage: progresión comparada', () => {
  it('muestra la comparación del propio alumno entre los indicadores y el panel', async () => {
    const fetchMock = load();
    const compare = await screen.findByRole('img', { name: 'Progresión comparada de Press banca' });
    const curve = await screen.findByRole('img', { name: 'Progresión de Press banca' });
    const kpis = await screen.findByText('Sesiones del mes');
    expect(kpis.compareDocumentPosition(compare) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(compare.compareDocumentPosition(curve) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(progressUrls(fetchMock, 'exercise').every((p) => p.includes('student_id=s-1'))).toBe(true);
  });

  it('comparte la caché con el panel: un solo GET por ejercicio y rango, y el mismo overview que el panel', async () => {
    const fetchMock = load();
    await screen.findByRole('img', { name: 'Progresión comparada de Press banca' });
    await screen.findByRole('img', { name: 'Progresión de Press banca' });
    await waitFor(() => expect(progressUrls(fetchMock, 'exercise')).toHaveLength(2));
    const urls = progressUrls(fetchMock, 'exercise');
    expect(urls.filter((p) => p.startsWith('/progress/exercise/ex-1?'))).toHaveLength(1);
    expect(urls.filter((p) => p.startsWith('/progress/exercise/ex-2?'))).toHaveLength(1);
    // El de 3 meses lo comparten la tarjeta y el panel (el otro overview es el de los indicadores).
    expect(progressUrls(fetchMock, 'overview').filter((p) => p.includes(`from=${rangeFor('3m').from}&`))).toHaveLength(1);
  });
});
