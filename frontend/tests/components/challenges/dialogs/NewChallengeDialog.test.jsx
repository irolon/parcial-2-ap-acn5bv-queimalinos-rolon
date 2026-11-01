import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewChallengeDialog from '@/components/challenges/dialogs/NewChallengeDialog';
import { bodyOf, calls, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { CHALLENGE_DONE, challenge, stubChallengesApi } from '../../../helpers/challenges/challenges';
import { renderWithClient } from '../../../helpers/challenges/renderWithClient';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function setup(api = {}) {
  const fetchMock = stubChallengesApi(api);
  const props = { onClose: vi.fn(), onCreated: vi.fn() };
  renderWithClient(<NewChallengeDialog open {...props} />);
  return { fetchMock, ...props };
}

const createCalls = (fetchMock) => calls(fetchMock).filter(([p, i]) => p === '/challenges' && i?.method === 'POST');

async function fill() {
  await userEvent.type(screen.getByLabelText('Nombre'), 'Mes de fuerza');
  await userEvent.type(screen.getByLabelText(/^Valor/), '12');
}

describe('NewChallengeDialog', () => {
  it('arranca con 30 días, el premio activado y la ayuda del tipo de meta', async () => {
    setup();
    expect(screen.getByLabelText('Duración (días)')).toHaveValue('30');
    expect(await screen.findByRole('checkbox', { name: /Desafío cumplido/ })).toBeChecked();
    expect(screen.getByText('Se otorga la primera vez que el alumno cumple un desafío')).toBeVisible();
    expect(screen.getByLabelText('Valor (sesiones)')).toBeVisible();
    await userEvent.selectOptions(screen.getByLabelText('Tipo de meta'), 'weight_target');
    expect(screen.getByLabelText('Valor (kg)')).toBeVisible();
  });

  it('sin CHALLENGE_DONE en el catálogo no ofrece premio y manda null', async () => {
    const create = vi.fn(async () => jsonResponse(201, { data: challenge() }));
    const { fetchMock } = setup({ catalog: [], create });
    await fill();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await vi.waitFor(() => expect(createCalls(fetchMock)).toHaveLength(1));
    expect(bodyOf(createCalls(fetchMock)[0][1]).reward_achievement_id).toBeNull();
  });

  it('si falla el catálogo avisa, ofrece Reintentar y no deja crear hasta resolverlo', async () => {
    let fails = true;
    const catalog = () => (fails ? errorResponse(500, 'INTERNAL', 'Se rompió') : jsonResponse(200, { data: [CHALLENGE_DONE] }));
    const create = vi.fn(async () => jsonResponse(201, { data: challenge() }));
    setup({ catalog, create });
    await fill();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar los premios');
    expect(screen.getByRole('button', { name: 'Crear' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(create).not.toHaveBeenCalled();
    fails = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('checkbox', { name: /Desafío cumplido/ })).toBeChecked();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear' })).toBeEnabled();
  });

  it('valida en el cliente y no pide nada', async () => {
    const create = vi.fn();
    setup({ create });
    await screen.findByRole('checkbox', { name: /Desafío cumplido/ });
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Valor/)).toHaveAttribute('aria-invalid', 'true');
    expect(create).not.toHaveBeenCalled();
  });

  it('al guardar crea con el premio y llama a onCreated (un solo POST con doble click)', async () => {
    const created = challenge({ id: 'c-new' });
    const create = vi.fn(async () => jsonResponse(201, { data: created }));
    const { fetchMock, onCreated } = setup({ create });
    await screen.findByRole('checkbox', { name: /Desafío cumplido/ });
    await fill();
    await userEvent.dblClick(screen.getByRole('button', { name: 'Crear' }));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(createCalls(fetchMock)).toHaveLength(1);
    expect(bodyOf(createCalls(fetchMock)[0][1])).toEqual({
      name: 'Mes de fuerza', goal_type: 'sessions_count', goal_value: 12, duration_days: 30,
      reward_achievement_id: 'a-done', description: null,
    });
  });

  it('muestra por campo los errores del 400', async () => {
    const details = [{ field: 'name', message: 'name debe tener entre 1 y 100 caracteres' }];
    const { onCreated } = setup({ create: async () => errorResponse(400, 'VALIDATION_ERROR', 'Error de validación', details) });
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(await screen.findByText('name debe tener entre 1 y 100 caracteres')).toBeVisible();
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('otro error se muestra arriba y deja reintentar', async () => {
    setup({ create: async () => errorResponse(500, 'INTERNAL', 'Se rompió') });
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(await screen.findByText('Se rompió')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Crear' })).toBeEnabled();
  });
});
