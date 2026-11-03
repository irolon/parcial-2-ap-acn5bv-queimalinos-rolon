import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { configureClient } from '@/api/shared/client';
import { unreadKey } from '@/hooks/messages/messageKeys';
import UnreadBadge from '@/components/messages/UnreadBadge';
import { jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => configureClient({ getToken: () => 'access-1' }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function mountWith(count) {
  stubFetch(async () => jsonResponse(500), { unread: count });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <UnreadBadge />
    </QueryClientProvider>,
  );
  return client;
}

describe('UnreadBadge', () => {
  it('con no leídos muestra el número', async () => {
    mountWith(3);
    expect(await screen.findByText('3 sin leer')).toHaveClass('sr-only');
    expect(screen.getByText('3')).toHaveAttribute('aria-hidden', 'true');
  });

  it('de 10 en adelante muestra 9+', async () => {
    mountWith(12);
    expect(await screen.findByText('9+')).toBeInTheDocument();
  });

  it('con 0 no se muestra', async () => {
    const client = mountWith(0);
    await waitFor(() => expect(client.getQueryState(unreadKey)?.status).toBe('success'));
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByText(/sin leer/)).not.toBeInTheDocument();
  });
});
