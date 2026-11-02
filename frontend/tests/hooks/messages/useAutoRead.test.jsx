import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { configureClient } from '@/api/shared/client';
import { useAutoRead } from '@/hooks/messages/useAutoRead';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

let queryClient;
const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
const unread = [{ id: 'm-1', sender_role: 'student', read_at: null }];
const readPosts = (fetchMock) => calls(fetchMock).filter(([url]) => url === '/messages/s-1/read');

beforeEach(() => {
  configureClient({ getToken: () => 'access-1' });
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const renderAutoRead = (initialProps) =>
  renderHook(({ messages, at }) => useAutoRead('s-1', 'trainer', messages, at), { wrapper, initialProps });

describe('useAutoRead', () => {
  it('si el POST falla, el siguiente refresco con el mismo no leído reintenta y marca', async () => {
    const fetchMock = stubFetch(
      vi
        .fn()
        .mockResolvedValueOnce(errorResponse(500, 'INTERNAL'))
        .mockResolvedValue(jsonResponse(200, { data: { updated: 1 } })),
    );
    const { rerender } = renderAutoRead({ messages: unread, at: 1 });
    await waitFor(() => expect(readPosts(fetchMock)).toHaveLength(1));
    await waitFor(() => expect(queryClient.getMutationCache().getAll()[0].state.status).toBe('error'));

    rerender({ messages: [...unread], at: 2 }); // el poll trae el mismo último mensaje sin leer
    await waitFor(() => expect(readPosts(fetchMock)).toHaveLength(2));
    await waitFor(() => expect(queryClient.getMutationCache().getAll().at(-1).state.status).toBe('success'));

    rerender({ messages: [...unread], at: 3 }); // ya marcado: no repite
    await new Promise((r) => setTimeout(r, 20));
    expect(readPosts(fetchMock)).toHaveLength(2);
  });

  it('mientras un POST está en vuelo, otro refresco no manda uno simultáneo', async () => {
    let resolve;
    const fetchMock = stubFetch(() => new Promise((r) => (resolve = r)));
    const { rerender } = renderAutoRead({ messages: unread, at: 1 });
    await waitFor(() => expect(readPosts(fetchMock)).toHaveLength(1));

    rerender({ messages: [...unread, { id: 'm-2', sender_role: 'student', read_at: null }], at: 2 });
    await new Promise((r) => setTimeout(r, 20));
    expect(readPosts(fetchMock)).toHaveLength(1);
    resolve(jsonResponse(200, { data: { updated: 2 } }));
  });

  it('sin no leídos del otro no llama', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: { updated: 0 } }));
    renderAutoRead({ messages: [{ id: 'm-1', sender_role: 'trainer', read_at: null }], at: 1 });
    await new Promise((r) => setTimeout(r, 20));
    expect(readPosts(fetchMock)).toHaveLength(0);
  });
});
