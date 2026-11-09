import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { PREFERENCES_KEY, useNotificationPrefs } from '@/hooks/notifications/useNotificationPrefs';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

const PREFS = { message: true, comment: true, appointment: true, pr: true, achievement: true, updated_at: null };

function renderPrefs(options) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, ...renderHook(() => useNotificationPrefs(options), { wrapper }) };
}

beforeEach(() => {
  configureClient({ getToken: () => 'access-1' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useNotificationPrefs', () => {
  it('la caché es ["notifications", "preferences"]', () => {
    expect(PREFERENCES_KEY).toEqual(['notifications', 'preferences']);
  });

  it('carga GET /notifications/preferences', async () => {
    stubFetch(async () => jsonResponse(200, { data: PREFS }));
    const { result } = renderPrefs();
    await waitFor(() => expect(result.current.query.data).toEqual(PREFS));
  });

  it('con enabled: false no pide nada', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: PREFS }));
    const { result } = renderPrefs({ enabled: false });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.query.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('save manda PUT con los cinco y deja la respuesta en la caché', async () => {
    const saved = { ...PREFS, comment: false, updated_at: '2026-11-09T15:00:00.000Z' };
    const fetchMock = stubFetch(async (url, init) => jsonResponse(200, { data: init.method === 'PUT' ? saved : PREFS }));
    const { result, queryClient } = renderPrefs();
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    await act(() => result.current.save({ ...PREFS, comment: false }));
    const put = calls(fetchMock).find(([, init]) => init.method === 'PUT');
    expect(put[0]).toBe('/notifications/preferences');
    expect(bodyOf(put[1])).toEqual({ message: true, comment: false, appointment: true, pr: true, achievement: true });
    expect(queryClient.getQueryData(PREFERENCES_KEY)).toEqual(saved);
    await waitFor(() => expect(result.current.query.data).toEqual(saved));
  });

  it('save tira el ApiError si el PUT falla y no toca la caché', async () => {
    stubFetch(async (url, init) =>
      init.method === 'PUT' ? errorResponse(500, 'INTERNAL') : jsonResponse(200, { data: PREFS }),
    );
    const { result, queryClient } = renderPrefs();
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    await act(async () => {
      await expect(result.current.save({ ...PREFS, comment: false })).rejects.toMatchObject({ status: 500 });
    });
    expect(queryClient.getQueryData(PREFERENCES_KEY)).toEqual(PREFS);
  });
});
