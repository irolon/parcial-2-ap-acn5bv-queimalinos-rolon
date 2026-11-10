import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupUser } from '../../../helpers/shared/user';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import {
  PAGE_PATH,
  fillAndSubmit,
  invitationPosts,
  invitationResponse,
  page,
  stubCanvas,
  stubInvitationApi,
} from '../../../helpers/invitations/newStudent';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { bodyOf, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';

const PUSH = { id: 't-1', name: 'Push A', level: 'intermediate', days: ['monday', 'thursday'] };
const created = () => jsonResponse(201, { data: invitationResponse() });

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
  stubCanvas();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function pickPush(user) {
  const select = await page().findByLabelText('Plantilla inicial');
  await vi.waitFor(() => expect(select).toBeEnabled());
  await user.selectOptions(select, 't-1');
}

describe('NewStudentPage: plantilla inicial', () => {
  it('manda template_id y los días elegidos', async () => {
    const fetchMock = stubInvitationApi(async () => created(), { templates: [PUSH] });
    renderRoute(PAGE_PATH);
    const user = setupUser();
    await pickPush(user);
    await user.click(page().getByRole('checkbox', { name: 'Viernes' }));
    await fillAndSubmit({}, user);
    await page().findByRole('img', { name: /Código QR/ });
    expect(bodyOf(invitationPosts(fetchMock)[0][1])).toMatchObject({
      template_id: 't-1',
      routine_days: ['monday', 'thursday', 'friday'],
    });
  });

  it('sin días, el error del backend se ve en los días', async () => {
    const details = [{ field: 'routine_days', message: 'routine_days debe ser un arreglo no vacío' }];
    stubInvitationApi(async () => errorResponse(400, 'VALIDATION_ERROR', 'Error de validación', details), {
      templates: [PUSH],
    });
    renderRoute(PAGE_PATH);
    const user = setupUser();
    await pickPush(user);
    await user.click(page().getByRole('checkbox', { name: 'Lunes' }));
    await user.click(page().getByRole('checkbox', { name: 'Jueves' }));
    await fillAndSubmit({}, user);
    expect(await page().findByText('routine_days debe ser un arreglo no vacío')).toBeInTheDocument();
  });

  it('si las plantillas no cargan, la invitación sale igual sin plantilla', async () => {
    const fetchMock = stubInvitationApi(async () => created(), { templates: 500 });
    renderRoute(PAGE_PATH);
    expect(await page().findByRole('option', { name: 'No pudimos cargar tus plantillas' })).toBeInTheDocument();
    await fillAndSubmit();
    await page().findByRole('img', { name: /Código QR/ });
    expect(bodyOf(invitationPosts(fetchMock)[0][1])).not.toHaveProperty('template_id');
  });
});
