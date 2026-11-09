import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { bodyOf, errorResponse, jsonResponse } from '../../../../helpers/shared/fetchMock';
import { studentDetail } from '../../../../helpers/students/fixtures';
import { callsWith, loadProfile } from '../../../../helpers/students/profile';
import { PHONE_ERROR } from '@/utils/students/phone';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const open = async (user, stub = {}) => {
  const ctx = await loadProfile({ detail: studentDetail(), ...stub });
  await user.click(await screen.findByRole('button', { name: 'Editar alumno' }));
  return { ...ctx, dialog: await screen.findByRole('dialog', { name: 'Editar alumno' }) };
};

describe('StudentProfilePage: editar alumno', () => {
  it('con el alumno activo trae la sección para blanquear la clave', async () => {
    const user = userEvent.setup();
    const { dialog } = await open(user);
    expect(within(dialog).getByRole('region', { name: 'Acceso a la app' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Blanquear clave' })).toBeEnabled();
  });

  it('dado de baja no ofrece blanquear la clave', async () => {
    const user = userEvent.setup();
    const { dialog } = await open(user, { detail: studentDetail({ active: false }) });
    expect(within(dialog).queryByRole('region', { name: 'Acceso a la app' })).toBeNull();
  });

  it('precarga los datos y manda solo el nombre cambiado', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => jsonResponse(200, { data: studentDetail({ name: 'Ana Gómez' }) }));
    const { fetchMock, dialog } = await open(user, { handlers: { update } });
    expect(within(dialog).getByLabelText('Fecha de nacimiento')).toHaveValue('1990-05-10');
    expect(within(dialog).getByLabelText('Nivel')).toHaveValue('intermediate');
    const name = within(dialog).getByLabelText('Nombre');
    await user.clear(name);
    await user.type(name, 'Ana Gómez');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const patches = callsWith(fetchMock, 'PATCH');
    expect(patches).toHaveLength(1);
    expect(patches[0][0]).toBe('/students/st-1');
    expect(bodyOf(patches[0][1])).toEqual({ name: 'Ana Gómez' });
  });

  it('sin cambios cierra sin hacer request', async () => {
    const user = userEvent.setup();
    const { fetchMock, dialog } = await open(user);
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(callsWith(fetchMock, 'PATCH')).toHaveLength(0);
  });

  it('valida el nombre y la fecha futura sin pedir nada', async () => {
    const user = userEvent.setup();
    const { fetchMock, dialog } = await open(user);
    const name = within(dialog).getByLabelText('Nombre');
    await user.clear(name);
    await user.type(name, 'A');
    const birth = within(dialog).getByLabelText('Fecha de nacimiento');
    await user.clear(birth);
    await user.type(birth, '2999-01-01');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText('El nombre debe tener entre 2 y 100 caracteres')).toBeVisible();
    expect(within(dialog).getByText('La fecha no puede ser futura')).toBeVisible();
    expect(callsWith(fetchMock, 'PATCH')).toHaveLength(0);
  });

  it('un 400 del backend queda junto a su campo y el modal sigue abierto', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () =>
      errorResponse(400, 'VALIDATION_ERROR', 'inválido', [{ field: 'name', message: 'Nombre inválido' }]),
    );
    const { dialog } = await open(user, { handlers: { update } });
    await user.type(within(dialog).getByLabelText('Nombre'), 'x');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText('Nombre inválido')).toBeVisible();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('edita el teléfono: lo manda y muestra el error del backend en el campo', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () =>
      errorResponse(400, 'VALIDATION_ERROR', 'inválido', [{ field: 'phone', message: 'Teléfono inválido' }]),
    );
    const { fetchMock, dialog } = await open(user, { handlers: { update } });
    const phone = within(dialog).getByLabelText('Teléfono');
    expect(phone).toHaveAttribute('type', 'tel');
    await user.type(phone, '11 2233 4455');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText('Teléfono inválido')).toBeVisible();
    expect(bodyOf(callsWith(fetchMock, 'PATCH')[0][1])).toEqual({ phone: '11 2233 4455' });
  });

  it('un teléfono con formato inválido no se manda', async () => {
    const user = userEvent.setup();
    const { fetchMock, dialog } = await open(user);
    await user.type(within(dialog).getByLabelText('Teléfono'), '12');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText(PHONE_ERROR)).toBeVisible();
    expect(callsWith(fetchMock, 'PATCH')).toHaveLength(0);
  });
});
