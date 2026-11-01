import { beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { configureClient } from '@/api/shared/client';
import Conversation from '@/components/messages/conversation/Conversation';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { calls, jsonResponse, stubFetch } from '../shared/fetchMock';

export const counterpart = { id: 's-1', name: 'Tomás Ruiz', avatar_url: null };
export const msg = (id, extra) => ({
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

export const ctx = { queryClient: null };

/** beforeEach/afterEach comunes de los tests de la conversación: sesión PT, QueryClient limpio y pestaña visible. */
export function setupConversation() {
  beforeEach(() => {
    configureClient({ getToken: () => 'access-1' });
    useAuthStore.setState({ user: { id: 't-1', name: 'Laura Pereyra', role: 'trainer' } });
    ctx.queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
}

/** Backend simulado: `pages` por cursor, y el resto de las rutas según `extra`. */
export function stubApi({ first, older, extra = () => null }) {
  return stubFetch(async (url, init) => {
    const custom = extra(url, init);
    if (custom) return custom;
    if (url.endsWith('/read')) return jsonResponse(200, { data: { updated: 1 } });
    const body = url.includes('before=') ? older : first;
    return jsonResponse(200, { data: body.data, meta: { next_before: body.next ?? null }, counterpart });
  });
}

export function show(role = 'trainer') {
  return render(
    <QueryClientProvider client={ctx.queryClient}>
      <MemoryRouter>
        <Conversation studentId="s-1" viewerRole={role} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
export const readCalls = (fetchMock) => calls(fetchMock).filter(([url]) => url === '/messages/s-1/read');
