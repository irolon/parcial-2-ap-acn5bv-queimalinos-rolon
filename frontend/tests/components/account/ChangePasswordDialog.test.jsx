import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import ChangePasswordDialog from '@/components/account/ChangePasswordDialog';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { setupUser } from '../../helpers/shared/user';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import {
  fillPasswordForm,
  renderWithQuery,
  setStoreSession,
  wrongCurrentResponse,
} from '../../helpers/account/account';

const STUDENT = { id: 's-1', name: 'Ana', role: 'student', email: 'ana@fit.com' };
const CHANGED_AT = '2026-11-09T15:00:00.000Z';
const onClose = vi.fn();
const onChanged = vi.fn();

beforeEach(() => {
  resetAuthStore();
  setStoreSession(STUDENT);
  onClose.mockReset();
  onChanged.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const open = () => renderWithQuery(<ChangePasswordDialog open onClose={onClose} onChanged={onChanged} />);
const save = (user) => user.click(screen.getByRole('button', { name: 'Guardar' }));
const ruleItem = (label) => within(screen.getByRole('list', { name: 'Requisitos' })).getByText(label).closest('li');

describe('ChangePasswordDialog', () => {
  it('muestra los tres campos y las reglas pasan a ✓ al tipear Abcdefg1', async () => {
    const user = setupUser();
    open();
    expect(screen.getByRole('dialog', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña actual')).toHaveAttribute('type', 'password');
    expect(ruleItem('8 caracteres o más')).toHaveAttribute('data-ok', 'false');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'Abcdefg1');
    for (const label of ['8 caracteres o más', 'Una mayúscula', 'Un número']) {
      expect(ruleItem(label)).toHaveAttribute('data-ok', 'true');
      expect(ruleItem(label)).toHaveTextContent('✓');
    }
  });

  it('repetir distinta → "Las contraseñas no coinciden" sin llamar la API', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, {}));
    const user = setupUser();
    open();
    await fillPasswordForm(user, { repeat: 'Otra4clave' });
    await save(user);
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('la actual incorrecta del backend aparece en su campo', async () => {
    stubFetch(async () => wrongCurrentResponse());
    const user = setupUser();
    open();
    await fillPasswordForm(user);
    await save(user);
    expect(await screen.findByText('La contraseña actual es incorrecta')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña actual')).toHaveAttribute('aria-invalid', 'true');
    expect(onChanged).not.toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBe('access-1');
  });

  it('un error sin campo muestra el mensaje general', async () => {
    stubFetch(async () => {
      throw new TypeError('offline');
    });
    const user = setupUser();
    open();
    await fillPasswordForm(user);
    await save(user);
    expect(await screen.findByText('No hay conexión con el servidor')).toBeInTheDocument();
  });

  it('al guardar, el store tiene el token nuevo y se llaman onChanged y onClose', async () => {
    const fetchMock = stubFetch(async () =>
      jsonResponse(200, { token: 'access-2', expires_in: '1h', password_changed_at: CHANGED_AT }),
    );
    const user = setupUser();
    open();
    await fillPasswordForm(user);
    await save(user);
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalled();
    expect(bodyOf(calls(fetchMock)[0][1])).toEqual({
      current_password: 'Viej4clave',
      new_password: 'Nuev4clave',
      refresh_token: 'refresh-1',
    });
    expect(useAuthStore.getState()).toMatchObject({
      token: 'access-2',
      user: { password_changed_at: CHANGED_AT, must_change_password: false },
    });
  });

  it('dos Enter seguidos (antes del render con isPending) hacen un solo pedido', async () => {
    let resolve;
    const fetchMock = stubFetch(() => new Promise((r) => (resolve = r)));
    const user = setupUser();
    open();
    await fillPasswordForm(user);
    const form = screen.getByRole('dialog').querySelector('form');
    // En el mismo act: React no re-renderiza entre los dos submits.
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve(jsonResponse(200, { token: 'access-2', expires_in: '1h', password_changed_at: CHANGED_AT }));
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it('Cancelar cierra sin llamar la API', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, {}));
    const user = setupUser();
    open();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
