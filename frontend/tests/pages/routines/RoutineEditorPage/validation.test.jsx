import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { renderEditor } from '../../../helpers/routines/editor';
import { calls } from '../../../helpers/shared/fetchMock';

beforeEach(() => {
  resetAuthStore();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const assign = () => userEvent.click(screen.getByRole('button', { name: 'Asignar a alumno' }));

describe('RoutineEditorPage: validación', () => {
  it('vacía, marca cabecera y ejercicios con un resumen', async () => {
    const { fetchMock } = await renderEditor();
    expect(screen.queryByText(/^Revisá/)).not.toBeInTheDocument();
    await assign();
    expect(screen.getByText('Revisá 4 campos')).toBeVisible();
    const summary = screen.getByText('Revisá 4 campos');
    const nameInput = screen.getByLabelText('Nombre de la rutina');
    expect(summary.compareDocumentPosition(nameInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('El nombre debe tener entre 2 y 120 caracteres')).toBeVisible();
    expect(screen.getByLabelText('Objetivo')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Elegí al menos un día')).toBeVisible();
    expect(screen.getAllByText('Agregá al menos un ejercicio').length).toBeGreaterThan(0);
    expect(calls(fetchMock).some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('marca la celda con error y deja de marcarla al corregirla', async () => {
    await renderEditor();
    await userEvent.type(screen.getByLabelText('Nombre de la rutina'), 'Fuerza A');
    await userEvent.selectOptions(screen.getByLabelText('Objetivo'), 'strength');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lunes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar Sentadilla' }));
    const reps = screen.getByLabelText('Reps de Sentadilla');
    await userEvent.clear(reps);
    await userEvent.type(reps, '0');
    await assign();
    expect(screen.getByText('Revisá 1 campo')).toBeVisible();
    expect(reps).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Tiene que ser un entero mayor que 0')).toBeVisible();
    await userEvent.clear(reps);
    await userEvent.type(reps, '8');
    expect(reps).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText(/^Revisá/)).not.toBeInTheDocument();
  });
});
