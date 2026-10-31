import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssignChallengeDialog from '@/components/challenges/dialogs/AssignChallengeDialog';
import { bodyOf, calls, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { challenge, student, stubChallengesApi } from '../../../helpers/challenges/challenges';
import { renderWithClient } from '../../../helpers/challenges/renderWithClient';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const STUDENTS = [student('s-1', 'Tomás Ruiz'), student('s-2', 'Ana Gómez'), student('s-3', 'Lucía Pérez')];
const assignCalls = (fetchMock) => calls(fetchMock).filter(([p]) => p === '/challenges/c-1/assignments');

function setup(api = {}) {
  const fetchMock = stubChallengesApi({ students: STUDENTS, ...api });
  const onClose = vi.fn();
  renderWithClient(<AssignChallengeDialog challenge={challenge()} onClose={onClose} />);
  return { fetchMock, onClose };
}

const assignButton = () => screen.getByRole('button', { name: 'Asignar' });
const check = (name) => userEvent.click(screen.getByRole('checkbox', { name: new RegExp(name) }));

describe('AssignChallengeDialog', () => {
  it('el buscador filtra por nombre sin tildes', async () => {
    setup();
    await screen.findByRole('checkbox', { name: /Tomás Ruiz/ });
    await userEvent.type(screen.getByLabelText('Buscar alumno'), 'lucia');
    expect(screen.getByRole('checkbox', { name: /Lucía Pérez/ })).toBeVisible();
    expect(screen.queryByRole('checkbox', { name: /Tomás Ruiz/ })).not.toBeInTheDocument();
  });

  it('los que ya lo tienen activo aparecen deshabilitados con "Ya lo tiene"', async () => {
    setup({ active: ['s-3'] });
    const lucia = await screen.findByRole('checkbox', { name: /Lucía Pérez.*Ya lo tiene/ });
    expect(lucia).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Tomás Ruiz' })).toBeEnabled();
  });

  it('cuenta los seleccionados y con 0 el botón queda deshabilitado', async () => {
    setup();
    await screen.findByRole('checkbox', { name: /Tomás/ });
    expect(screen.getByText('0 seleccionados')).toBeVisible();
    expect(assignButton()).toBeDisabled();
    await check('Tomás');
    expect(screen.getByText('1 seleccionado')).toBeVisible();
    await check('Ana');
    expect(screen.getByText('2 seleccionados')).toBeVisible();
    expect(assignButton()).toBeEnabled();
  });

  it('con más de 50 el botón queda deshabilitado y no pide nada', async () => {
    const many = Array.from({ length: 51 }, (_, i) => student(`s-${i}`, `Alumno ${i}`));
    const assign = vi.fn();
    setup({ students: many, assign });
    await screen.findByRole('checkbox', { name: 'Alumno 0' });
    // fireEvent: 51 clics con userEvent pasan el timeout con la suite completa.
    for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box);
    expect(screen.getByText('51 seleccionados')).toBeVisible();
    expect(screen.getByText('Hasta 50 alumnos por vez')).toBeVisible();
    expect(assignButton()).toBeDisabled();
    await userEvent.click(assignButton());
    expect(assign).not.toHaveBeenCalled();
  });

  it('doble click → un solo POST; al terminar avisa y ofrece "Listo"', async () => {
    let resolve;
    const assign = vi.fn(() => new Promise((r) => { resolve = r; }));
    const { fetchMock, onClose } = setup({ assign, active: [] });
    await screen.findByRole('checkbox', { name: /Tomás/ });
    await check('Tomás');
    await check('Lucía');
    await userEvent.dblClick(assignButton());
    resolve(jsonResponse(201, { data: { created: [{ student_id: 's-1' }], skipped: [{ student_id: 's-3', reason: 'already_active' }] } }));
    expect(await screen.findByRole('status')).toHaveTextContent('Asignado a 1 alumno · 1 ya lo tenía activo (Lucía Pérez)');
    expect(assignCalls(fetchMock)).toHaveLength(1);
    expect(bodyOf(assignCalls(fetchMock)[0][1])).toEqual({ student_ids: ['s-1', 's-3'] });
    expect(screen.queryByRole('button', { name: 'Asignar' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('si falla avisa y deja reintentar', async () => {
    setup({ assign: async () => errorResponse(500, 'INTERNAL', 'Se rompió') });
    await screen.findByRole('checkbox', { name: /Tomás/ });
    await check('Tomás');
    await userEvent.click(assignButton());
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Se rompió');
    expect(assignButton()).toBeEnabled();
  });

  it('sin alumnos activos lo dice', async () => {
    setup({ students: [] });
    expect(await screen.findByText('Todavía no tenés alumnos activos')).toBeVisible();
  });

  it('"Cancelar" cierra sin asignar', async () => {
    const assign = vi.fn();
    const { onClose } = setup({ assign });
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });
});
