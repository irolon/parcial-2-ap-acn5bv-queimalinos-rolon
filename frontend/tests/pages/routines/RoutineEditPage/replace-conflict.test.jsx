import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { user } from '../../../helpers/shared/user';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { rowNames } from '../../../helpers/routines/editor';
import { renderEdit, savedRoutine, savedRow, stubEditServer } from '../../../helpers/routines/editServer';

beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const save = () => user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
const replace = async (name) => {
  await user.click(screen.getByRole('button', { name: `Opciones de ${name}` }));
  await user.click(screen.getByRole('menuitem', { name: 'Reemplazar' }));
};

describe('RoutineEditPage: reemplazar un ejercicio', () => {
  it('el elegido en la biblioteca toma el lugar y los valores de la fila; al guardar, alta antes que baja', async () => {
    const { server } = await renderEdit(stubEditServer());
    await user.clear(screen.getByLabelText('Reps de Sentadilla'));
    await user.paste('6');
    await replace('Sentadilla');
    expect(screen.getByText(/Elegí en la biblioteca el ejercicio que reemplaza a Sentadilla/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Agregar Press banca plano' }));
    expect(rowNames()).toEqual(['Press banca plano', 'Plancha']);
    expect(screen.getByLabelText('Reps de Press banca plano')).toHaveValue('6');
    expect(screen.queryByText(/Elegí en la biblioteca/)).not.toBeInTheDocument();
    await save();
    expect(await screen.findByText('Cambios guardados')).toBeVisible();
    expect(server.log).toEqual([
      'POST /routines/r-edit/exercises', 'DELETE /routines/r-edit/exercises/re-1', 'PUT /routines/r-edit/exercises/order',
    ]);
    expect(server.rows()).toEqual([['Press banca plano', 4, 6], ['Plancha', 4, 8]]);
  });

  it('reemplazar el único ejercicio no choca con "la rutina tiene que tener al menos uno"', async () => {
    const { server } = await renderEdit(stubEditServer(savedRoutine({ exercises: [savedRow('re-1', 'ex-squat', 0)] })));
    await replace('Sentadilla');
    await user.click(screen.getByRole('button', { name: 'Agregar Plancha' }));
    await save();
    expect(await screen.findByText('Cambios guardados')).toBeVisible();
    expect(server.rows()).toEqual([['Plancha', 4, 8]]);
  });

  it('"Cancelar" vuelve a agregar al final', async () => {
    await renderEdit(stubEditServer());
    await replace('Sentadilla');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Agregar Press banca plano' }));
    expect(rowNames()).toEqual(['Sentadilla', 'Plancha', 'Press banca plano']);
  });
});

describe('RoutineEditPage: la rutina cambió desde que se abrió', () => {
  async function changedElsewhere() {
    const { server } = await renderEdit(stubEditServer());
    server.routine.exercises[1].reps = 20; // otro dispositivo
    await user.clear(screen.getByLabelText('Series de Sentadilla'));
    await user.paste('5');
    await save();
    expect(await screen.findByRole('dialog', { name: 'La rutina cambió desde que la abriste' })).toBeVisible();
    expect(server.log).toEqual([]);
    return server;
  }

  it('"Recargar" trae la versión nueva y descarta lo de la pantalla', async () => {
    const server = await changedElsewhere();
    await user.click(screen.getByRole('button', { name: 'Recargar' }));
    expect(screen.getByLabelText('Reps de Plancha')).toHaveValue('20');
    expect(screen.getByLabelText('Series de Sentadilla')).toHaveValue('4');
    expect(server.log).toEqual([]);
  });

  it('"Guardar igual" guarda lo de la pantalla sobre la versión nueva', async () => {
    const server = await changedElsewhere();
    await user.click(screen.getByRole('button', { name: 'Guardar igual' }));
    expect(await screen.findByText('Cambios guardados')).toBeVisible();
    expect(server.rows()).toEqual([['Sentadilla', 5, 8], ['Plancha', 4, 8]]);
  });
});
