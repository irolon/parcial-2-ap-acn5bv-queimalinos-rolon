import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { configureClient } from '@/api/shared/client';
import { useMessages } from '@/hooks/messages/useMessages';
import { useSendMessage } from '@/hooks/messages/useSendMessage';
import { messagesKey } from '@/hooks/messages/messageKeys';
import { errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

const msg = (id, image_url) => ({
  id,
  student_id: 's-1',
  sender_role: 'student',
  body: id,
  image_url,
  broadcast_id: null,
  read_at: null,
  created_at: '2026-10-31T14:00:00+00:00',
});
const page = (data) => ({ data, meta: { next_before: null }, counterpart: { id: 's-1' } });

let queryClient;
const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

beforeEach(() => {
  configureClient({ getToken: () => 'access-1' });
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('image_url estable', () => {
  it('conserva la URL por id entre polls y la renueva pasados 45 min', async () => {
    let n = 0;
    stubFetch(async () => {
      n += 1;
      return jsonResponse(200, page([msg('m1', `https://img/m1?token=${n}`), msg('m2', null)]));
    });
    const start = Date.now();
    const now = vi.spyOn(Date, 'now').mockReturnValue(start);
    const { result } = renderHook(() => useMessages('s-1'), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[0].image_url).toBe('https://img/m1?token=1');

    await act(() => queryClient.invalidateQueries({ queryKey: messagesKey('s-1') }));
    await waitFor(() => expect(n).toBe(2));
    expect(result.current.messages[0].image_url).toBe('https://img/m1?token=1');

    now.mockReturnValue(start + 46 * 60 * 1000);
    await act(() => queryClient.invalidateQueries({ queryKey: messagesKey('s-1') }));
    await waitFor(() => expect(result.current.messages[0].image_url).toBe('https://img/m1?token=3'));
  });
});

describe('envío', () => {
  it('retry sobre un temporal que ya se está enviando no manda otra vez', async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    let posts = 0;
    const fetchMock = stubFetch(async (url, init) => {
      if (init.method !== 'POST') return jsonResponse(200, page([]));
      posts += 1;
      await gate;
      return posts === 1 ? errorResponse(500, 'X') : jsonResponse(201, { data: msg('srv', null) });
    });
    const { result } = renderHook(() => ({ thread: useMessages('s-1'), sender: useSendMessage('s-1') }), { wrapper });
    await waitFor(() => expect(result.current.thread.isSuccess).toBe(true));

    let sent;
    act(() => {
      sent = result.current.sender.send({ body: 'hola' });
    });
    await waitFor(() => expect(result.current.thread.messages).toHaveLength(1));
    const [tmp] = result.current.thread.messages;
    await act(async () => {
      expect(await result.current.sender.retry(tmp)).toBeNull();
      expect(await result.current.sender.retry(tmp)).toBeNull();
    });
    release();
    await act(() => sent);
    expect(posts).toBe(1);
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(1);
  });

  it('cancela los refetch en vuelo antes de insertar el mensaje confirmado', async () => {
    stubFetch(async (url, init) =>
      init.method === 'POST' ? jsonResponse(201, { data: msg('srv', null) }) : jsonResponse(200, page([])),
    );
    const cancel = vi.spyOn(QueryClient.prototype, 'cancelQueries');
    const { result } = renderHook(() => ({ thread: useMessages('s-1'), sender: useSendMessage('s-1') }), { wrapper });
    await waitFor(() => expect(result.current.thread.isSuccess).toBe(true));
    await act(() => result.current.sender.send({ body: 'hola' }));
    expect(cancel).toHaveBeenCalledWith({ queryKey: messagesKey('s-1') });
    await waitFor(() => expect(result.current.thread.messages.map((m) => m.id)).toEqual(['srv']));
  });
});
