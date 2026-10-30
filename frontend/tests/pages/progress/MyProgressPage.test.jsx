import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { BODY, EMPTY_BODY, progressUrls, stubProgress } from '../../helpers/progress/progress';
import { STUDENT, renderRoute, setSession } from '../../helpers/routes/renderRoute';

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

function load(stub) {
  resetAuthStore();
  setSession(STUDENT);
  const fetchMock = stubProgress(stub);
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

  it('sin entrenamientos muestra solo el estado vacío global', async () => {
    load({ overview: { exercises: [], weekly_volume: [] } });
    expect(await screen.findByText('Todavía no hay entrenamientos registrados')).toBeInTheDocument();
    expect(screen.queryByText('Peso corporal y medidas')).not.toBeInTheDocument();
  });
});
