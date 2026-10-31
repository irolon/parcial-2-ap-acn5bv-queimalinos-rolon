import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { configureClient } from '@/api/shared/client';
import { useBroadcast } from '@/hooks/messages/useBroadcast';
import { useConversations } from '@/hooks/messages/useConversations';
import { useMarkRead } from '@/hooks/messages/useMarkRead';
import { useMessages } from '@/hooks/messages/useMessages';
import { useUnreadCount } from '@/hooks/messages/useUnreadCount';
import { conversationsKey, messagesKey, unreadKey } from '@/hooks/messages/messageKeys';
import { calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

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

function observerOptions(key) {
  return queryClient.getQueryCache().find({ queryKey: key }).observers[0].options;
}

describe('polling', () => {
  it('cada hook usa su intervalo y no hace polling en segundo plano', async () => {
    stubFetch(async (url) =>
      jsonResponse(200, {
        data: url.endsWith('/unread-count') ? { count: 4 } : [],
        meta: { next_before: null },
        counterpart: null,
      }),
    );
    const { result } = renderHook(
      () => ({ thread: useMessages('s-1'), list: useConversations(), unread: useUnreadCount() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.unread.data).toBe(4));
    expect(observerOptions(messagesKey('s-1'))).toMatchObject({ refetchInterval: 4000, refetchIntervalInBackground: false });
    expect(observerOptions(conversationsKey)).toMatchObject({ refetchInterval: 15000, refetchIntervalInBackground: false });
    expect(observerOptions(unreadKey)).toMatchObject({ refetchInterval: 15000, refetchIntervalInBackground: false });
  });
});

describe('mutaciones', () => {
  it('useMarkRead hace POST /read e invalida el badge y la lista', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: { updated: 1 } }));
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useMarkRead('s-1'), { wrapper });
    await act(() => result.current.mutateAsync());
    expect(calls(fetchMock)[0][0]).toBe('/messages/s-1/read');
    expect(spy).toHaveBeenCalledWith({ queryKey: unreadKey });
    expect(spy).toHaveBeenCalledWith({ queryKey: conversationsKey });
  });

  it('useBroadcast manda student_ids y resuelve { broadcast_id, sent }', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(201, { data: { broadcast_id: 'b-1', sent: 2 } }));
    const { result } = renderHook(() => useBroadcast(), { wrapper });
    let res;
    await act(async () => {
      res = await result.current.mutateAsync({ studentIds: ['a', 'b'], body: 'Hola' });
    });
    expect(res).toEqual({ broadcast_id: 'b-1', sent: 2 });
    expect(JSON.parse(calls(fetchMock)[0][1].body)).toEqual({ student_ids: ['a', 'b'], body: 'Hola' });
  });
});
