import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { bodyOf, jsonResponse } from '../../../helpers/shared/fetchMock';
import { studentDetail } from '../../../helpers/students/fixtures';
import { callsWith, loadProfile } from '../../../helpers/students/profile';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const update = () => vi.fn(async () => jsonResponse(200, { data: studentDetail() }));

async function open(user, detail) {
  const ctx = await loadProfile({ detail, handlers: { update: update() } });
  await user.click(await screen.findByRole('button', { name: 'Editar' }));
  return { ...ctx, dialog: await screen.findByRole('dialog', { name: 'Contexto para la IA' }) };
}

const save = async (user, dialog) => {
  await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
};

describe('StudentProfilePage: contexto para la IA', () => {
  it('marca un equipo, agrega otro y manda códigos más el texto libre', async () => {
    const user = userEvent.setup();
    const { fetchMock, dialog } = await open(user, studentDetail({ gym_equipment: null, injuries: 'Lumbalgia' }));
    const dumbbell = within(dialog).getByRole('checkbox', { name: 'Mancuernas' });
    expect(dumbbell).toHaveAttribute('aria-checked', 'false');
    await user.click(dumbbell);
    expect(dumbbell).toHaveAttribute('aria-checked', 'true');
    await user.type(within(dialog).getByLabelText('Agregar otro'), 'Banco plano');
    await user.click(within(dialog).getByRole('button', { name: 'Agregar' }));
    expect(within(dialog).getByText('Banco plano')).toBeVisible();
    expect(within(dialog).getByLabelText('Lesiones')).toHaveAttribute(
      'placeholder',
      'Ej.: lumbalgia, evitar peso muerto pesado',
    );
    await save(user, dialog);
    expect(bodyOf(callsWith(fetchMock, 'PATCH')[0][1])).toEqual({
      gym_equipment: ['dumbbell', 'Banco plano'],
      injuries: 'Lumbalgia',
    });
  });

  it('no duplica y permite quitar un equipo libre', async () => {
    const user = userEvent.setup();
    const { fetchMock, dialog } = await open(user, studentDetail({ gym_equipment: ['barbell', 'Rack propio'] }));
    expect(within(dialog).getByRole('checkbox', { name: 'Barra' })).toHaveAttribute('aria-checked', 'true');
    await user.type(within(dialog).getByLabelText('Agregar otro'), 'rack propio');
    await user.click(within(dialog).getByRole('button', { name: 'Agregar' }));
    expect(within(dialog).getAllByText('Rack propio')).toHaveLength(1);
    await user.click(within(dialog).getByRole('button', { name: 'Quitar Rack propio' }));
    await save(user, dialog);
    expect(bodyOf(callsWith(fetchMock, 'PATCH')[0][1]).gym_equipment).toEqual(['barbell']);
  });

  it('el equipo escrito en "Agregar otro" sin confirmar se guarda igual', async () => {
    const user = userEvent.setup();
    const { fetchMock, dialog } = await open(user, studentDetail({ gym_equipment: ['barbell'], injuries: null }));
    await user.type(within(dialog).getByLabelText('Agregar otro'), 'Banco plano');
    await save(user, dialog);
    expect(bodyOf(callsWith(fetchMock, 'PATCH')[0][1]).gym_equipment).toEqual(['barbell', 'Banco plano']);
  });

  it('vaciar todo manda null en ambos campos', async () => {
    const user = userEvent.setup();
    const detail = studentDetail({ gym_equipment: ['barbell'], injuries: 'Lumbalgia' });
    const { fetchMock, dialog } = await open(user, detail);
    await user.click(within(dialog).getByRole('checkbox', { name: 'Barra' }));
    await user.clear(within(dialog).getByLabelText('Lesiones'));
    await save(user, dialog);
    expect(bodyOf(callsWith(fetchMock, 'PATCH')[0][1])).toEqual({ gym_equipment: null, injuries: null });
  });
});
