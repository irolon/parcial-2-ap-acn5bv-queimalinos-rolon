import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { bodyOf } from '../../../helpers/shared/fetchMock';
import { studentDetail } from '../../../helpers/students/fixtures';
import { findGenerateButton, hangingGenerate, postsTo, renderAi, setupUser } from '../../../helpers/trainer-ai/aiPage';

const ANA = studentDetail({ id: 'st-1', name: 'Ana Paz', goal: 'strength', level: 'intermediate', gym_equipment: ['barbell'], injuries: 'Lumbalgia' });
const block = (name) => screen.getByRole('region', { name });

beforeEach(() => {
  resetAuthStore();
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('AiRoutinePage: generar', () => {
  it('manda los parámetros y muestra la propuesta con todos sus bloques', async () => {
    const user = setupUser();
    const { fetchMock, router } = renderAi('/pt/rutinas/ia?alumno=st-1', { detail: ANA });
    await findGenerateButton();
    await user.type(screen.getByLabelText('Preferencias'), 'Poco tiempo');
    await user.click(screen.getByRole('button', { name: 'Generar propuesta' }));
    expect(await screen.findByText('Esta es una propuesta de la IA. Revisala y ajustala antes de asignarla.')).toBeVisible();
    expect(bodyOf(postsTo(fetchMock, '/trainer-ai/generate-routine')[0][1])).toEqual({
      student_id: 'st-1', goal: 'strength', level: 'intermediate', frequency_per_week: 3, session_duration_min: 60,
      available_equipment: ['barbell'], injuries: 'Lumbalgia', preferences: 'Poco tiempo',
    });
    expect(screen.getByText('Split de empuje, piernas y core para 3 días.')).toBeVisible();
    expect(screen.getAllByRole('region')).toHaveLength(3);
    const push = within(block('Empuje'));
    expect(push.getByRole('img', { name: 'Días: Lunes' })).toBeVisible();
    expect(push.getByText('Press banca plano')).toBeVisible();
    expect(push.getAllByText('4 × 8')).toHaveLength(2);
    expect(push.getByText('40 kg')).toBeVisible();
    expect(push.getByText('Bajada controlada')).toBeVisible();
    expect(push.getAllByText('90 s')).toHaveLength(2);
    expect(push.getByRole('link', { name: 'Editar y asignar' })).toHaveAttribute('href', '/pt/rutinas/nueva?alumno=st-1&ia=g-split&bloque=0');
    expect(within(block('Piernas')).getByText('5 × 5')).toBeVisible();
    expect(within(block('Core')).getByRole('link', { name: 'Editar y asignar' })).toHaveAttribute('href', '/pt/rutinas/nueva?alumno=st-1&ia=g-split&bloque=2');
    expect(screen.getByRole('link', { name: 'Armar a mano' })).toHaveAttribute('href', '/pt/rutinas/nueva?alumno=st-1');
    expect(router.state.location.search).toBe('');
  });

  it('mientras espera muestra el estado, los segundos y cambia el mensaje a los 8 y a los 18 s', async () => {
    renderAi('/pt/rutinas/ia?alumno=st-1', { detail: ANA, generate: hangingGenerate() });
    await findGenerateButton();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    fireEvent.click(screen.getByRole('button', { name: 'Generar propuesta' }));
    expect(screen.getByText('Armando la rutina…')).toBeVisible();
    expect(screen.getByText('Mirando los datos del alumno y tu biblioteca…')).toBeVisible();
    expect(screen.getByText('0 s')).toBeVisible();
    expect(screen.getByText('Segundos transcurridos:')).toHaveClass('sr-only');
    await act(() => vi.advanceTimersByTimeAsync(8000));
    expect(screen.getByText('Eligiendo ejercicios de tu biblioteca…')).toBeVisible();
    expect(screen.getByText('8 s')).toBeVisible();
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(screen.getByText('Ya casi…')).toBeVisible();
    expect(screen.getByText('18 s')).toBeVisible();
  });

  it('sin alumno, el primer mensaje de la espera no habla del alumno', async () => {
    const user = setupUser();
    renderAi('/pt/rutinas/ia', { generate: hangingGenerate() });
    await findGenerateButton();
    await user.selectOptions(screen.getByLabelText('Objetivo'), 'strength');
    await user.selectOptions(screen.getByLabelText('Nivel'), 'beginner');
    await user.click(screen.getByRole('button', { name: 'Generar propuesta' }));
    expect(screen.getByText('Mirando tu biblioteca…')).toBeVisible();
    expect(screen.queryByText(/datos del alumno/)).not.toBeInTheDocument();
  });

  it('"Cancelar" aborta el pedido y vuelve al formulario con los datos intactos', async () => {
    const user = setupUser();
    const signals = [];
    renderAi('/pt/rutinas/ia?alumno=st-1', { detail: ANA, generate: hangingGenerate(signals) });
    await findGenerateButton();
    await user.selectOptions(screen.getByLabelText('Nivel'), 'advanced');
    await user.type(screen.getByLabelText('Preferencias'), 'Sin saltos');
    await user.click(screen.getByRole('button', { name: 'Generar propuesta' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(signals[0].aborted).toBe(true);
    expect(await findGenerateButton()).toBeVisible();
    expect(screen.getByLabelText('Nivel')).toHaveValue('advanced');
    expect(screen.getByLabelText('Preferencias')).toHaveValue('Sin saltos');
    expect(screen.getByText('Ana Paz')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('un doble clic en "Generar propuesta" manda un solo pedido', async () => {
    const user = setupUser();
    const { fetchMock } = renderAi('/pt/rutinas/ia?alumno=st-1', { detail: ANA });
    await user.dblClick(await findGenerateButton());
    await screen.findByText('Split de empuje, piernas y core para 3 días.');
    expect(postsTo(fetchMock, '/trainer-ai/generate-routine')).toHaveLength(1);
  });

  it('"Generar otra" vuelve al formulario con los mismos datos', async () => {
    const user = setupUser();
    renderAi('/pt/rutinas/ia?alumno=st-1', { detail: ANA });
    await findGenerateButton();
    await user.type(screen.getByLabelText('Preferencias'), 'Poco tiempo');
    await user.click(screen.getByRole('button', { name: 'Generar propuesta' }));
    await user.click(await screen.findByRole('button', { name: 'Generar otra' }));
    expect(await findGenerateButton()).toBeVisible();
    expect(screen.getByLabelText('Preferencias')).toHaveValue('Poco tiempo');
    expect(screen.getByLabelText('Objetivo')).toHaveValue('strength');
    expect(screen.getByText('Ana Paz')).toBeVisible();
  });
});
