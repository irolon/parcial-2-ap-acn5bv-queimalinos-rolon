import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { STUDENT, setSession, renderRoute } from '../../../helpers/routes/renderRoute';
import { student, studentDetail } from '../../../helpers/students/fixtures';
import { findGenerateButton, postsTo, renderAi, setupUser, stubAiApi } from '../../../helpers/trainer-ai/aiPage';

const ANA = studentDetail({ id: 'st-1', name: 'Ana Paz', goal: 'strength', level: 'intermediate', gym_equipment: ['barbell', 'Rack propio'], injuries: 'Lumbalgia' });
const LUIS = studentDetail({ id: 'st-2', name: 'Luis Gil', goal: 'weight_loss', level: 'beginner', gym_equipment: ['band'], injuries: null });
const details = { 'st-1': ANA, 'st-2': LUIS };
const chip = (name) => screen.getByRole('checkbox', { name });

beforeEach(() => {
  resetAuthStore();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('AiRoutinePage: formulario', () => {
  it('desde la ficha precarga objetivo, nivel, equipamiento y lesiones, con el alumno fijo', async () => {
    renderAi('/pt/rutinas/ia?alumno=st-1', { detail: ANA });
    await findGenerateButton();
    expect(screen.getByRole('heading', { level: 1, name: 'Rutina con IA' })).toBeVisible();
    expect(screen.getByText('Ana Paz')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cambiar' })).toBeVisible();
    expect(screen.getByLabelText('Objetivo')).toHaveValue('strength');
    expect(screen.getByLabelText('Nivel')).toHaveValue('intermediate');
    expect(screen.getByLabelText('Días por semana')).toHaveValue(3);
    expect(screen.getByLabelText('Duración por sesión (min)')).toHaveValue(60);
    expect(chip('Barra')).toHaveAttribute('aria-checked', 'true');
    expect(chip('Mancuernas')).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByText('Rack propio')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Lesiones')).toHaveValue('Lumbalgia');
  });

  it('avisa que las lesiones y preferencias van a la IA y cuenta los caracteres', async () => {
    const user = setupUser();
    renderAi('/pt/rutinas/ia', {});
    await findGenerateButton();
    expect(screen.getByText('Esto se le manda a la IA: no pongas datos personales (nombre, DNI, teléfono).')).toBeVisible();
    expect(screen.getAllByText('0/500')).toHaveLength(2);
    await user.type(screen.getByLabelText('Preferencias'), 'Corto');
    expect(screen.getByText('5/500')).toBeVisible();
  });

  it('"Cambiar" muestra los alumnos activos y precarga desde la ficha del elegido', async () => {
    const user = setupUser();
    renderAi('/pt/rutinas/ia?alumno=st-1', { detail: (id) => details[id], students: [student({ id: 'st-1', name: 'Ana Paz' }), student({ id: 'st-2', name: 'Luis Gil' })] });
    await findGenerateButton();
    await user.click(screen.getByRole('button', { name: 'Cambiar' }));
    const select = screen.getByLabelText('Alumno');
    await within(select).findByRole('option', { name: 'Luis Gil' });
    expect(within(select).getByRole('option', { name: 'Sin alumno (propuesta genérica)' })).toBeInTheDocument();
    await user.selectOptions(select, 'st-2');
    await vi.waitFor(() => expect(screen.getByLabelText('Objetivo')).toHaveValue('weight_loss'));
    expect(screen.getByLabelText('Nivel')).toHaveValue('beginner');
    expect(chip('Banda')).toHaveAttribute('aria-checked', 'true');
    expect(chip('Barra')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText('Lesiones')).toHaveValue('');
  });

  it('al elegir un alumno no borra lo que su ficha no tiene', async () => {
    const user = setupUser();
    renderAi('/pt/rutinas/ia', { detail: (id) => details[id], students: [student({ id: 'st-2', name: 'Luis Gil' })] });
    await findGenerateButton();
    await user.type(screen.getByLabelText('Lesiones'), 'Rodilla');
    await user.click(chip('Mancuernas'));
    const select = screen.getByLabelText('Alumno');
    await within(select).findByRole('option', { name: 'Luis Gil' });
    await user.selectOptions(select, 'st-2');
    await vi.waitFor(() => expect(screen.getByLabelText('Objetivo')).toHaveValue('weight_loss'));
    expect(screen.getByLabelText('Lesiones')).toHaveValue('Rodilla');
    expect(chip('Banda')).toHaveAttribute('aria-checked', 'true');
  });

  it('sin alumno arranca vacío, con 3 días y 60 minutos, y ofrece las plantillas', async () => {
    renderAi('/pt/rutinas/ia', { templates: [{ id: 't-1', name: 'Full body', goal: 'hypertrophy', days: ['monday'], exercise_count: 2 }] });
    await findGenerateButton();
    expect(screen.getByLabelText('Alumno')).toHaveValue('');
    expect(screen.getByLabelText('Objetivo')).toHaveValue('');
    const template = screen.getByLabelText('Partir de una plantilla (opcional)');
    await within(template).findByRole('option', { name: 'Full body' });
    expect(template).toHaveValue('');
  });

  it('valida en el cliente con las reglas del backend y no manda nada', async () => {
    const user = setupUser();
    const { fetchMock } = renderAi('/pt/rutinas/ia', {});
    await findGenerateButton();
    await user.clear(screen.getByLabelText('Días por semana'));
    await user.type(screen.getByLabelText('Días por semana'), '8');
    await user.clear(screen.getByLabelText('Duración por sesión (min)'));
    await user.type(screen.getByLabelText('Duración por sesión (min)'), '200');
    await user.click(screen.getByRole('button', { name: 'Generar propuesta' }));
    expect(screen.getByLabelText('Objetivo')).toHaveAccessibleDescription('Elegí un objetivo');
    expect(screen.getByLabelText('Nivel')).toHaveAccessibleDescription('Elegí un nivel');
    expect(screen.getByLabelText('Días por semana')).toHaveAccessibleDescription('Entre 1 y 7 días');
    expect(screen.getByLabelText('Duración por sesión (min)')).toHaveAccessibleDescription('Entre 20 y 180 minutos');
    expect(screen.getByLabelText('Días por semana')).toHaveAttribute('aria-invalid', 'true');
    expect(postsTo(fetchMock, '/trainer-ai/generate-routine')).toHaveLength(0);
  });

  it('un alumno que no existe se marca en el campo y se puede seguir sin él', async () => {
    renderAi('/pt/rutinas/ia?alumno=st-x', { detail: 404 });
    await findGenerateButton();
    expect(screen.getByText('Ese alumno no está activo o no existe')).toBeVisible();
    expect(screen.getByLabelText('Alumno')).toHaveValue('');
  });

  it('es solo para el entrenador', async () => {
    stubAiApi();
    setSession(STUDENT);
    const { router } = renderRoute('/pt/rutinas/ia');
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/alumno/hoy'));
  });
});
