import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { bodyOf, jsonResponse } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { student, studentDetail } from '../../../helpers/students/fixtures';
import { setupUser } from '../../../helpers/shared/user';
import { SPLIT } from '../../../helpers/trainer-ai/fixtures';
import { findGenerateButton, postsTo, renderAi, storedProposal } from '../../../helpers/trainer-ai/aiPage';

const LUIS = studentDetail({ id: 'st-2', name: 'Luis Gil', goal: 'strength', level: 'intermediate', injuries: 'Lumbalgia' });
const STUDENTS = [student({ id: 'st-1', name: 'Ana Paz' }), student({ id: 'st-2', name: 'Luis Gil' })];
const FAILED = 'No pudimos cargar los datos del alumno.';
const GENERATE = '/trainer-ai/generate-routine';
const ok = () => jsonResponse(200, { data: SPLIT });

allowSlowScreens();

beforeEach(() => {
  resetAuthStore();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Entrada desde la ficha de Luis con la ficha en 500; espera el aviso. */
async function failedEntry(api = {}) {
  const user = setupUser();
  const rendered = renderAi('/pt/rutinas/ia?alumno=st-2', { detail: () => 500, students: STUDENTS, generate: ok, ...api });
  await screen.findByText(FAILED);
  return { user, ...rendered };
}

async function fillAndGenerate(user, fetchMock, n = 1) {
  await user.selectOptions(screen.getByLabelText('Objetivo'), 'strength');
  await user.selectOptions(screen.getByLabelText('Nivel'), 'beginner');
  await user.click(screen.getByRole('button', { name: 'Generar propuesta' }));
  await vi.waitFor(() => expect(postsTo(fetchMock, GENERATE)).toHaveLength(n));
  return bodyOf(postsTo(fetchMock, GENERATE)[n - 1][1]);
}

describe('AiRoutinePage: entrada desde la ficha con la ficha caída', () => {
  it('el campo muestra al alumno fijo, se genera para él y la propuesta lleva al editor con el alumno', async () => {
    const { user, fetchMock } = await failedEntry();
    expect(await screen.findByText('Luis Gil')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cambiar' })).toBeVisible();
    expect(screen.queryByLabelText('Alumno')).not.toBeInTheDocument();
    expect(await fillAndGenerate(user, fetchMock)).toMatchObject({ student_id: 'st-2' });
    const push = within(await screen.findByRole('region', { name: 'Empuje' }));
    expect(push.getByRole('link', { name: 'Editar y asignar' })).toHaveAttribute('href', '/pt/rutinas/nueva?alumno=st-2&ia=g-split&bloque=0');
    expect(screen.getByRole('link', { name: 'Armar a mano' })).toHaveAttribute('href', '/pt/rutinas/nueva?alumno=st-2');
    expect(storedProposal().student).toMatchObject({ id: 'st-2', name: 'Luis Gil' });
  });

  it('si el alumno no está en la lista de activos se muestra "el alumno de la ficha" y se genera igual para él', async () => {
    const { user, fetchMock } = await failedEntry({ students: [STUDENTS[0]] });
    expect(screen.getByText('el alumno de la ficha')).toBeVisible();
    expect(await fillAndGenerate(user, fetchMock)).toMatchObject({ student_id: 'st-2' });
  });

  it('"Cambiar" → "Sin alumno" pide una propuesta genérica y saca el aviso', async () => {
    const { user, fetchMock } = await failedEntry();
    await user.click(screen.getByRole('button', { name: 'Cambiar' }));
    const select = screen.getByLabelText('Alumno');
    await within(select).findByRole('option', { name: 'Luis Gil' });
    expect(select).toHaveValue('st-2');
    await user.selectOptions(select, '');
    expect(screen.queryByText(FAILED)).not.toBeInTheDocument();
    expect(await fillAndGenerate(user, fetchMock)).not.toHaveProperty('student_id');
    expect(screen.getByRole('link', { name: 'Armar a mano' })).toHaveAttribute('href', '/pt/rutinas/nueva');
  });

  it('al volver al formulario sigue el aviso con "Reintentar" y reintentar precarga la ficha', async () => {
    let up = false;
    const { user, fetchMock } = await failedEntry({ detail: () => (up ? LUIS : 500) });
    await fillAndGenerate(user, fetchMock);
    await user.click(await screen.findByRole('button', { name: 'Generar otra' }));
    await findGenerateButton();
    expect(screen.getByText(FAILED)).toBeVisible();
    up = true;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await vi.waitFor(() => expect(screen.getByLabelText('Lesiones')).toHaveValue('Lumbalgia'));
    expect(screen.queryByText(FAILED)).not.toBeInTheDocument();
  });
});
