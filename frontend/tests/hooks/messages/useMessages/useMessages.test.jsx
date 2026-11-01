import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { configureClient } from '@/api/shared/client';
import { useMessages } from '@/hooks/messages/useMessages';
import { useSendMessage } from '@/hooks/messages/useSendMessage';
import { messagesKey } from '@/hooks/messages/messageKeys';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

const CURSOR = '2026-10-31T14:00:00.123456+00:00';
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
const counterpart = { id: 's-1', name: 'Juan', avatar_url: null };

let queryClient;
const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

beforeEach(() => {
  configureClient({ getToken: () => 'access-1' });
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useMessages', () => {
  it('aplana las páginas en orden cronológico y pide la anterior con next_before tal cual', async () => {
    const fetchMock = stubFetch(async (url) =>
      url.includes('before=')
        ? jsonResponse(200, { data: [msg('m1'), msg('m2')], meta: { next_before: null }, counterpart })
        : jsonResponse(200, { data: [msg('m3'), msg('m4')], meta: { next_before: CURSOR }, counterpart }),
    );
    const { result } = renderHook(() => useMessages('s-1'), { wrapper });
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['m3', 'm4']));
    expect(result.current.hasMore).toBe(true);
    expect(result.current.counterpart).toEqual(counterpart);

    await act(() => result.current.fetchOlder());
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4']));
    expect(result.current.hasMore).toBe(false);
    expect(calls(fetchMock)[1][0]).toBe('/messages/s-1?before=2026-10-31T14%3A00%3A00.123456%2B00%3A00');
  });

  it('el polling no pisa el optimista y el confirmado no se duplica con el refetch', async () => {
    const confirmed = msg('srv-1', { sender_role: 'trainer', body: 'Hola' });
    let list = [msg('m1')];
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    stubFetch(async (url, init) => {
      if (init.method === 'POST') {
        await gate;
        return jsonResponse(201, { data: confirmed });
      }
      return jsonResponse(200, { data: list, meta: { next_before: null }, counterpart });
    });
    const { result } = renderHook(() => ({ thread: useMessages('s-1'), sender: useSendMessage('s-1') }), { wrapper });
    await waitFor(() => expect(result.current.thread.messages).toHaveLength(1));

    let sent;
    act(() => {
      sent = result.current.sender.send({ body: 'Hola' });
    });
    await waitFor(() => expect(result.current.thread.messages.map((m) => m.status)).toEqual([undefined, 'sending']));
    expect(result.current.thread.messages[1].id).toMatch(/^tmp-/);

    release();
    await act(() => sent);
    await waitFor(() => expect(result.current.thread.messages.map((m) => m.id)).toEqual(['m1', 'srv-1']));

    // El refetch del polling ya trae el mensaje del servidor: sigue habiendo uno solo.
    list = [msg('m1'), confirmed];
    await act(() => queryClient.invalidateQueries({ queryKey: messagesKey('s-1') }));
    await waitFor(() => expect(result.current.thread.messages.map((m) => m.id)).toEqual(['m1', 'srv-1']));
  });

  it('un envío fallido queda "failed" con el error del servidor, y retry lo reemplaza al confirmar', async () => {
    const confirmed = msg('srv-2', { sender_role: 'trainer', body: 'Foto' });
    let fail = true;
    stubFetch(async (url, init) => {
      if (init.method === 'POST') {
        return fail ? errorResponse(413, 'IMAGE_TOO_LARGE', 'La foto supera 5 MB') : jsonResponse(201, { data: confirmed });
      }
      return jsonResponse(200, { data: [], meta: { next_before: null }, counterpart });
    });
    const { result } = renderHook(() => ({ thread: useMessages('s-1'), sender: useSendMessage('s-1') }), { wrapper });
    await waitFor(() => expect(result.current.thread.isSuccess).toBe(true));

    await act(async () => expect(await result.current.sender.send({ body: 'Foto' })).toBeNull());
    await waitFor(() => expect(result.current.thread.messages).toHaveLength(1));
    const [failed] = result.current.thread.messages;
    expect(failed).toMatchObject({ status: 'failed', error: 'La foto supera 5 MB' });

    fail = false;
    await act(() => result.current.sender.retry(failed));
    await waitFor(() => expect(result.current.thread.messages.map((m) => m.id)).toEqual(['srv-2']));
  });

  it('discard quita el temporal fallido', async () => {
    stubFetch(async (url, init) =>
      init.method === 'POST'
        ? errorResponse(500, 'INTERNAL')
        : jsonResponse(200, { data: [], meta: { next_before: null }, counterpart }),
    );
    const { result } = renderHook(() => ({ thread: useMessages('s-1'), sender: useSendMessage('s-1') }), { wrapper });
    await waitFor(() => expect(result.current.thread.isSuccess).toBe(true));
    await act(() => result.current.sender.send({ body: 'x' }));
    await waitFor(() => expect(result.current.thread.messages).toHaveLength(1));
    act(() => result.current.sender.discard(result.current.thread.messages[0]));
    await waitFor(() => expect(result.current.thread.messages).toEqual([]));
  });
});
