import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { user } from '../../../helpers/shared/user';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { DRAFT_STORAGE_KEY, rowNames } from '../../../helpers/routines/editor';
import { renderEdit, savedRoutine, stubEditServer } from '../../../helpers/routines/editServer';
import { usePageHeaderStore } from '@/hooks/shared/usePageHeader';

beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const save = () => user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
const menu = async (name, item) => {
  await user.click(screen.getByRole('button', { name: `Opciones de ${name}` }));
  await user.click(screen.getByRole('menuitem', { name: item }));
};

describe('RoutineEditPage: carga y guardado', () => {
  it('abre la rutina con su cabecera y sus ejercicios en orden, y con "Guardar cambios" deshabilitado', async () => {
    await renderEdit(stubEditServer());
    expect(screen.getByLabelText('Objetivo')).toHaveValue('strength');
    expect(screen.getByRole('checkbox', { name: 'Lunes' })).toBeChecked();
    expect(rowNames()).toEqual(['Sentadilla', 'Plancha']);
    expect(screen.getByLabelText('Peso (kg) de Sentadilla')).toHaveValue('60');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(usePageHeaderStore.getState().header).toEqual({ title: 'Editar rutina — Fuerza A', subtitle: 'RUTINAS › EDITAR' });
  });

  it('guarda cabecera, valores, alta, baja y orden, y recarga la rutina del servidor', async () => {
    const { server } = await renderEdit(stubEditServer());
    await user.clear(screen.getByLabelText('Nombre de la rutina'));
    await user.paste('Fuerza B');
    await user.clear(screen.getByLabelText('Reps de Plancha'));
    await user.paste('30');
    await user.click(screen.getByRole('button', { name: 'Agregar Press banca plano' }));
    await menu('Press banca plano', 'Subir');
    await menu('Sentadilla', 'Quitar');
    await save();
    expect(await screen.findByText('Cambios guardados')).toBeVisible();
    expect(server.rows()).toEqual([['Press banca plano', 3, 10], ['Plancha', 4, 30]]);
    expect(server.routine.name).toBe('Fuerza B');
    expect(server.log.map((l) => l.split(' ')[0])).toEqual(['PATCH', 'POST', 'PATCH', 'DELETE', 'PUT']);
    expect(rowNames()).toEqual(['Press banca plano', 'Plancha']);
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('no usa el borrador del alta: ni lo lee ni lo escribe', async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ name: 'Borrador', goal: 'tonify', days: [], exercises: [] }));
    await renderEdit(stubEditServer());
    await user.click(screen.getByRole('button', { name: 'Agregar Press banca plano' }));
    expect(screen.queryByDisplayValue('Borrador')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)).name).toBe('Borrador');
  });

  it('valida como el alta antes de mandar nada', async () => {
    const { server } = await renderEdit(stubEditServer());
    await user.clear(screen.getByLabelText('Series de Sentadilla'));
    await save();
    expect(await screen.findByText('Revisá 1 campo')).toBeVisible();
    expect(server.log).toEqual([]);
  });

  it('"Descartar cambios" vuelve a la rutina guardada', async () => {
    await renderEdit(stubEditServer());
    await menu('Sentadilla', 'Quitar');
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    expect(rowNames()).toEqual(['Sentadilla', 'Plancha']);
  });

  it('avisa si la rutina está inactiva', async () => {
    await renderEdit(stubEditServer(savedRoutine({ active: false })));
    expect(screen.getByText(/Esta rutina está inactiva/)).toBeVisible();
  });

  it('si un paso falla muestra el error, conserva lo escrito y al reintentar manda solo lo que faltaba', async () => {
    const server = stubEditServer();
    await renderEdit(server);
    server.fail('DELETE', /exercises\/re-1$/);
    await user.click(screen.getByRole('button', { name: 'Agregar Press banca plano' }));
    await menu('Sentadilla', 'Quitar');
    await save();
    expect(await screen.findByText(/No pudimos guardar todos los cambios/)).toBeVisible();
    expect(rowNames()).toEqual(['Plancha', 'Press banca plano']);
    expect(server.log).toEqual(['POST /routines/r-edit/exercises']);
    await save();
    expect(await screen.findByText('Cambios guardados')).toBeVisible();
    expect(server.log.slice(1)).toEqual(['DELETE /routines/r-edit/exercises/re-1']);
    await waitFor(() => expect(server.rows()).toEqual([['Plancha', 4, 8], ['Press banca plano', 3, 10]]));
  });
});
