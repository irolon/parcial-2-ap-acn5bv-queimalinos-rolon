import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const conv = (id, name, last = null, unread = 0) => ({
  student: { id, name, avatar_url: null },
  last_message: last,
  unread_count: unread,
});
const CONVERSATIONS = [
  conv('s-1', 'Ana Paz', { body: 'Listo!', has_image: false, sender_role: 'student', created_at: '2026-10-30T15:00:00+00:00' }, 3),
  conv('s-2', 'Ángel Díaz', { body: '', has_image: true, sender_role: 'trainer', created_at: '2026-10-20T15:00:00+00:00' }),
  conv('s-3', 'Bruno Sosa'),
];

function stub(extra = {}) {
  return stubFetch(async (url, init) => {
    const path = url.replace('http://api.test/api', '');
    if (extra[path]) return extra[path](init);
    if (path === '/messages/conversations') return jsonResponse(200, { data: CONVERSATIONS });
    if (path === '/messages/broadcast') return jsonResponse(201, { data: { broadcast_id: 'b-1', sent: 2 } });
    if (path.endsWith('/read')) return jsonResponse(200, { data: { updated: 0 } });
    const id = path.split('/')[2];
    const name = CONVERSATIONS.find((c) => c.student.id === id)?.student.name ?? 'Otro';
    return jsonResponse(200, {
      data: [],
      meta: { next_before: null },
      counterpart: { id, name, avatar_url: null },
    });
  });
}

function stubDesktop(matches) {
  vi.stubGlobal('matchMedia', () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }));
}

describe('MessagesPage: lista', () => {
  it('muestra las filas en el orden del servidor con vista previa, "Vos:" y no leídos', async () => {
    stub();
    renderRoute('/pt/mensajes');
    const rows = await screen.findAllByRole('button', { name: /Ana Paz|Ángel Díaz|Bruno Sosa/ });
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Ana Paz'),
      expect.stringContaining('Ángel Díaz'),
      expect.stringContaining('Bruno Sosa'),
    ]);
    expect(within(rows[0]).getByText('Listo!')).toBeInTheDocument();
    expect(within(rows[0]).getByText('3 sin leer')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Vos: 📷 Foto')).toBeInTheDocument();
    expect(screen.getByText('Elegí un alumno para ver la conversación')).toBeInTheDocument();
  });

  it('busca por nombre sin acentos ni mayúsculas', async () => {
    const user = userEvent.setup();
    stub();
    renderRoute('/pt/mensajes');
    await screen.findByRole('button', { name: /Ana Paz/ });
    await user.type(screen.getByRole('searchbox', { name: 'Buscar alumno' }), 'ANGEL');
    expect(screen.queryByRole('button', { name: /Ana Paz/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Ángel Díaz/ })).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('No hay alumnos con ese nombre.')).toBeInTheDocument();
  });

  it('?alumno= abre esa conversación y elegir otra actualiza el param con replace', async () => {
    const user = userEvent.setup();
    const fetchMock = stub();
    const { router } = renderRoute('/pt/mensajes?alumno=s-1');
    expect(await screen.findByRole('heading', { level: 2, name: 'Ana Paz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ana Paz/ })).toHaveAttribute('aria-current', 'true');
    await user.click(screen.getByRole('button', { name: /Bruno Sosa/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Bruno Sosa' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?alumno=s-3');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(calls(fetchMock).some(([u]) => u === '/messages/s-3')).toBe(true);
  });

  it('un id fuera de la lista igual intenta abrirla y muestra el error del 403', async () => {
    stub({ '/messages/ajeno': () => errorResponse(403, 'FORBIDDEN', 'Sin acceso') });
    renderRoute('/pt/mensajes?alumno=ajeno');
    expect(await screen.findByText('No pudimos cargar la conversación.')).toBeInTheDocument();
  });
});

describe('MessagesPage: responsive', () => {
  it('en mobile sin alumno solo se ve la lista', async () => {
    stubDesktop(false);
    stub();
    renderRoute('/pt/mensajes');
    await screen.findByRole('button', { name: /Ana Paz/ });
    expect(screen.queryByRole('region', { name: 'Conversación' })).toBeNull();
    expect(screen.queryByText('Elegí un alumno para ver la conversación')).toBeNull();
  });

  it('en mobile con alumno se ve la conversación con "Volver", que limpia el param', async () => {
    const user = userEvent.setup();
    stubDesktop(false);
    stub();
    const { router } = renderRoute('/pt/mensajes?alumno=s-1');
    expect(await screen.findByRole('heading', { level: 2, name: 'Ana Paz' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Conversaciones' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(router.state.location.search).toBe('');
    expect(await screen.findByRole('button', { name: /Bruno Sosa/ })).toBeInTheDocument();
  });

  it('en escritorio no hay "Volver"', async () => {
    stub();
    renderRoute('/pt/mensajes?alumno=s-1');
    await screen.findByRole('heading', { level: 2, name: 'Ana Paz' });
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
  });
});

describe('MessagesPage: envío masivo', () => {
  async function openDialog(user) {
    await screen.findByRole('button', { name: /Ana Paz/ });
    await user.click(screen.getByRole('button', { name: 'Envío masivo' }));
    return screen.findByRole('dialog', { name: 'Envío masivo' });
  }

  it('muestra el aviso fijo y el botón está deshabilitado sin texto o sin alumnos', async () => {
    const user = userEvent.setup();
    stub();
    renderRoute('/pt/mensajes');
    const dialog = await openDialog(user);
    expect(within(dialog).getByText(/No es un chat grupal: no se ven entre ellos\./)).toBeInTheDocument();
    const send = within(dialog).getByRole('button', { name: 'Enviar a 0 alumnos' });
    expect(send).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: 'Mensaje' }), 'Hola');
    expect(send).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: /Ana Paz/ }));
    expect(within(dialog).getByRole('button', { name: 'Enviar a 1 alumno' })).toBeEnabled();
    await user.clear(within(dialog).getByRole('textbox', { name: 'Mensaje' }));
    expect(within(dialog).getByRole('button', { name: 'Enviar a 1 alumno' })).toBeDisabled();
  });

  it('"Todos" selecciona y deselecciona; envía, avisa "Enviado a N alumnos" y cierra', async () => {
    const user = userEvent.setup();
    const fetchMock = stub();
    renderRoute('/pt/mensajes');
    const dialog = await openDialog(user);
    const all = within(dialog).getByRole('checkbox', { name: 'Todos' });
    await user.click(all);
    expect(within(dialog).getByRole('checkbox', { name: /Bruno Sosa/ })).toBeChecked();
    expect(within(dialog).getByRole('button', { name: 'Enviar a 3 alumnos' })).toBeDisabled();
    await user.click(all);
    expect(within(dialog).getByRole('button', { name: 'Enviar a 0 alumnos' })).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: /Ana Paz/ }));
    await user.click(within(dialog).getByRole('checkbox', { name: /Bruno Sosa/ }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Mensaje' }), '  Mañana no abrimos ');
    await user.click(within(dialog).getByRole('button', { name: 'Enviar a 2 alumnos' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Enviado a 2 alumnos');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const post = calls(fetchMock).find(([u]) => u === '/messages/broadcast');
    expect(bodyOf(post[1])).toEqual({ student_ids: ['s-1', 's-3'], body: 'Mañana no abrimos' });
  });

  it('un error del servidor se muestra y el diálogo sigue abierto', async () => {
    const user = userEvent.setup();
    stub({ '/messages/broadcast': () => errorResponse(403, 'FORBIDDEN', 'Alumno ajeno') });
    renderRoute('/pt/mensajes');
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('checkbox', { name: 'Todos' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Mensaje' }), 'Hola');
    await user.click(within(dialog).getByRole('button', { name: 'Enviar a 3 alumnos' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Alumno ajeno');
  });
});
