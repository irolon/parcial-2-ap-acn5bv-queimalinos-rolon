import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { DRAFT_STORAGE_KEY, fillRoutine, renderEditor, storeDraft } from '../../../helpers/routines/editor';
import { bodyOf, calls, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { student } from '../../../helpers/students/fixtures';

const ANA = student({ id: 'st-9', name: 'Ana Paz' });
const LUIS = student({ id: 'st-8', name: 'Luis Gil' });
const created = () => jsonResponse(201, { data: { id: 'r-1' } });

beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const posts = (fetchMock) => calls(fetchMock).filter(([path, init]) => init?.method === 'POST' && path === '/routines');
const openAssign = () => userEvent.click(screen.getByRole('button', { name: 'Asignar a alumno' }));
const row = (id, order) => ({ exercise_id: id, sets: 3, reps: 10, rest_seconds: 90, suggested_kg: null, tempo: null, notes: null, order });

async function chooseAna() {
  await userEvent.selectOptions(await screen.findByLabelText('Alumno'), 'st-9');
}

describe('RoutineEditorPage: asignar', () => {
  it('con la rutina incompleta no abre el modal', async () => {
    await renderEditor({ api: { students: [ANA] } });
    await openAssign();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('manda un solo POST con los ejercicios reordenados y renumerados, limpia el borrador y va a la ficha', async () => {
    const create = vi.fn(created);
    const { fetchMock, router } = await renderEditor({ api: { students: [ANA, LUIS], handlers: { create } } });
    await fillRoutine();
    for (let i = 0; i < 2; i += 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Opciones de Press banca plano' }));
      await userEvent.click(screen.getByRole('menuitem', { name: 'Subir' }));
    }
    localStorage.setItem(DRAFT_STORAGE_KEY, '{}');
    await openAssign();
    await userEvent.selectOptions(await screen.findByLabelText('Alumno'), 'st-9');
    await userEvent.dblClick(screen.getByRole('button', { name: 'Asignar' }));
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/pt/alumnos/st-9'));
    expect(posts(fetchMock)).toHaveLength(1);
    expect(bodyOf(posts(fetchMock)[0][1])).toEqual({
      student_id: 'st-9',
      name: 'Fuerza A',
      goal: 'strength',
      days: ['monday'],
      exercises: [row('ex-bench', 0), row('ex-squat', 1), row('ex-plank', 2)],
    });
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('preselecciona al alumno de `?alumno=` y lista solo los activos', async () => {
    await renderEditor({ path: '/pt/rutinas/nueva?alumno=st-8', api: { students: [ANA, LUIS], deactivated: [student({ name: 'Baja' })] } });
    await fillRoutine(['Sentadilla']);
    await openAssign();
    const select = await screen.findByLabelText('Alumno');
    await screen.findByRole('option', { name: 'Luis Gil' });
    expect(select).toHaveValue('st-8');
    expect(screen.queryByRole('option', { name: 'Baja' })).not.toBeInTheDocument();
  });

  it('sin elegir alumno no envía y lo pide', async () => {
    const { fetchMock } = await renderEditor({ api: { students: [ANA] } });
    await fillRoutine(['Sentadilla']);
    await openAssign();
    await screen.findByRole('option', { name: 'Ana Paz' });
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Elegí un alumno');
    expect(posts(fetchMock)).toHaveLength(0);
  });

  it('un 400 marca la celda del servidor y se limpia al editarla', async () => {
    const details = [{ field: 'exercises[1].reps', message: 'Reps fuera de rango' }];
    const create = vi.fn(() => errorResponse(400, 'VALIDATION_ERROR', 'Datos inválidos', details));
    await renderEditor({ api: { students: [ANA], handlers: { create } } });
    await fillRoutine(['Sentadilla', 'Plancha']);
    await openAssign();
    await chooseAna();
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }));
    expect(await screen.findByText('Revisá los datos de la rutina')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    const reps = screen.getByLabelText('Reps de Plancha');
    expect(reps).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Reps fuera de rango')).toBeVisible();
    expect(screen.getByText('Revisá 1 campo')).toBeVisible();
    await userEvent.type(reps, '1');
    expect(reps).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText(/^Revisá/)).not.toBeInTheDocument();
  });

  it('un error de `exercise_id` se muestra bajo el nombre del ejercicio', async () => {
    const details = [{ field: 'exercises[0].exercise_id', message: 'Ejercicio inexistente' }];
    const create = vi.fn(() => errorResponse(400, 'VALIDATION_ERROR', 'Datos inválidos', details));
    await renderEditor({ api: { students: [ANA], handlers: { create } } });
    await fillRoutine(['Sentadilla']);
    await openAssign();
    await chooseAna();
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Ejercicio inexistente')).toBeVisible();
    expect(screen.getByText('Revisá 1 campo')).toBeVisible();
  });

  it('un 403 muestra el mensaje del backend y deja el modal abierto', async () => {
    const create = vi.fn(() => errorResponse(403, 'FORBIDDEN', 'Ese alumno no es tuyo'));
    await renderEditor({ api: { students: [ANA], handlers: { create } } });
    await fillRoutine(['Sentadilla']);
    await openAssign();
    await chooseAna();
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }));
    expect(await screen.findByText('Ese alumno no es tuyo')).toBeVisible();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('con el borrador restaurado también asigna y lo borra', async () => {
    storeDraft();
    const { router } = await renderEditor({ api: { students: [ANA], handlers: { create: created } } });
    await openAssign();
    await chooseAna();
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }));
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/pt/alumnos/st-9'));
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});
