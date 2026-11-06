import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { DRAFT_STORAGE_KEY, renderEditor, rowNames, storeDraft } from '../../../helpers/routines/editor';
import { bodyOf, calls, jsonResponse } from '../../../helpers/shared/fetchMock';
import { student } from '../../../helpers/students/fixtures';
import { SINGLE } from '../../../helpers/trainer-ai/fixtures';
import { setupUser, storeProposal, storedProposal } from '../../../helpers/trainer-ai/aiPage';

const ANA = student({ id: 'st-9', name: 'Ana Paz' });
const BLOCK_0 = '/pt/rutinas/nueva?alumno=st-9&ia=g-split&bloque=0';
const created = () => jsonResponse(201, { data: { id: 'r-1' } });
const REPLACE = 'Tenés un borrador sin asignar. ¿Reemplazarlo por este bloque?';

beforeEach(() => {
  resetAuthStore();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('RoutineEditorPage: bloque de la IA', () => {
  it('carga el bloque como una plantilla: nombre, objetivo, días y ejercicios con sus valores', async () => {
    storeProposal();
    await renderEditor({ path: BLOCK_0, api: { students: [ANA] } });
    expect(await screen.findByDisplayValue('Empuje')).toBeVisible();
    expect(screen.getByLabelText('Objetivo')).toHaveValue('hypertrophy');
    expect(screen.getByRole('checkbox', { name: 'Lunes' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Miércoles' })).not.toBeChecked();
    expect(rowNames()).toEqual(['Press banca plano', 'Press inclinado con mancuernas']);
    expect(screen.getByLabelText('Series de Press banca plano')).toHaveValue('4');
    expect(screen.getByLabelText('Descanso (s) de Press banca plano')).toHaveValue('90');
    expect(screen.getByLabelText('Peso (kg) de Press banca plano')).toHaveValue('40');
    expect(screen.getByLabelText('Nota de Press banca plano')).toHaveValue('Bajada controlada');
    expect(screen.queryByText('Recuperamos tu borrador')).not.toBeInTheDocument();
  });

  it('avisa los ejercicios que ya no están en la biblioteca', async () => {
    storeProposal({ result: SINGLE });
    await renderEditor({ path: '/pt/rutinas/nueva?ia=g-single&bloque=0' });
    expect(await screen.findByText('Quitamos 1 ejercicio que ya no está en la biblioteca')).toBeVisible();
    expect(rowNames()).toEqual(['Sentadilla']);
  });

  it('con un borrador manual pregunta antes de reemplazarlo', async () => {
    const user = setupUser();
    storeProposal();
    storeDraft();
    await renderEditor({ path: BLOCK_0, api: { students: [ANA] } });
    const confirm = within(await screen.findByRole('dialog'));
    expect(confirm.getByText(REPLACE)).toBeVisible();
    await user.click(confirm.getByRole('button', { name: 'Reemplazar' }));
    expect(screen.getByLabelText('Nombre de la rutina')).toHaveValue('Empuje');
    expect(rowNames()).toEqual(['Press banca plano', 'Press inclinado con mancuernas']);
    expect(screen.queryByText('Recuperamos tu borrador')).not.toBeInTheDocument();
  });

  it('si conserva el borrador, el editor sigue como siempre y al asignar va a la ficha', async () => {
    const user = setupUser();
    storeProposal();
    storeDraft();
    const { router } = await renderEditor({ path: BLOCK_0, api: { students: [ANA], handlers: { create: created } } });
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Conservar el borrador' }));
    expect(screen.getByLabelText('Nombre de la rutina')).toHaveValue('Fuerza A');
    expect(rowNames()).toEqual(['Sentadilla']);
    await user.click(screen.getByRole('button', { name: 'Asignar a alumno' }));
    await user.click(await screen.findByRole('button', { name: 'Asignar' }));
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/pt/alumnos/st-9'));
    expect(storedProposal().assigned).toEqual({});
  });

  it('al asignar vuelve a la propuesta con el bloque marcado "Asignado"', async () => {
    const user = setupUser();
    storeProposal();
    const { fetchMock, router } = await renderEditor({ path: BLOCK_0, api: { students: [ANA], handlers: { create: created } } });
    await screen.findByDisplayValue('Empuje');
    await user.clear(screen.getByLabelText('Series de Press banca plano'));
    await user.type(screen.getByLabelText('Series de Press banca plano'), '5');
    await user.click(screen.getByRole('button', { name: 'Opciones de Press inclinado con mancuernas' }));
    await user.click(screen.getByRole('menuitem', { name: 'Quitar' }));
    await user.click(screen.getByRole('button', { name: 'Agregar Plancha' }));
    await user.click(screen.getByRole('button', { name: 'Asignar a alumno' }));
    expect(await screen.findByLabelText('Alumno')).toHaveValue('st-9');
    await user.click(screen.getByRole('button', { name: 'Asignar' }));
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/pt/rutinas/ia'));
    const post = calls(fetchMock).find(([p, init]) => p === '/routines' && init?.method === 'POST');
    expect(bodyOf(post[1])).toMatchObject({ student_id: 'st-9', name: 'Empuje', goal: 'hypertrophy', days: ['monday'] });
    expect(bodyOf(post[1]).exercises.map((e) => [e.exercise_id, e.sets])).toEqual([['ex-bench', 5], ['ex-plank', 3]]);
    const push = within(await screen.findByRole('region', { name: 'Empuje' }));
    expect(push.getByText('Asignado · con tus cambios')).toBeVisible();
    expect(push.getAllByRole('row').slice(1).map((row) => row.cells[1].textContent)).toEqual(['Press banca plano', 'Plancha']);
    expect(push.getByText('5 × 8')).toBeVisible();
    expect(push.queryByText('Press inclinado con mancuernas')).not.toBeInTheDocument();
    expect(push.getByRole('link', { name: 'Ver la rutina en la ficha de Ana Paz' })).toHaveAttribute('href', '/pt/alumnos/st-9');
    expect(storedProposal().assigned[0]).toMatchObject({ studentId: 'st-9', routineId: 'r-1', block: { name: 'Empuje', days: ['monday'] } });
    expect(within(screen.getByRole('region', { name: 'Piernas' })).getByRole('link', { name: 'Editar y asignar' })).toBeVisible();
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('asignado sin tocar nada: vuelve con "Asignado" a secas y los ejercicios de la propuesta', async () => {
    const user = setupUser();
    storeProposal();
    await renderEditor({ path: BLOCK_0, api: { students: [ANA], handlers: { create: created } } });
    await screen.findByDisplayValue('Empuje');
    await user.click(screen.getByRole('button', { name: 'Asignar a alumno' }));
    await user.click(await screen.findByRole('button', { name: 'Asignar' }));
    const push = within(await screen.findByRole('region', { name: 'Empuje' }));
    expect(push.getByText('Asignado')).toBeVisible();
    expect(push.queryByText(/con tus cambios/)).not.toBeInTheDocument();
    expect(push.getByText('Press inclinado con mancuernas')).toBeVisible();
  });

  it('al volver a abrir el mismo bloque (recarga) recupera lo editado sin preguntar', async () => {
    const user = setupUser();
    storeProposal();
    const first = await renderEditor({ path: BLOCK_0 });
    await screen.findByDisplayValue('Empuje');
    await user.type(screen.getByLabelText('Nombre de la rutina'), ' fuerte');
    first.unmount();
    await renderEditor({ path: BLOCK_0 });
    expect(await screen.findByDisplayValue('Empuje fuerte')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('con una propuesta que ya no está (otra generación) abre el editor como siempre', async () => {
    storeProposal();
    await renderEditor({ path: '/pt/rutinas/nueva?ia=otra&bloque=0' });
    expect(screen.getByLabelText('Nombre de la rutina')).toHaveValue('');
  });
});
