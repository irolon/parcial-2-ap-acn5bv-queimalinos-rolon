import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { studentDetail } from '../../../helpers/students/fixtures';
import { SPLIT } from '../../../helpers/trainer-ai/fixtures';
import { setupUser } from '../../../helpers/shared/user';
import { findGenerateButton, postsTo, renderAi } from '../../../helpers/trainer-ai/aiPage';

const ANA = studentDetail({ id: 'st-1', name: 'Ana Paz', goal: 'strength', level: 'beginner' });
const ok = () => jsonResponse(200, { data: SPLIT });
const tooMany = (seconds) => {
  const res = errorResponse(429, 'RATE_LIMIT_EXCEEDED', 'Ya hay una propuesta en curso. Esperá a que termine.');
  res.headers.set('Retry-After', String(seconds));
  return res;
};

/** Primer pedido con `first`, los siguientes bien. */
const thenOk = (first) => {
  let n = 0;
  return vi.fn(() => (n++ === 0 ? first() : ok()));
};

async function generate(api) {
  const result = renderAi('/pt/rutinas/ia?alumno=st-1', { detail: ANA, ...api });
  fireEvent.click(await findGenerateButton());
  return result;
}

beforeEach(() => {
  resetAuthStore();
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('AiRoutinePage: errores', () => {
  it.each([
    ['503', () => errorResponse(503, 'AI_UNAVAILABLE', 'El asistente no está disponible ahora. Probá de nuevo o armá la rutina a mano.'), 'El asistente no está disponible ahora.'],
    ['sin red', () => Promise.reject(new TypeError('Failed to fetch')), 'El asistente no está disponible ahora.'],
    ['502', () => errorResponse(502, 'AI_INVALID_RESPONSE', 'inválida'), 'La IA devolvió una propuesta que no sirve. Probá de nuevo.'],
  ])('%s: mensaje claro con "Reintentar" y "Armar a mano"', async (_, first, message) => {
    const user = setupUser();
    const generateMock = thenOk(first);
    await generate({ generate: generateMock });
    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Armar a mano' })).toHaveAttribute('href', '/pt/rutinas/nueva?alumno=st-1');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Split de empuje, piernas y core para 3 días.')).toBeVisible();
    expect(generateMock).toHaveBeenCalledTimes(2);
  });

  it('429: el mensaje del backend con la cuenta atrás de Retry-After, y "Reintentar" recién al terminar', async () => {
    const generateMock = thenOk(() => tooMany(3));
    renderAi('/pt/rutinas/ia?alumno=st-1', { detail: ANA, generate: generateMock });
    const button = await findGenerateButton();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    fireEvent.click(button);
    expect(await screen.findByText('Ya hay una propuesta en curso. Esperá a que termine.')).toBeVisible();
    expect(screen.getByText('Podés reintentar en 3 s')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Armar a mano' })).toBeVisible();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByText('Podés reintentar en 2 s')).toBeVisible();
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(screen.queryByText(/Podés reintentar en/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Split de empuje, piernas y core para 3 días.')).toBeVisible();
  });

  it('404 del alumno: vuelve al formulario con el error en el campo', async () => {
    await generate({ generate: () => errorResponse(404, 'STUDENT_NOT_FOUND', 'Alumno no encontrado') });
    expect(await screen.findByText('Ese alumno no está activo o no existe')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Generar propuesta' })).toBeVisible();
  });

  it('404 de la plantilla: el error va en "Partir de una plantilla"', async () => {
    await generate({ generate: () => errorResponse(404, 'TEMPLATE_NOT_FOUND', 'Plantilla no encontrada') });
    const select = await screen.findByLabelText('Partir de una plantilla (opcional)');
    expect(await screen.findByText('Esa plantilla ya no existe')).toBeVisible();
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });

  it('400: cada detalle se muestra en su campo', async () => {
    const details = [{ field: 'session_duration_min', message: 'session_duration_min debe ser un entero de 20 a 180' }];
    const { fetchMock } = await generate({ generate: () => errorResponse(400, 'VALIDATION_ERROR', 'Error de validación', details) });
    expect(await screen.findByText('Entre 20 y 180 minutos')).toBeVisible();
    expect(screen.getByLabelText('Duración por sesión (min)')).toHaveAttribute('aria-invalid', 'true');
    expect(postsTo(fetchMock, '/trainer-ai/generate-routine')).toHaveLength(1);
  });
});
