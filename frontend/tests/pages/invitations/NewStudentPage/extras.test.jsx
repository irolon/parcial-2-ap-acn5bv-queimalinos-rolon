import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import { bodyOf, jsonResponse } from '../../../helpers/shared/fetchMock';
import { stubStudents } from '../../../helpers/students/students';

// Datos extra del prototipo (frecuencia, altura, peso, edad) y el contexto para la IA.
beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
  stubStudents();
  stubCanvas();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const created = () => jsonResponse(201, { data: invitationResponse() });

describe('NewStudentPage: datos extra', () => {
  it('manda frecuencia, altura, peso, nacimiento, equipamiento y lesiones', async () => {
    const fetchMock = stubInvitationApi(async () => created());
    renderRoute(PAGE_PATH);
    const user = userEvent.setup();
    const main = within(await screen.findByRole('main'));
    await user.selectOptions(main.getByLabelText('Frecuencia (opcional)'), '4');
    await user.type(main.getByLabelText('Altura (cm)'), '178');
    await user.type(main.getByLabelText('Peso (kg)'), '74.5');
    await user.type(main.getByLabelText('Fecha de nacimiento'), '2002-03-15');
    await user.click(main.getByRole('checkbox', { name: 'Barra' }));
    await user.type(main.getByLabelText('Agregar otro'), 'Banco plano');
    await user.click(main.getByRole('button', { name: 'Agregar' }));
    // Lo que quedó escrito sin tocar "Agregar" también va (como en "Contexto para la IA").
    await user.type(main.getByLabelText('Agregar otro'), 'Soga');
    await user.type(main.getByLabelText('Lesiones'), 'Rodilla derecha');
    await fillAndSubmit({}, user);
    await page().findByRole('img', { name: /Código QR/ });
    expect(bodyOf(invitationPosts(fetchMock)[0][1])).toMatchObject({
      weekly_frequency: 4,
      height_cm: 178,
      weight_kg: 74.5,
      birth_date: '2002-03-15',
      gym_equipment: ['barbell', 'Banco plano', 'Soga'],
      injuries: 'Rodilla derecha',
    });
  });

  it('muestra la edad que da la fecha de nacimiento', async () => {
    stubInvitationApi(async () => created());
    renderRoute(PAGE_PATH);
    const main = within(await screen.findByRole('main'));
    const birth = main.getByLabelText('Fecha de nacimiento');
    expect(birth).not.toHaveAccessibleDescription(/años/);
    await userEvent.setup().type(birth, '2000-01-01');
    expect(birth).toHaveAccessibleDescription(/^\d{2} años$/);
  });

  it('una altura fuera de rango se marca en el campo sin llamar a la API', async () => {
    const fetchMock = stubInvitationApi(async () => created());
    renderRoute(PAGE_PATH);
    const user = userEvent.setup();
    const main = within(await screen.findByRole('main'));
    await user.type(main.getByLabelText('Altura (cm)'), '17');
    await fillAndSubmit({}, user);
    expect(page().getByLabelText('Altura (cm)')).toHaveAccessibleDescription('Entre 50 y 250 cm');
    expect(invitationPosts(fetchMock)).toHaveLength(0);
  });
});
