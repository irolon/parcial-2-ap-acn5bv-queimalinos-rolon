import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
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

// Dominadas (ex-2) es de peso corporal: no entra en la comparación pero sí en el detalle, en repeticiones.
function load(stub = {}) {
  resetAuthStore();
  setSession(STUDENT);
  const exercise = (id) => exerciseData(id, { bodyweight: id === 'ex-2' });
  const fetchMock = stubProgress({ body: BODY, exercise, ...stub, otherwise: (path) => gamificationResponse(path) });
  renderRoute('/alumno/progreso');
  return fetchMock;
}

describe('MyProgressPage: detalle por ejercicio', () => {
  it('muestra valor actual y % de cada ejercicio al lado de la comparada, sin pedidos de más', async () => {
    const fetchMock = load();
    const compare = await screen.findByRole('img', { name: 'Progresión comparada de Press banca' });
    const banca = await screen.findByRole('listitem', { name: 'Press banca: 93 kg, +3 % en el rango' });
    expect(screen.getByRole('listitem', { name: 'Dominadas: 11 reps, +38 % en el rango' })).toBeInTheDocument();
    expect(screen.getByText('1RM ESTIMADO · 3 MESES')).toBeInTheDocument();
    expect(compare.compareDocumentPosition(banca) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await screen.findByRole('img', { name: 'Progresión de Press banca' });
    const urls = progressUrls(fetchMock, 'exercise');
    expect(urls.filter((p) => p.startsWith('/progress/exercise/ex-1?'))).toHaveLength(1);
    expect(urls.filter((p) => p.startsWith('/progress/exercise/ex-2?'))).toHaveLength(1);
  });

  it('cambiar la métrica a Volumen cambia la nota del gráfico y el detalle', async () => {
    load();
    await screen.findByRole('listitem', { name: /^Press banca/ });
    fireEvent.change(screen.getByLabelText('Métrica de la comparación'), { target: { value: 'volume_kg' } });
    expect(await screen.findByText('Volumen · kg')).toBeInTheDocument();
    expect(screen.getByText('VOLUMEN · 3 MESES')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Press banca: 830 kg, +4 % en el rango' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /^Dominadas: 11 reps/ })).toBeInTheDocument();
  });

  it('cambiar el rango cambia la comparada y el detalle', async () => {
    const fetchMock = load();
    await screen.findByRole('listitem', { name: /^Press banca/ });
    fireEvent.change(screen.getByLabelText('Rango de la comparación'), { target: { value: 'all' } });
    expect(await screen.findByText('1RM ESTIMADO · TODO')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('listitem', { name: /^Press banca/ })).toBeInTheDocument());
    const all = progressUrls(fetchMock, 'exercise').filter((p) => p.startsWith('/progress/exercise/ex-1?student_id=s-1') && !p.includes('from='));
    expect(all).toHaveLength(1);
  });

  it('a un alumno nuevo, sin comparada ni detalle, no le queda una fila vacía que sume otro hueco', async () => {
    load({ overview: { exercises: [], weekly_volume: [] } });
    await screen.findByText('Todavía no hay entrenamientos registrados');
    const page = (await screen.findByText(/^Asistencia · /)).closest('.flex-col.gap-5');
    const empty = [...page.children].filter((c) => c.matches(':empty'));
    expect(empty.every((c) => c.classList.contains('empty:hidden'))).toBe(true);
    expect(screen.queryByText('Por ejercicio')).not.toBeInTheDocument();
  });
});
