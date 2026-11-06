import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { studentDetail } from '../../../helpers/students/fixtures';
import { findGenerateButton, renderAi, setupUser, storeProposal } from '../../../helpers/trainer-ai/aiPage';

const ANA = studentDetail({ id: 'st-1', name: 'Ana Paz', goal: 'strength', level: 'intermediate', gym_equipment: ['barbell'], injuries: 'Lumbalgia' });
const RATIONALE = 'Split de empuje, piernas y core para 3 días.';
const UNFINISHED = 'Tenés una propuesta sin terminar';

beforeEach(() => {
  resetAuthStore();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('AiRoutinePage: entradas', () => {
  it('si la ficha no carga (no un 404), avisa con "Reintentar" y deja usar el formulario sin la precarga', async () => {
    const user = setupUser();
    let fails = true;
    renderAi('/pt/rutinas/ia?alumno=st-1', { detail: () => (fails ? 500 : ANA) });
    expect(await findGenerateButton()).toBeEnabled();
    expect(screen.getByText('No pudimos cargar los datos del alumno.')).toBeVisible();
    expect(screen.queryByText('Ese alumno no está activo o no existe')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Objetivo')).toHaveValue('');
    fails = false;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await vi.waitFor(() => expect(screen.getByLabelText('Objetivo')).toHaveValue('strength'));
    expect(screen.getByText('Ana Paz')).toBeVisible();
    expect(screen.queryByText('No pudimos cargar los datos del alumno.')).not.toBeInTheDocument();
  });

  it('desde Rutinas (`?nueva=1`) abre el formulario aunque haya una propuesta, con "Verla"', async () => {
    const user = setupUser();
    storeProposal();
    const { router } = renderAi('/pt/rutinas/ia?nueva=1', {});
    expect(await findGenerateButton()).toBeVisible();
    expect(screen.getByLabelText('Objetivo')).toHaveValue('');
    expect(screen.getByText(UNFINISHED)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Verla' }));
    expect(await screen.findByText(RATIONALE)).toBeVisible();
    expect(router.state.location.search).toBe('');
  });

  it('desde la ficha abre el formulario precargado aunque haya una propuesta, con el aviso', async () => {
    storeProposal();
    renderAi('/pt/rutinas/ia?alumno=st-1', { detail: ANA });
    await findGenerateButton();
    expect(screen.getByLabelText('Objetivo')).toHaveValue('strength');
    expect(screen.getByText(UNFINISHED)).toBeVisible();
    expect(screen.queryByText(RATIONALE)).not.toBeInTheDocument();
  });

  it('sin propuesta guardada no hay aviso; al generar desde Rutinas la URL queda sin la marca', async () => {
    const user = setupUser();
    const { router } = renderAi('/pt/rutinas/ia?nueva=1', {});
    await findGenerateButton();
    expect(screen.queryByText(UNFINISHED)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Objetivo'), 'strength');
    await user.selectOptions(screen.getByLabelText('Nivel'), 'beginner');
    await user.click(screen.getByRole('button', { name: 'Generar propuesta' }));
    expect(await screen.findByText(RATIONALE)).toBeVisible();
    expect(router.state.location.search).toBe('');
  });

  it('sin marca de entrada (vuelta del editor) sigue mostrando la propuesta', async () => {
    storeProposal();
    renderAi('/pt/rutinas/ia', {});
    expect(await screen.findByText(RATIONALE)).toBeVisible();
    expect(screen.queryByText(UNFINISHED)).not.toBeInTheDocument();
  });
});
