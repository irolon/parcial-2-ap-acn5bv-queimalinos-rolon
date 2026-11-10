import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { bodyOf, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { student, studentDetail } from '../../../helpers/students/fixtures';
import { setupUser } from '../../../helpers/shared/user';
import { SPLIT } from '../../../helpers/trainer-ai/fixtures';
import { findGenerateButton, hangingGenerate, postsTo, renderAi } from '../../../helpers/trainer-ai/aiPage';

const ANA = studentDetail({ id: 'st-1', name: 'Ana Paz', goal: 'strength', level: 'intermediate', injuries: 'Lumbalgia' });
const STUDENTS = [student({ id: 'st-1', name: 'Ana Paz' }), student({ id: 'st-2', name: 'Luis Gil' })];
const FAILED = 'No pudimos cargar los datos del alumno.';
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

/** Elige a Luis (cuya ficha falla) y completa objetivo y nivel; `generate` responde cada pedido. */
async function failedLuis(generate) {
  const user = setupUser();
  const api = { detail: (id) => (id === 'st-1' ? ANA : 500), students: STUDENTS, generate };
  const rendered = renderAi('/pt/rutinas/ia?alumno=st-1', api);
  await findGenerateButton();
  await user.click(screen.getByRole('button', { name: 'Cambiar' }));
  const select = screen.getByLabelText('Alumno');
  await within(select).findByRole('option', { name: 'Luis Gil' });
  await user.selectOptions(select, 'st-2');
  await screen.findByText(FAILED);
  await user.selectOptions(screen.getByLabelText('Objetivo'), 'strength');
  await user.selectOptions(screen.getByLabelText('Nivel'), 'beginner');
  await user.click(screen.getByRole('button', { name: 'Generar propuesta' }));
  return { user, api, ...rendered };
}

/** Vuelve a generar desde el formulario y devuelve el body del pedido número `n`. */
async function generateAgain(user, fetchMock, n) {
  await user.click(await findGenerateButton());
  await vi.waitFor(() => expect(postsTo(fetchMock, '/trainer-ai/generate-routine')).toHaveLength(n));
  return bodyOf(postsTo(fetchMock, '/trainer-ai/generate-routine')[n - 1][1]);
}

function expectStillUnloaded(body) {
  expect(body).toMatchObject({ student_id: 'st-2', goal: 'strength', level: 'beginner' });
  expect(body).not.toHaveProperty('injuries');
  expect(body).not.toHaveProperty('available_equipment');
}

describe('AiRoutinePage: lo que no se pudo precargar sobrevive a la vuelta al formulario', () => {
  it('ficha fallida, generar, cancelar y volver a generar: el segundo pedido sigue sin lesiones ni equipamiento', async () => {
    let n = 0;
    const generate = (init) => (n++ === 0 ? hangingGenerate()(init) : ok());
    const { user, fetchMock } = await failedLuis(generate);
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expectStillUnloaded(await generateAgain(user, fetchMock, 2));
  });

  it('tras errores de campo del servidor el reintento sigue sin lesiones ni equipamiento', async () => {
    let n = 0;
    const details = [{ field: 'preferences' }];
    const generate = () => (n++ === 0 ? errorResponse(400, 'VALIDATION_ERROR', 'Error de validación', details) : ok());
    const { user, fetchMock } = await failedLuis(generate);
    await screen.findByText('Hasta 500 caracteres');
    expectStillUnloaded(await generateAgain(user, fetchMock, 2));
  });

  it('"Generar otra" (también después de recargar) sigue sin lesiones ni equipamiento', async () => {
    const { user, api, fetchMock, unmount } = await failedLuis(ok);
    await user.click(await screen.findByRole('button', { name: 'Generar otra' }));
    expectStillUnloaded(await generateAgain(user, fetchMock, 2));
    unmount();
    const reloaded = renderAi('/pt/rutinas/ia', api);
    await user.click(await screen.findByRole('button', { name: 'Generar otra' }));
    expectStillUnloaded(await generateAgain(user, reloaded.fetchMock, 1));
  });

  it('lo que el PT toca al volver al formulario sí se manda', async () => {
    const { user, fetchMock } = await failedLuis(ok);
    await user.click(await screen.findByRole('button', { name: 'Generar otra' }));
    await findGenerateButton();
    await user.click(screen.getByRole('checkbox', { name: 'Barra' }));
    await user.type(screen.getByLabelText('Lesiones'), 'x');
    await user.clear(screen.getByLabelText('Lesiones'));
    expect(await generateAgain(user, fetchMock, 2)).toMatchObject({ available_equipment: ['barbell'], injuries: null });
  });

  it('entrada desde la ficha con la ficha caída: se genera para ese alumno y el backend completa con su ficha', async () => {
    const user = setupUser();
    const { fetchMock } = renderAi('/pt/rutinas/ia?alumno=st-2', { detail: () => 500, students: STUDENTS, generate: ok });
    await screen.findByText(FAILED);
    await user.selectOptions(screen.getByLabelText('Objetivo'), 'strength');
    await user.selectOptions(screen.getByLabelText('Nivel'), 'beginner');
    expectStillUnloaded(await generateAgain(user, fetchMock, 1));
  });
});
