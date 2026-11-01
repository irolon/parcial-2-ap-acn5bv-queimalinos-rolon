import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToday } from '@/hooks/shared/useToday';

// Argentina es UTC-3: las 23:59 del domingo 1/11 son las 02:59 UTC del lunes 2/11.
const SUNDAY_2359 = new Date('2026-11-02T02:59:00Z');
const MINUTE = 60_000;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(SUNDAY_2359);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const tick = (ms) => act(() => vi.advanceTimersByTime(ms));

describe('useToday', () => {
  it('devuelve un instante de hoy', () => {
    const { result } = renderHook(() => useToday());
    expect(result.current).toEqual(SUNDAY_2359);
  });

  it('cambia al pasar la medianoche de Argentina, no la de UTC', () => {
    const { result } = renderHook(() => useToday());
    const sunday = result.current;
    tick(MINUTE / 2); // 23:59:30
    expect(result.current).toBe(sunday);
    tick(MINUTE); // el reloj revisó a las 00:00 del lunes
    expect(result.current).not.toBe(sunday);
    expect(result.current.toISOString()).toBe('2026-11-02T03:00:00.000Z');
  });

  it('mientras sea el mismo día argentino sigue devolviendo el mismo objeto', () => {
    vi.setSystemTime(new Date('2026-11-01T13:00:00Z'));
    const { result } = renderHook(() => useToday());
    const first = result.current;
    tick(5 * MINUTE);
    tick(60 * MINUTE);
    expect(result.current).toBe(first);
  });

  it('al volver a la pestaña revisa el día sin esperar al reloj', () => {
    const { result } = renderHook(() => useToday());
    const sunday = result.current;
    vi.setSystemTime(new Date('2026-11-02T13:00:00Z')); // la pestaña estuvo dormida toda la noche
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current).not.toBe(sunday);
    expect(result.current.toISOString()).toBe('2026-11-02T13:00:00.000Z');
  });

  it('al enfocar la ventana también lo revisa (una ventana visible pero sin foco no dispara visibilitychange)', () => {
    const { result } = renderHook(() => useToday());
    const sunday = result.current;
    vi.setSystemTime(new Date('2026-11-02T13:00:00Z'));
    act(() => window.dispatchEvent(new Event('focus')));
    expect(result.current).not.toBe(sunday);
  });

  it('al desmontar deja de escuchar', () => {
    const documentOff = vi.spyOn(document, 'removeEventListener');
    const windowOff = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useToday());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(documentOff).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(windowOff).toHaveBeenCalledWith('focus', expect.any(Function));
  });
});
