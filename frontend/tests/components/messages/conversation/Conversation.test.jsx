import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { configureClient } from '@/api/shared/client';
import Conversation from '@/components/messages/conversation/Conversation';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

const CURSOR = '2026-10-30T14:00:00.123456+00:00';
const counterpart = { id: 's-1', name: 'Tomás Ruiz', avatar_url: null };
const msg = (id, extra) => ({
  id,
  student_id: 's-1',
  sender_role: 'student',
  body: id,
  image_url: null,
  broadcast_id: null,
  read_at: null,
  created_at: '2026-10-31T14:00:00+00:00',
  ...extra,
});

let queryClient;

beforeEach(() => {
  configureClient({ getToken: () => 'access-1' });
  useAuthStore.setState({ user: { id: 't-1', name: 'Laura Pereyra', role: 'trainer' } });
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Backend simulado: `pages` por cursor, y el resto de las rutas según `extra`. */
function stubApi({ first, older, extra = () => null }) {
  return stubFetch(async (url, init) => {
    const custom = extra(url, init);
    if (custom) return custom;
    if (url.endsWith('/read')) return jsonResponse(200, { data: { updated: 1 } });
    if (url.endsWith('/unread-count')) return jsonResponse(200, { data: { count: 0 } });
    const body = url.includes('before=') ? older : first;
    return jsonResponse(200, { data: body.data, meta: { next_before: body.next ?? null }, counterpart });
  });
}

function show(role = 'trainer') {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Conversation studentId="s-1" viewerRole={role} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const readCalls = (fetchMock) => calls(fetchMock).filter(([url]) => url === '/messages/s-1/read');

describe('Conversation', () => {
  it('muestra el nombre del otro, los separadores de día y "Ver ficha" solo al PT', async () => {
    stubApi({ first: { data: [msg('a', { created_at: '2026-01-12T15:00:00+00:00' }), msg('b', { created_at: new Date().toISOString() })] } });
    show('trainer');
    expect(await screen.findByRole('heading', { name: 'Tomás Ruiz' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ficha' })).toHaveAttribute('href', '/pt/alumnos/s-1');
    expect(screen.getByText('12 ene')).toBeInTheDocument();
    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByRole('log', { name: 'Mensajes' })).toHaveAttribute('aria-live', 'polite');
  });

  it('el alumno no ve "Ver ficha"', async () => {
    stubApi({ first: { data: [msg('a', { sender_role: 'trainer' })] } });
    show('student');
    await screen.findByRole('heading', { name: 'Tomás Ruiz' });
    expect(screen.queryByRole('link', { name: 'Ver ficha' })).not.toBeInTheDocument();
  });

  it('"Ver anteriores" aparece solo si hay más páginas y trae la anterior', async () => {
    const fetchMock = stubApi({
      first: { data: [msg('m3'), msg('m4')], next: CURSOR },
      older: { data: [msg('m1'), msg('m2')] },
    });
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Ver anteriores' }));
    await waitFor(() => expect(screen.getByText('m1')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Ver anteriores' })).not.toBeInTheDocument();
    expect(calls(fetchMock).some(([url]) => url.includes('before='))).toBe(true);
  });

  it('sin más páginas no hay "Ver anteriores"', async () => {
    stubApi({ first: { data: [msg('m1')] } });
    show();
    await screen.findByText('m1');
    expect(screen.queryByRole('button', { name: 'Ver anteriores' })).not.toBeInTheDocument();
  });

  it('marca como leído al abrir si hay mensajes del otro sin leer', async () => {
    const fetchMock = stubApi({ first: { data: [msg('a')] } });
    show('trainer');
    await waitFor(() => expect(readCalls(fetchMock)).toHaveLength(1));
  });

  it('no marca leído si lo único sin leer es propio o ya está leído', async () => {
    const fetchMock = stubApi({
      first: { data: [msg('a', { read_at: '2026-10-31T14:01:00+00:00' }), msg('b', { sender_role: 'trainer' })] },
    });
    show('trainer');
    await screen.findByText('b');
    expect(readCalls(fetchMock)).toHaveLength(0);
  });

  it('con la pestaña oculta no marca leído, y lo hace al volver a verse', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const fetchMock = stubApi({ first: { data: [msg('a')] } });
    show('trainer');
    await screen.findByText('a');
    expect(readCalls(fetchMock)).toHaveLength(0);

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(readCalls(fetchMock)).toHaveLength(1));
  });

  it('en la última propia muestra ✓ y, leída, ✓✓', async () => {
    stubApi({
      first: {
        data: [
          msg('a', { sender_role: 'trainer', read_at: '2026-10-31T14:05:00+00:00' }),
          msg('b', { sender_role: 'trainer' }),
        ],
      },
    });
    show('trainer');
    await screen.findByText('b');
    expect(screen.getAllByLabelText(/Enviado|Leído/)).toHaveLength(1);
    expect(screen.getByLabelText('Enviado')).toBeInTheDocument();
  });

  it('enviar con Enter agrega la burbuja al instante y el POST lleva el texto', async () => {
    const sent = msg('srv-1', { sender_role: 'trainer', body: 'Hola Tomás' });
    const fetchMock = stubApi({
      first: { data: [msg('a', { read_at: 'x' })] },
      extra: (url, init) => (url.endsWith('/messages/s-1') && init?.method === 'POST' ? jsonResponse(201, { data: sent }) : null),
    });
    show('trainer');
    await userEvent.type(await screen.findByLabelText('Mensaje'), 'Hola Tomás{Enter}');
    expect(await screen.findByText('Hola Tomás')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Enviando…')).not.toBeInTheDocument());
    const post = calls(fetchMock).find(([url, init]) => url === '/messages/s-1' && init?.method === 'POST');
    expect(post[1].body.get('body')).toBe('Hola Tomás');
    expect(screen.getAllByText('Hola Tomás')).toHaveLength(1);
  });

  it('si el envío falla muestra el error del servidor y permite descartar', async () => {
    stubApi({
      first: { data: [msg('a', { read_at: 'x' })] },
      extra: (url, init) =>
        url.endsWith('/messages/s-1') && init?.method === 'POST' ? errorResponse(413, 'TOO_LARGE', 'La foto es muy pesada') : null,
    });
    show('trainer');
    await userEvent.type(await screen.findByLabelText('Mensaje'), 'Hola{Enter}');
    expect(await screen.findByText(/No se envió · La foto es muy pesada/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(screen.queryByText(/No se envió/)).not.toBeInTheDocument());
  });

  it('tocar una foto abre el diálogo con la foto grande', async () => {
    stubApi({ first: { data: [msg('a', { body: null, image_url: 'https://x/f.jpg', read_at: 'x' })] } });
    show('trainer');
    await userEvent.click(await screen.findByAltText('Foto enviada por Tomás Ruiz'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByAltText('Foto enviada por Tomás Ruiz')).toHaveAttribute('src', 'https://x/f.jpg');
  });

  it('si no carga muestra el error con Reintentar', async () => {
    stubFetch(async () => errorResponse(500, 'SERVER_ERROR', 'Falló'));
    show('trainer');
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la conversación.');
  });
});
