import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { user } from '../../../helpers/shared/user';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { renderEdit, savedRoutine, stubEditServer } from '../../../helpers/routines/editServer';

beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const save = () => user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
const type = async (label, value) => {
  await user.clear(screen.getByLabelText(label));
  await user.paste(value);
};

describe('RoutineEditPage: resguardos al guardar', () => {
  it('mientras guarda bloquea cabecera, tabla, menú de fila y biblioteca, y al terminar los libera', async () => {
    const server = stubEditServer();
    await renderEdit(server);
    const release = server.hold('PATCH', /exercises\/re-1$/);
    await type('Series de Sentadilla', '5');
    await save();
    expect(await screen.findByRole('button', { name: 'Guardando…' })).toBeDisabled();
    expect(screen.getByLabelText('Nombre de la rutina')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Lunes' })).toBeDisabled();
    expect(screen.getByLabelText('Reps de Plancha')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Opciones de Plancha' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Agregar Press banca plano' })).toBeDisabled();
    release();
    expect(await screen.findByText('Cambios guardados')).toBeVisible();
    expect(screen.getByLabelText('Reps de Plancha')).toBeEnabled();
    expect(server.rows()).toEqual([['Sentadilla', 5, 8], ['Plancha', 4, 8]]);
  });

  it('si falla la comprobación inicial no adopta la versión de afuera: el reintento vuelve a avisar', async () => {
    const server = stubEditServer();
    await renderEdit(server);
    server.routine.exercises[1].reps = 20; // otro dispositivo
    server.fail('GET', /^\/routines\/r-edit$/);
    await type('Series de Sentadilla', '5');
    await save();
    expect(await screen.findByText(/No pudimos guardar todos los cambios/)).toBeVisible();
    expect(screen.getByLabelText('Reps de Plancha')).toHaveValue('8');
    await save();
    expect(await screen.findByRole('dialog', { name: 'La rutina cambió desde que la abriste' })).toBeVisible();
    expect(server.log).toEqual([]);
  });

  it('una rutina sin objetivo se guarda sin obligar a elegir uno y sin mandar la cabecera', async () => {
    const server = stubEditServer(savedRoutine({ goal: null }));
    await renderEdit(server);
    await type('Reps de Plancha', '30');
    await save();
    expect(await screen.findByText('Cambios guardados')).toBeVisible();
    expect(server.log).toEqual(['PATCH /routines/r-edit/exercises/re-2']);
  });
});
