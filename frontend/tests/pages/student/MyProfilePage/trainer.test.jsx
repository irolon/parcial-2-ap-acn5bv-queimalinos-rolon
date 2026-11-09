import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyProfilePage from '@/pages/student/MyProfilePage';
import { calls } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { TRAINER, renderOwn, selfDetail, signInSelf, stubSelf } from '../../../helpers/students/self';

allowSlowScreens();

beforeEach(signInSelf);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const ROUTINE = { id: 'r-1', name: 'Push/Pull', days: ['monday', 'thursday'] };
const TRAINER_ERROR = 'No pudimos cargar los datos de tu entrenador/a.';

function show(options = {}) {
  const fetchMock = stubSelf({ profile: selfDetail({ active_routine: ROUTINE }), ...options });
  renderOwn(<MyProfilePage />);
  return fetchMock;
}

const card = async () => (await screen.findByText('Tu entrenador/a')).parentElement.parentElement;
const messageLink = () => screen.getByRole('link', { name: 'Mensaje' });
const precedes = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('MyProfilePage: tu entrenador/a', () => {
  it('muestra su nombre con sus iniciales, debajo de la rutina, y un link a Mensajes', async () => {
    show();
    const trainer = await card();
    expect(await within(trainer).findByText(TRAINER.name)).toBeVisible();
    expect(within(trainer).getByText('LG')).toBeInTheDocument();
    expect(messageLink()).toHaveAttribute('href', '/alumno/mensajes');
    expect(precedes(await screen.findByText('Push/Pull'), trainer)).toBe(true);
  });

  it('mientras carga lo avisa y el link ya está', async () => {
    show({ counterpart: () => new Promise(() => {}) });
    expect(await screen.findByText('Cargando a tu entrenador/a…')).toBeInTheDocument();
    expect(messageLink()).toHaveAttribute('href', '/alumno/mensajes');
  });

  it('si falla lo dice, deja el link y Reintentar lo vuelve a pedir', async () => {
    let attempts = 0;
    const fetchMock = show({ counterpart: () => (attempts++ === 0 ? 500 : TRAINER) });
    const alert = (await screen.findByText(TRAINER_ERROR)).closest('[role="alert"]');
    expect(messageLink()).toHaveAttribute('href', '/alumno/mensajes');
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(TRAINER.name)).toBeVisible();
    expect(screen.queryByText(TRAINER_ERROR)).toBeNull();
    expect(calls(fetchMock).filter(([path]) => path === '/messages/s-1?limit=1')).toHaveLength(2);
  });

  it('sin entrenador/a en la respuesta no inventa un nombre', async () => {
    show({ counterpart: null });
    expect(await screen.findByText('Sin entrenador/a asignado/a')).toBeVisible();
    expect(messageLink()).toBeInTheDocument();
  });
});
