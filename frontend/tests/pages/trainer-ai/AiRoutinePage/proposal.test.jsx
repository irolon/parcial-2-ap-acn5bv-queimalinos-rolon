import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { renderRoute } from '../../../helpers/routes/renderRoute';
import { bodyOf, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { studentDetail } from '../../../helpers/students/fixtures';
import { SINGLE, SPLIT } from '../../../helpers/trainer-ai/fixtures';
import { setupUser } from '../../../helpers/shared/user';
import { findGenerateButton, postsTo, renderAi, storeProposal, storedProposal } from '../../../helpers/trainer-ai/aiPage';

const SAVE = '/trainer-ai/save-as-template';
const saved = (templates) => () => jsonResponse(201, { data: { generation_id: 'g', templates } });
const dialog = () => within(screen.getByRole('dialog'));

beforeEach(() => {
  resetAuthStore();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function openSave(api, result = SPLIT) {
  storeProposal({ result });
  const user = setupUser();
  const utils = renderAi('/pt/rutinas/ia', api);
  await user.click(await screen.findByRole('button', { name: 'Guardar como plantillas' }));
  return { ...utils, user };
}

describe('AiRoutinePage: propuesta guardada', () => {
  it('sobrevive a una recarga sin volver a pedirla', async () => {
    const user = setupUser();
    const { fetchMock, unmount } = renderAi('/pt/rutinas/ia?alumno=st-1', { detail: studentDetail({ id: 'st-1', goal: 'strength', level: 'beginner' }) });
    await user.click(await findGenerateButton());
    await screen.findByText('Split de empuje, piernas y core para 3 días.');
    unmount();
    renderRoute('/pt/rutinas/ia');
    expect(await screen.findByText('Split de empuje, piernas y core para 3 días.')).toBeVisible();
    expect(screen.getAllByRole('region')).toHaveLength(3);
    expect(postsTo(fetchMock, '/trainer-ai/generate-routine')).toHaveLength(1);
  });

  it('un bloque ya asignado muestra "Asignado" con el link a la ficha en vez de "Editar y asignar"', async () => {
    storeProposal({ assigned: { 1: { studentId: 'st-9', studentName: 'Ana Paz' } } });
    renderAi('/pt/rutinas/ia', {});
    const legs = within(await screen.findByRole('region', { name: 'Piernas' }));
    expect(legs.getByText('Asignado')).toBeVisible();
    expect(legs.getByRole('link', { name: 'Ver la rutina en la ficha de Ana Paz' })).toHaveAttribute('href', '/pt/alumnos/st-9');
    expect(legs.queryByRole('link', { name: 'Editar y asignar' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Empuje' })).getByRole('link', { name: 'Editar y asignar' })).toBeVisible();
  });
});

describe('AiRoutinePage: guardar como plantillas', () => {
  it('con un bloque guarda con el nombre y muestra "Guardadas"', async () => {
    const save = vi.fn(saved([{ id: 't-1', name: 'Fuerza Ana', days: ['monday'] }]));
    const { fetchMock, user } = await openSave({ save }, SINGLE);
    expect(dialog().queryByText(/una por bloque/)).not.toBeInTheDocument();
    await user.type(dialog().getByLabelText('Nombre'), 'Fuerza Ana');
    await user.dblClick(dialog().getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Guardadas')).toBeVisible();
    expect(postsTo(fetchMock, SAVE)).toHaveLength(1);
    expect(bodyOf(postsTo(fetchMock, SAVE)[0][1])).toEqual({ generation_id: 'g-single', template_name: 'Fuerza Ana' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar como plantillas' })).not.toBeInTheDocument();
    expect(screen.getByText(/Usar plantilla/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ir al editor' })).toHaveAttribute('href', '/pt/rutinas/nueva');
    expect(storedProposal().saved).toBeTruthy();
  });

  it('con varios bloques aclara que se crea una por bloque', async () => {
    const save = vi.fn(saved([{ id: 't-1', name: 'Split · Empuje', days: ['monday'] }]));
    const { user } = await openSave({ save });
    expect(dialog().getByText('Se crea una plantilla por bloque: "Nombre · Bloque".')).toBeVisible();
    await user.type(dialog().getByLabelText('Nombre'), 'Split');
    await user.click(dialog().getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Guardadas')).toBeVisible();
  });

  it('pide un nombre de 1 a 120 caracteres', async () => {
    const save = vi.fn(saved([]));
    const { user } = await openSave({ save });
    await user.click(dialog().getByRole('button', { name: 'Guardar' }));
    expect(dialog().getByText('Poné un nombre de hasta 120 caracteres')).toBeVisible();
    expect(save).not.toHaveBeenCalled();
  });

  it('un 409 se muestra como ya guardada', async () => {
    const save = vi.fn(() => errorResponse(409, 'GENERATION_ALREADY_SAVED', 'Esta propuesta ya se guardó como plantilla'));
    const { user } = await openSave({ save });
    await user.type(dialog().getByLabelText('Nombre'), 'Split');
    await user.click(dialog().getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ya estaba guardada')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Guardar como plantillas' })).not.toBeInTheDocument();
  });

  it('otro error se muestra en el diálogo y deja reintentar', async () => {
    const save = vi.fn(() => errorResponse(400, 'TEMPLATE_EXERCISES_UNAVAILABLE', 'Un ejercicio ya no existe'));
    const { user } = await openSave({ save });
    await user.type(dialog().getByLabelText('Nombre'), 'Split');
    await user.click(dialog().getByRole('button', { name: 'Guardar' }));
    expect(await dialog().findByText('Un ejercicio ya no existe')).toBeVisible();
    expect(dialog().getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });
});
