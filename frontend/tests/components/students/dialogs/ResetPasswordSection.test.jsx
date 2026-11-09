import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import ResetPasswordSection from '@/components/students/dialogs/ResetPasswordSection';
import { configureClient } from '@/api/shared/client';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';
import { setupUser } from '../../../helpers/shared/user';
import { renderWithQuery } from '../../../helpers/account/account';

const STUDENT = { id: 's-1', name: 'Tomás Ruiz', active: true };
const TEMPORARY = 'Ab3kP9mQx2';
const NOTE = 'Se muestra una sola vez. Al entrar, tendrá que elegir una nueva.';

beforeEach(() => configureClient({ getToken: () => 'access-1' }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const button = (name) => screen.getByRole('button', { name });
const render = () => renderWithQuery(<ResetPasswordSection student={STUDENT} />);

async function confirmReset(user) {
  await user.click(button('Blanquear clave'));
  await user.click(button('Blanquear'));
}

describe('ResetPasswordSection', () => {
  it('pide confirmación, blanquea con POST y muestra la clave una vez', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { temporary_password: TEMPORARY }));
    const user = setupUser();
    render();
    expect(screen.getByRole('region', { name: 'Acceso a la app' })).toBeInTheDocument();
    await user.click(button('Blanquear clave'));
    expect(screen.getByText('Se cierra su sesión en todos sus dispositivos')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(button('Blanquear'));
    expect(await screen.findByText(TEMPORARY)).toHaveClass('font-mono');
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students/s-1/password-reset');
    expect(init.method).toBe('POST');
  });

  it('Cancelar vuelve al botón sin pedir nada', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { temporary_password: TEMPORARY }));
    const user = setupUser();
    render();
    await user.click(button('Blanquear clave'));
    await user.click(button('Cancelar'));
    expect(button('Blanquear clave')).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dos clics seguidos en "Blanquear" hacen un solo pedido', async () => {
    let resolve;
    const fetchMock = stubFetch(() => new Promise((r) => (resolve = r)));
    const user = setupUser();
    render();
    await user.click(button('Blanquear clave'));
    await user.dblClick(button('Blanquear'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(button('Blanquear')).toBeDisabled();
    expect(button('Cancelar')).toBeDisabled();
    resolve(jsonResponse(200, { temporary_password: TEMPORARY }));
    expect(await screen.findByText(TEMPORARY)).toBeInTheDocument();
  });

  it('"Copiar" escribe la clave y pasa a "Copiada"', async () => {
    stubFetch(async () => jsonResponse(200, { temporary_password: TEMPORARY }));
    const user = setupUser();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    render();
    await confirmReset(user);
    await user.click(await screen.findByRole('button', { name: 'Copiar' }));
    expect(writeText).toHaveBeenCalledWith(TEMPORARY);
    expect(await screen.findByRole('button', { name: 'Copiada' })).toBeInTheDocument();
  });

  it('con un error muestra el mensaje y deja reintentar', async () => {
    stubFetch(async () => errorResponse(409, 'STUDENT_INACTIVE', 'El alumno está dado de baja'));
    const user = setupUser();
    render();
    await confirmReset(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('El alumno está dado de baja');
    expect(button('Blanquear')).toBeEnabled();
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('sin conexión usa el mensaje propio', async () => {
    stubFetch(async () => {
      throw new TypeError('offline');
    });
    const user = setupUser();
    render();
    await confirmReset(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión con el servidor');
  });

  it('al desmontar y volver a montar no se ve la clave', async () => {
    stubFetch(async () => jsonResponse(200, { temporary_password: TEMPORARY }));
    const user = setupUser();
    const { unmount } = render();
    await confirmReset(user);
    await screen.findByText(TEMPORARY);
    unmount();
    render();
    expect(screen.queryByText(TEMPORARY)).toBeNull();
    expect(button('Blanquear clave')).toBeEnabled();
  });
});
