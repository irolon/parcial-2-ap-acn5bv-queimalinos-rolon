import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { retryDelay, useSessionRetry } from '@/hooks/auth/useSessionRetry';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { USER, resetAuthStore } from '../../helpers/auth/authStore';

const OFFLINE = { user: USER, token: null, refreshToken: 'refresh-1', status: 'offline' };
let fetchMock;
let respond;
const refreshes = () => calls(fetchMock).filter(([path]) => path === '/auth/refresh').length;
const advance = (seconds) => act(() => vi.advanceTimersByTimeAsync(seconds * 1000));

beforeEach(() => {
  vi.useFakeTimers();
  resetAuthStore();
  useAuthStore.setState(OFFLINE);
  respond = async () => errorResponse(502, 'HTTP_ERROR');
  fetchMock = stubFetch((...args) => respond(...args));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('retryDelay', () => {
  it('espera 2, 4, 8 y 16 s y después cada 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 20].map(retryDelay)).toEqual([2, 4, 8, 16, 30, 30, 30]);
  });
});

describe('useSessionRetry', () => {
  it('reintenta a los 2 s, después a los 4 s y a los 8 s, con la cuenta atrás', async () => {
    const { result } = renderHook(() => useSessionRetry());
    expect(result.current.secondsLeft).toBe(2);
    await advance(1);
    expect(result.current.secondsLeft).toBe(1);
    expect(refreshes()).toBe(0);
    await advance(1);
    expect(refreshes()).toBe(1);
    expect(result.current.secondsLeft).toBe(4);
    await advance(3);
    expect(refreshes()).toBe(1);
    await advance(1);
    expect(refreshes()).toBe(2);
    await advance(8);
    expect(refreshes()).toBe(3);
    expect(useAuthStore.getState().status).toBe('offline');
  });

  it('el evento online reintenta enseguida', async () => {
    renderHook(() => useSessionRetry());
    await act(async () => window.dispatchEvent(new Event('online')));
    expect(refreshes()).toBe(1);
  });

  it('retryNow reintenta enseguida y marca retrying mientras espera', async () => {
    let answer;
    respond = () => new Promise((resolve) => (answer = resolve));
    const { result } = renderHook(() => useSessionRetry());
    let pending;
    act(() => {
      pending = result.current.retryNow();
    });
    expect(result.current.retrying).toBe(true);
    await act(async () => {
      answer(errorResponse(502, 'HTTP_ERROR'));
      await pending;
    });
    expect(result.current.retrying).toBe(false);
    expect(refreshes()).toBe(1);
  });

  it('cuando el servidor responde pasa a authenticated y no pide más', async () => {
    respond = async () => jsonResponse(200, { token: 'access-9', expires_in: '1h' });
    renderHook(() => useSessionRetry());
    await advance(2);
    expect(useAuthStore.getState()).toMatchObject({ token: 'access-9', status: 'authenticated' });
    await advance(60);
    expect(refreshes()).toBe(1);
  });

  it('al salir de offline deja de reintentar', async () => {
    renderHook(() => useSessionRetry());
    act(() => useAuthStore.setState({ ...OFFLINE, status: 'anonymous', user: null, refreshToken: null }));
    await advance(60);
    await act(async () => window.dispatchEvent(new Event('online')));
    expect(refreshes()).toBe(0);
  });

  it('al desmontar limpia el timer y el listener de online', async () => {
    const { unmount } = renderHook(() => useSessionRetry());
    unmount();
    await advance(60);
    await act(async () => window.dispatchEvent(new Event('online')));
    expect(refreshes()).toBe(0);
  });
});
