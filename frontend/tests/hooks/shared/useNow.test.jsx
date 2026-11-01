import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNow } from '@/hooks/shared/useNow';
import { T0, at } from '../../helpers/workout/workout';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

const tick = (ms) => act(() => vi.advanceTimersByTime(ms));

describe('useNow', () => {
  it('arranca en el instante actual', () => {
    const { result } = renderHook(() => useNow());
    expect(result.current).toEqual(T0);
  });

  it('se actualiza cada segundo', () => {
    const { result } = renderHook(() => useNow());
    tick(1000);
    expect(result.current).toEqual(at(1));
    tick(3000);
    expect(result.current).toEqual(at(4));
  });

  it('no se actualiza antes de que pase el intervalo', () => {
    const { result } = renderHook(() => useNow());
    const first = result.current;
    tick(900);
    expect(result.current).toBe(first);
  });

  it('acepta otro intervalo', () => {
    const { result } = renderHook(() => useNow(5000));
    tick(4000);
    expect(result.current).toEqual(T0);
    tick(1000);
    expect(result.current).toEqual(at(5));
  });

  it('al volver a la pestaña se pone al día sin esperar al reloj (en segundo plano los timers se frenan)', () => {
    const { result } = renderHook(() => useNow());
    vi.setSystemTime(at(300));
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current).toEqual(at(300));
  });

  it('al desmontar apaga el reloj y deja de escuchar', () => {
    const { unmount } = renderHook(() => useNow());
    expect(vi.getTimerCount()).toBe(1);
    const remove = vi.spyOn(document, 'removeEventListener');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
