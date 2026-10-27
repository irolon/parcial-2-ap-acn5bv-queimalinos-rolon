import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { bodyOf, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { student, studentDetail } from '../../../helpers/students/fixtures';
import { callsWith, loadProfile } from '../../../helpers/students/profile';
import { daysAgo } from '../../../helpers/students/students';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Ficha mutable: el PATCH la cambia y el GET siguiente la devuelve actualizada. */
function mutableStudent(initial) {
  let current = initial;
  const update = vi.fn(async (init) => {
    current = { ...current, ...JSON.parse(init.body) };
    return jsonResponse(200, { data: current });
  });
  return { detail: () => current, update };
}

describe('StudentProfilePage: baja y reactivación', () => {
  it('pide confirmación, hace PATCH active:false y muestra la pill Dado de baja', async () => {
    const user = userEvent.setup();
    const { detail, update } = mutableStudent(studentDetail());
    const { fetchMock } = await loadProfile({ detail, handlers: { update } });
    await user.click(screen.getByRole('button', { name: 'Dar de baja' }));
    const dialog = await screen.findByRole('dialog', { name: '¿Dar de baja a Ana Paz?' });
    expect(within(dialog).getByText(/No va a poder entrar a la app/)).toBeVisible();
    expect(within(dialog).getByText(/hasta 1 hora/)).toBeVisible();
    expect(callsWith(fetchMock, 'PATCH')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Dar de baja' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(bodyOf(callsWith(fetchMock, 'PATCH')[0][1])).toEqual({ active: false });
    expect(await screen.findByText('Dado de baja')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reactivar' })).toBeVisible();
  });

  it('cancelar no hace request', async () => {
    const user = userEvent.setup();
    const { fetchMock } = await loadProfile({ detail: studentDetail() });
    await user.click(screen.getByRole('button', { name: 'Dar de baja' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(callsWith(fetchMock, 'PATCH')).toHaveLength(0);
  });

  it('reactivar hace PATCH active:true sin confirmación', async () => {
    const user = userEvent.setup();
    const { detail, update } = mutableStudent(studentDetail({ active: false }));
    const { fetchMock } = await loadProfile({ detail, handlers: { update } });
    await user.click(screen.getByRole('button', { name: 'Reactivar' }));
    await waitFor(() => expect(callsWith(fetchMock, 'PATCH')).toHaveLength(1));
    expect(bodyOf(callsWith(fetchMock, 'PATCH')[0][1])).toEqual({ active: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Dado de baja')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Dar de baja' })).toBeVisible();
  });

  it('si reactivar falla muestra el error; reintentar o abrir otro diálogo lo limpia', async () => {
    const user = userEvent.setup();
    const { detail, update } = mutableStudent(studentDetail({ active: false }));
    update.mockImplementationOnce(async () => errorResponse(500, 'INTERNAL', 'Se cayó'));
    update.mockImplementationOnce(async () => errorResponse(500, 'INTERNAL', 'Se cayó otra vez'));
    await loadProfile({ detail, handlers: { update } });
    await user.click(screen.getByRole('button', { name: 'Reactivar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Se cayó');
    await user.click(screen.getByRole('button', { name: 'Reactivar' }));
    expect(await screen.findByText('Se cayó otra vez')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Editar alumno' }));
    await screen.findByRole('dialog', { name: 'Editar alumno' });
    expect(screen.queryByText('Se cayó otra vez')).not.toBeInTheDocument();
  });

  it('reintentar tras el error reactiva y el aviso desaparece', async () => {
    const user = userEvent.setup();
    const { detail, update } = mutableStudent(studentDetail({ active: false }));
    update.mockImplementationOnce(async () => errorResponse(500, 'INTERNAL', 'Se cayó'));
    await loadProfile({ detail, handlers: { update } });
    await user.click(screen.getByRole('button', { name: 'Reactivar' }));
    expect(await screen.findByText('Se cayó')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Reactivar' }));
    expect(await screen.findByRole('button', { name: 'Dar de baja' })).toBeVisible();
    expect(screen.queryByText('Se cayó')).not.toBeInTheDocument();
  });

  it('tras dar de baja, la navegación conserva la posición aunque el alumno ya no esté en la lista', async () => {
    const user = userEvent.setup();
    const carla = studentDetail({ id: 'st-carla', name: 'Carla', last_session_at: daysAgo(8) });
    const others = [
      student({ id: 'st-beto', name: 'Beto', last_session_at: daysAgo(10) }),
      student({ id: 'st-dani', name: 'Dani', last_session_at: daysAgo(2) }),
    ];
    const { detail, update } = mutableStudent(carla);
    const list = () => (detail().active ? [...others, carla] : others);
    const { fetchMock } = await loadProfile({ path: '/pt/alumnos/st-carla', name: 'Carla', list, detail, handlers: { update } });
    expect(await screen.findByText('2 de 3')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Dar de baja' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Dar de baja' }));
    expect(await screen.findByText('Dado de baja')).toBeVisible();
    const listCalls = () => callsWith(fetchMock, 'GET').filter(([path]) => path.startsWith('/students?'));
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(1));
    await waitFor(() => expect(screen.getByText('2 de 3')).toBeVisible());
    expect(screen.getByRole('link', { name: /Anterior/ })).toHaveAttribute('href', '/pt/alumnos/st-beto');
    expect(screen.getByRole('link', { name: /Siguiente/ })).toHaveAttribute('href', '/pt/alumnos/st-dani');
  });
});
