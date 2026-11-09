import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { bodyOf } from '../../../helpers/shared/fetchMock';
import { student, studentDetail } from '../../../helpers/students/fixtures';
import { findGenerateButton, postsTo, renderAi, setupUser } from '../../../helpers/trainer-ai/aiPage';

const ANA = studentDetail({ id: 'st-1', name: 'Ana Paz', goal: 'strength', level: 'intermediate', gym_equipment: ['barra', 'Mancuernas', 'Banco plano'], injuries: 'Lumbalgia' });
const LUIS = studentDetail({ id: 'st-2', name: 'Luis Gil', goal: 'weight_loss', level: 'beginner', gym_equipment: ['band'], injuries: null });
const STUDENTS = [student({ id: 'st-1', name: 'Ana Paz' }), student({ id: 'st-2', name: 'Luis Gil' })];
const NOTE = 'Equipamiento extra del gimnasio: Banco plano';
const FAILED = 'No pudimos cargar los datos del alumno.';
const chip = (name) => screen.getByRole('checkbox', { name });

beforeEach(() => {
  resetAuthStore();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Entra desde la ficha de Ana y pasa a elegir a Luis, cuya ficha responde `luis()`. */
async function switchToLuis(luis) {
  const user = setupUser();
  const api = renderAi('/pt/rutinas/ia?alumno=st-1', { detail: (id) => (id === 'st-1' ? ANA : luis()), students: STUDENTS });
  await findGenerateButton();
  await user.click(screen.getByRole('button', { name: 'Cambiar' }));
  const select = screen.getByLabelText('Alumno');
  await within(select).findByRole('option', { name: 'Luis Gil' });
  await user.selectOptions(select, 'st-2');
  return { user, ...api };
}

describe('AiRoutinePage: precarga desde la ficha', () => {
  it('normaliza el equipamiento en texto libre de la ficha y lo que no mapea va a preferencias (y a la IA)', async () => {
    const user = setupUser();
    const { fetchMock } = renderAi('/pt/rutinas/ia?alumno=st-1', { detail: ANA });
    await findGenerateButton();
    expect(chip('Barra')).toHaveAttribute('aria-checked', 'true');
    expect(chip('Mancuernas')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Preferencias')).toHaveValue(NOTE);
    await user.click(screen.getByRole('button', { name: 'Generar propuesta' }));
    await vi.waitFor(() => expect(postsTo(fetchMock, '/trainer-ai/generate-routine')).toHaveLength(1));
    expect(bodyOf(postsTo(fetchMock, '/trainer-ai/generate-routine')[0][1])).toMatchObject({
      student_id: 'st-1', available_equipment: ['barbell', 'dumbbell'], preferences: NOTE,
    });
  });

  it('si la ficha falla, "Reintentar" completa el formulario sin borrar lo que el PT escribió', async () => {
    const user = setupUser();
    let fails = true;
    renderAi('/pt/rutinas/ia?alumno=st-1', { detail: () => (fails ? 500 : ANA) });
    await findGenerateButton();
    expect(screen.getByText(FAILED)).toBeVisible();
    await user.type(screen.getByLabelText('Lesiones'), 'Rodilla');
    await user.type(screen.getByLabelText('Preferencias'), 'Poco tiempo');
    fails = false;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await vi.waitFor(() => expect(screen.getByLabelText('Objetivo')).toHaveValue('strength'));
    expect(screen.getByLabelText('Lesiones')).toHaveValue('Rodilla');
    expect(screen.getByLabelText('Preferencias')).toHaveValue(`Poco tiempo. ${NOTE}`);
    expect(chip('Barra')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Ana Paz')).toBeVisible();
    expect(screen.queryByText(FAILED)).not.toBeInTheDocument();
  });

  it('si el reintento tarda, el formulario sigue montado con lo escrito (sin poder generar) y al llegar la ficha lo conserva', async () => {
    const user = setupUser();
    let respond = () => 500;
    let arrive;
    renderAi('/pt/rutinas/ia?alumno=st-1', { detail: () => respond() });
    await findGenerateButton();
    expect(screen.getByText(FAILED)).toBeVisible();
    await user.type(screen.getByLabelText('Lesiones'), 'Rodilla');
    await user.type(screen.getByLabelText('Preferencias'), 'Poco tiempo');
    respond = () => new Promise((resolve) => { arrive = resolve; });
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await vi.waitFor(() => expect(arrive).toBeTypeOf('function'));
    expect(screen.getByLabelText('Lesiones')).toHaveValue('Rodilla');
    expect(screen.getByLabelText('Preferencias')).toHaveValue('Poco tiempo');
    expect(screen.getByRole('button', { name: 'Generar propuesta' })).toBeDisabled();
    arrive(ANA);
    await vi.waitFor(() => expect(screen.getByLabelText('Objetivo')).toHaveValue('strength'));
    expect(screen.getByLabelText('Lesiones')).toHaveValue('Rodilla');
    expect(screen.getByLabelText('Preferencias')).toHaveValue(`Poco tiempo. ${NOTE}`);
    expect(screen.getByRole('button', { name: 'Generar propuesta' })).toBeEnabled();
  });

  it('al cambiar de alumno vacía en el acto lo de Ana y no deja generar hasta que llega la ficha de Luis', async () => {
    let arrive;
    await switchToLuis(() => new Promise((resolve) => { arrive = resolve; }));
    expect(screen.getByRole('button', { name: 'Generar propuesta' })).toBeDisabled();
    expect(screen.getByText('Cargando los datos del alumno…')).toBeVisible();
    expect(screen.getByLabelText('Objetivo')).toHaveValue('');
    expect(screen.getByLabelText('Nivel')).toHaveValue('');
    expect(screen.getByLabelText('Lesiones')).toHaveValue('');
    expect(screen.getByLabelText('Preferencias')).toHaveValue('');
    expect(chip('Barra')).toHaveAttribute('aria-checked', 'false');
    await vi.waitFor(() => expect(arrive).toBeTypeOf('function'));
    arrive(LUIS);
    await vi.waitFor(() => expect(screen.getByLabelText('Objetivo')).toHaveValue('weight_loss'));
    expect(chip('Banda')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Generar propuesta' })).toBeEnabled();
  });

  it('si la ficha del nuevo alumno falla avisa con "Reintentar", sin dejar los datos de Ana', async () => {
    let fails = true;
    const { user } = await switchToLuis(() => (fails ? 500 : LUIS));
    expect(await screen.findByText(FAILED)).toBeVisible();
    expect(screen.getByLabelText('Objetivo')).toHaveValue('');
    expect(screen.getByLabelText('Lesiones')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Generar propuesta' })).toBeEnabled();
    fails = false;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await vi.waitFor(() => expect(screen.getByLabelText('Objetivo')).toHaveValue('weight_loss'));
    expect(screen.queryByText(FAILED)).not.toBeInTheDocument();
  });

  it('con la ficha fallida no manda lesiones ni equipamiento vacíos (los completa el backend), salvo que el PT los toque', async () => {
    const { user, fetchMock } = await switchToLuis(() => 500);
    await screen.findByText(FAILED);
    await user.selectOptions(screen.getByLabelText('Objetivo'), 'strength');
    await user.selectOptions(screen.getByLabelText('Nivel'), 'beginner');
    await user.click(screen.getByRole('button', { name: 'Generar propuesta' }));
    await vi.waitFor(() => expect(postsTo(fetchMock, '/trainer-ai/generate-routine')).toHaveLength(1));
    const body = bodyOf(postsTo(fetchMock, '/trainer-ai/generate-routine')[0][1]);
    expect(body).toMatchObject({ student_id: 'st-2', goal: 'strength', level: 'beginner' });
    expect(body).not.toHaveProperty('injuries');
    expect(body).not.toHaveProperty('available_equipment');
  });

  it('con la ficha fallida manda lo que el PT tocó: el equipamiento elegido y las lesiones borradas (null)', async () => {
    const { user, fetchMock } = await switchToLuis(() => 500);
    await screen.findByText(FAILED);
    await user.selectOptions(screen.getByLabelText('Objetivo'), 'strength');
    await user.selectOptions(screen.getByLabelText('Nivel'), 'beginner');
    await user.click(chip('Barra'));
    await user.type(screen.getByLabelText('Lesiones'), 'x');
    await user.clear(screen.getByLabelText('Lesiones'));
    await user.click(screen.getByRole('button', { name: 'Generar propuesta' }));
    await vi.waitFor(() => expect(postsTo(fetchMock, '/trainer-ai/generate-routine')).toHaveLength(1));
    expect(bodyOf(postsTo(fetchMock, '/trainer-ai/generate-routine')[0][1])).toMatchObject({ available_equipment: ['barbell'], injuries: null });
  });
});
