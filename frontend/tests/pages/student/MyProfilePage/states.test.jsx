import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyProfilePage from '@/pages/student/MyProfilePage';
import { calls } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { metric } from '../../../helpers/students/fixtures';
import { renderOwn, selfDetail, signInSelf, stubSelf } from '../../../helpers/students/self';

allowSlowScreens();

beforeEach(signInSelf);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const NEVER = () => new Promise(() => {});
const ONE = () => [metric({ id: 'm-st', recorded_at: '2026-10-05T12:00:00Z', recorded_by: 'student' })];
const PROFILE_ERROR = 'No pudimos cargar tu perfil.';
const METRICS_ERROR = 'No pudimos cargar tus medidas.';

function show(options) {
  const fetchMock = stubSelf({ profile: selfDetail(), metrics: ONE, ...options });
  renderOwn(<MyProfilePage />);
  return fetchMock;
}

// Cada bloque con error es un role="alert" propio: se busca por su mensaje.
const alertWith = async (message) => (await screen.findByText(message)).closest('[role="alert"]');
const retry = async (message) =>
  userEvent.setup().click(within(await alertWith(message)).getByRole('button', { name: 'Reintentar' }));
const gets = (fetchMock, path) => calls(fetchMock).filter(([p]) => p === path);

describe('MyProfilePage: cada bloque con su carga y su error', () => {
  it('mientras carga la ficha muestra su estado de carga y las medidas siguen su camino', async () => {
    show({ profile: NEVER });
    expect(await screen.findByText('Cargando tu perfil…')).toBeInTheDocument();
    expect(await screen.findByText('Medidas actuales')).toBeVisible();
    expect(screen.queryByRole('heading', { level: 2, name: 'Tomás Ruiz' })).toBeNull();
  });

  it('mientras cargan las medidas muestra su estado de carga y la ficha ya se ve', async () => {
    show({ metrics: NEVER });
    expect(await screen.findByText('Cargando tus medidas…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Tomás Ruiz' })).toBeVisible();
  });

  it('si falla la ficha lo dice, las medidas siguen y Reintentar la vuelve a pedir', async () => {
    let attempts = 0;
    const fetchMock = show({ profile: () => (attempts++ === 0 ? 500 : selfDetail()) });
    expect(await alertWith(PROFILE_ERROR)).toBeInTheDocument();
    expect(await screen.findByText('Medidas actuales')).toBeVisible();
    await retry(PROFILE_ERROR);
    expect(await screen.findByRole('heading', { level: 2, name: 'Tomás Ruiz' })).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(gets(fetchMock, '/students/s-1')).toHaveLength(2);
    expect(gets(fetchMock, '/students/s-1/metrics')).toHaveLength(1);
  });

  it('si fallan las medidas lo dice, la ficha sigue y Reintentar las vuelve a pedir', async () => {
    let attempts = 0;
    const fetchMock = show({ metrics: () => (attempts++ === 0 ? 500 : ONE()) });
    expect(await alertWith(METRICS_ERROR)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Tomás Ruiz' })).toBeVisible();
    await retry(METRICS_ERROR);
    expect(await screen.findByText('Medidas actuales')).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(gets(fetchMock, '/students/s-1/metrics')).toHaveLength(2);
    expect(gets(fetchMock, '/students/s-1')).toHaveLength(1);
  });

  it('si fallan las dos cosas hay dos avisos y cada Reintentar arregla el suyo', async () => {
    let profileAttempts = 0;
    let metricsAttempts = 0;
    show({
      profile: () => (profileAttempts++ === 0 ? 500 : selfDetail()),
      metrics: () => (metricsAttempts++ === 0 ? 500 : ONE()),
    });
    await alertWith(PROFILE_ERROR);
    await alertWith(METRICS_ERROR);
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    await retry(METRICS_ERROR);
    expect(await screen.findByText('Medidas actuales')).toBeVisible();
    expect(screen.getByText(PROFILE_ERROR)).toBeVisible();
    await retry(PROFILE_ERROR);
    expect(await screen.findByRole('heading', { level: 2, name: 'Tomás Ruiz' })).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
