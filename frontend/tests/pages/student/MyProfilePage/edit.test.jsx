import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import MyProfilePage from '@/pages/student/MyProfilePage';
import UserBlock from '@/components/shared/layout/UserBlock';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { PHONE_ERROR } from '@/utils/students/phone';
import { bodyOf, calls, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { setupUser } from '../../../helpers/shared/user';
import { renderOwn, selfDetail, signInSelf, stubSelf } from '../../../helpers/students/self';

allowSlowScreens();

beforeEach(signInSelf);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// El sidebar lee el `user` del store, como en la app.
function Sidebar() {
  const user = useAuthStore((state) => state.user);
  return <UserBlock user={user} onLogout={() => {}} />;
}

/** La ficha guarda lo que manda el PATCH, así el refetch después de guardar trae lo nuevo. */
function show({ phone = '11 1111 1111', updateProfile } = {}) {
  let current = selfDetail({ phone });
  const fetchMock = stubSelf({
    profile: () => current,
    updateProfile:
      updateProfile ??
      ((init) => {
        current = { ...current, ...bodyOf(init) };
        return jsonResponse(200, { data: current });
      }),
  });
  renderOwn(
    <>
      <MyProfilePage />
      <Sidebar />
    </>,
  );
  return fetchMock;
}

const patches = (fetchMock) => calls(fetchMock).filter(([, init]) => init.method === 'PATCH');

async function openDialog(user) {
  await user.click(await screen.findByRole('button', { name: 'Editar datos' }));
  return screen.findByRole('dialog', { name: 'Editar datos' });
}

async function fill(user, dialog, label, value) {
  const field = within(dialog).getByLabelText(label);
  await user.clear(field);
  if (value) await user.type(field, value);
}

describe('MyProfilePage: editar datos', () => {
  it('cambia nombre y teléfono, y el sidebar muestra el nombre nuevo sin recargar', async () => {
    const user = setupUser();
    const fetchMock = show();
    const dialog = await openDialog(user);
    await fill(user, dialog, 'Nombre y apellido', 'Ana Pérez');
    await fill(user, dialog, 'Teléfono', '11 2233 4455');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [[path, init]] = patches(fetchMock);
    expect(path).toBe('/students/s-1');
    expect(bodyOf(init)).toEqual({ name: 'Ana Pérez', phone: '11 2233 4455' });
    expect(useAuthStore.getState().user.name).toBe('Ana Pérez');
    expect(await screen.findByText('11 2233 4455')).toBeVisible();
    expect(screen.getAllByText('Ana Pérez').length).toBeGreaterThan(0);
  });

  it('solo tiene nombre y teléfono: nada de objetivo ni nivel', async () => {
    show();
    const dialog = await openDialog(setupUser());
    expect(within(dialog).getByLabelText('Nombre y apellido')).toBeVisible();
    expect(within(dialog).getByLabelText('Teléfono')).toHaveAttribute('type', 'tel');
    expect(within(dialog).queryByLabelText(/objetivo|nivel/i)).toBeNull();
    expect(within(dialog).queryAllByRole('combobox')).toHaveLength(0);
  });

  it('un teléfono inválido muestra el error sin mandar nada', async () => {
    const user = setupUser();
    const fetchMock = show();
    const dialog = await openDialog(user);
    await fill(user, dialog, 'Teléfono', '123');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText(PHONE_ERROR)).toBeVisible();
    expect(patches(fetchMock)).toHaveLength(0);
  });

  it('el error del backend en el teléfono aparece junto al campo', async () => {
    const user = setupUser();
    show({
      updateProfile: () =>
        errorResponse(400, 'VALIDATION_ERROR', 'Error de validación', [{ field: 'phone', message: 'Teléfono raro' }]),
    });
    const dialog = await openDialog(user);
    await fill(user, dialog, 'Teléfono', '11 5555 5555');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText('Teléfono raro')).toBeVisible();
    expect(within(dialog).getByLabelText('Teléfono')).toHaveAttribute('aria-invalid', 'true');
  });

  it('borrar el teléfono manda null', async () => {
    const user = setupUser();
    const fetchMock = show();
    const dialog = await openDialog(user);
    await fill(user, dialog, 'Teléfono', '');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(patches(fetchMock)).toHaveLength(1));
    expect(bodyOf(patches(fetchMock)[0][1])).toEqual({ phone: null });
  });

  it('sin cambios cierra sin mandar nada', async () => {
    const user = setupUser();
    const fetchMock = show();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(patches(fetchMock)).toHaveLength(0);
  });
});
