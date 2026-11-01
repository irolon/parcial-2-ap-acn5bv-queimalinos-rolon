import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import {
  achievement, assignment, gamificationResponse, progressOf, stubGamification, unlocked,
} from '../../helpers/achievements/gamification';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { BODY, EMPTY_BODY, progressUrls, stubProgress } from '../../helpers/progress/progress';
import { STUDENT, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { calls, errorResponse } from '../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../helpers/student/patience';

vi.mock('recharts', async (importOriginal) => {
  const { cloneElement } = await import('react');
  return {
    ...(await importOriginal()),
    ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 240 }),
  };
});

allowSlowScreens();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// `stub` son las respuestas de /progress (ver stubProgress) y `gamification` las de la racha, los logros y los desafíos.
function load(stub, gamification) {
  resetAuthStore();
  setSession(STUDENT);
  const fetchMock = stubProgress({ ...stub, otherwise: (path) => gamificationResponse(path, gamification) });
  renderRoute('/alumno/progreso');
  return fetchMock;
}

describe('MyProgressPage', () => {
  it('muestra el panel con el propio alumno y sin selector de alumno', async () => {
    const fetchMock = load({ body: BODY });
    expect(await screen.findByRole('heading', { level: 1, name: 'Mi progreso' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Progresión de Press banca' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Alumno')).not.toBeInTheDocument();
    expect(progressUrls(fetchMock, 'overview')[0]).toContain('student_id=s-1');
    expect(progressUrls(fetchMock, 'exercise')[0]).toContain('student_id=s-1');
    expect(progressUrls(fetchMock, 'body')[0]).toBe('/progress/body/s-1');
  });

  it('muestra peso corporal con las variaciones de peso, % de grasa y cintura', async () => {
    load({ body: BODY });
    const card = (await screen.findByText('Peso corporal y medidas')).closest('div[class*="rounded-xl"]');
    expect(await within(card).findByRole('img', { name: 'Evolución del peso corporal' })).toBeInTheDocument();
    expect(within(card).getAllByText('−2 kg desde el inicio')).toHaveLength(1);
    expect(within(card).getByText('−2 % desde el inicio')).toBeInTheDocument();
    expect(within(card).getByText('−3 cm desde el inicio')).toBeInTheDocument();
  });

  it('sin medidas muestra el mensaje de estado vacío', async () => {
    load({ body: EMPTY_BODY });
    expect(
      await screen.findByText('Todavía no hay medidas cargadas. Tu entrenador o vos pueden cargarlas desde la app'),
    ).toBeInTheDocument();
  });

  it('sin entrenamientos muestra el estado vacío y, debajo, las medidas del alumno', async () => {
    load({ overview: { exercises: [], weekly_volume: [] } });
    expect(await screen.findByText('Todavía no hay entrenamientos registrados')).toBeInTheDocument();
    expect(await screen.findByText('Peso corporal y medidas')).toBeInTheDocument();
    expect(screen.queryByLabelText('Ejercicio')).not.toBeInTheDocument();
  });
});

describe('MyProgressPage: Racha y logros', () => {
  it('debajo del progreso muestra la racha, los logros y los desafíos del alumno', async () => {
    load(
      { body: BODY },
      {
        progress: progressOf([
          unlocked('Constante', '2026-10-31T01:30:00Z', { category: 'streak' }),
          achievement('Diez sesiones', { current: 7, target: 10 }),
        ]),
        challenges: [assignment('a', 'Mes de fuerza', 'active')],
      },
    );
    const section = within(await screen.findByRole('region', { name: 'Racha y logros' }));
    expect(await section.findByText('Racha actual 6 días · Récord 9 días')).toBeVisible();
    expect(await section.findByText('Constante')).toBeVisible();
    expect(section.getByText('30/10/2026')).toBeVisible();
    expect(section.getByText('Diez sesiones')).toBeVisible();
    expect(section.getByText('7/10 sesiones')).toBeVisible();
    expect(await section.findByText('Mes de fuerza')).toBeVisible();
    for (const title of ['Tu racha', 'Tus logros', 'Tus desafíos']) {
      expect(section.getByRole('heading', { name: title })).toBeVisible();
    }
    const body = await screen.findByText('Peso corporal y medidas');
    const region = screen.getByRole('region', { name: 'Racha y logros' });
    expect(body.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('pide la racha, el progreso de logros y los desafíos del propio alumno', async () => {
    const fetchMock = load({ body: BODY });
    await within(await screen.findByRole('region', { name: 'Racha y logros' })).findByText(/Racha actual/);
    const paths = calls(fetchMock).map(([path]) => path);
    expect(paths).toContain('/students/s-1/streak');
    expect(paths).toContain('/students/s-1/achievements/progress');
    expect(paths).toContain('/students/s-1/challenges');
  });

  it('si el progreso no carga, la racha y los logros se ven igual', async () => {
    resetAuthStore();
    setSession(STUDENT);
    stubGamification({ progress: progressOf([unlocked('Constante', '2026-10-31T01:30:00Z')]) }); // /progress/* da 500
    renderRoute('/alumno/progreso');
    const section = within(await screen.findByRole('region', { name: 'Racha y logros' }));
    expect(await section.findByText('Constante')).toBeVisible();
    expect(await section.findByText('Racha actual 6 días · Récord 9 días')).toBeVisible();
    expect(section.queryByRole('alert')).toBeNull();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('si la racha, los logros y los desafíos no cargan, el progreso se ve igual', async () => {
    const failing = () => errorResponse(500, 'INTERNAL');
    load({ body: BODY }, { streak: failing, progress: failing, challenges: failing });
    expect(await screen.findByRole('img', { name: 'Progresión de Press banca' })).toBeInTheDocument();
    const section = within(screen.getByRole('region', { name: 'Racha y logros' }));
    await waitFor(() => expect(section.getAllByRole('alert')).toHaveLength(3));
    expect(screen.getAllByRole('alert')).toHaveLength(3);
  });
});
