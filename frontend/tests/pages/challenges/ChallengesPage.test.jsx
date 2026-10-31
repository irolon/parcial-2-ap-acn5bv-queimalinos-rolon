import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { calls, errorResponse, jsonResponse } from '../../helpers/shared/fetchMock';
import { challenge, stubChallengesApi } from '../../helpers/challenges/challenges';

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const main = () => within(screen.getByRole('main'));
const template = challenge({ id: 'c-t', trainer_id: null, name: 'Racha de 7 días', goal_type: 'streak', goal_value: 7, duration_days: 7 });

async function confirmDelete() {
  await userEvent.click(await main().findByRole('button', { name: 'Borrar' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Borrar' }));
}

describe('ChallengesPage', () => {
  it('separa Plantillas de Mis desafíos', async () => {
    stubChallengesApi({ challenges: [template, challenge()] });
    renderRoute('/pt/desafios');
    const templates = within(await main().findByRole('region', { name: 'Plantillas' }));
    const own = within(main().getByRole('region', { name: 'Mis desafíos' }));
    expect(templates.getByText('Racha de 7 días')).toBeVisible();
    expect(templates.queryByText('Mes de fuerza')).not.toBeInTheDocument();
    expect(own.getByText('Mes de fuerza')).toBeVisible();
  });

  it('sin propios invita a crear el primero', async () => {
    stubChallengesApi({ challenges: [template] });
    renderRoute('/pt/desafios');
    expect(await main().findByText('Todavía no creaste desafíos')).toBeVisible();
    expect(main().getAllByRole('button', { name: 'Nuevo desafío' })).toHaveLength(1);
  });

  it('con propios ofrece "Nuevo desafío" y "Asignar"', async () => {
    stubChallengesApi({ challenges: [template, challenge()] });
    renderRoute('/pt/desafios');
    expect(await main().findByRole('button', { name: 'Nuevo desafío' })).toBeVisible();
    expect(main().getAllByRole('button', { name: 'Asignar' })).toHaveLength(2);
  });

  it('borra tras confirmar', async () => {
    const remove = vi.fn(async () => jsonResponse(204));
    const fetchMock = stubChallengesApi({ challenges: [challenge()], remove });
    renderRoute('/pt/desafios');
    await confirmDelete();
    await vi.waitFor(() => expect(calls(fetchMock).some(([p, i]) => p === '/challenges/c-1' && i?.method === 'DELETE')).toBe(true));
  });

  it('si ya está asignado (409) avisa y no cierra', async () => {
    stubChallengesApi({ challenges: [challenge()], remove: async () => errorResponse(409, 'CONFLICT', 'x') });
    renderRoute('/pt/desafios');
    await confirmDelete();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya está asignado a alumnos: no se puede borrar');
  });

  it('cancelar cierra sin borrar', async () => {
    const remove = vi.fn();
    stubChallengesApi({ challenges: [challenge()], remove });
    renderRoute('/pt/desafios');
    await userEvent.click(await main().findByRole('button', { name: 'Borrar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
  });

  it('si falla la carga ofrece reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => errorResponse(500, 'INTERNAL', 'Se rompió')));
    renderRoute('/pt/desafios');
    expect(await main().findByRole('button', { name: /reintentar/i })).toBeVisible();
  });
});
