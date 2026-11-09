import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSubmitLock } from '@/hooks/shared/useSubmitLock';

// Una tarea que queda en vuelo hasta que el test la resuelve o la rechaza.
function pending() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { fn: vi.fn(() => promise), resolve, reject };
}

describe('useSubmitLock', () => {
  it('corre la función en el acto y devuelve lo que ella resuelve', async () => {
    const { result } = renderHook(() => useSubmitLock());
    const fn = vi.fn(async () => 'ok');
    const run = result.current(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    await expect(run).resolves.toBe('ok');
  });

  it('mientras una corrida está en vuelo, otra no arranca (sin esperar a un render)', async () => {
    const { result } = renderHook(() => useSubmitLock());
    const first = pending();
    const second = vi.fn();
    const run = result.current(first.fn);
    await expect(result.current(second)).resolves.toBeUndefined();
    expect(second).not.toHaveBeenCalled();
    first.resolve();
    await run;
  });

  it('se libera al terminar bien, y también cuando la función falla', async () => {
    const { result } = renderHook(() => useSubmitLock());
    await result.current(async () => {});
    const failing = pending();
    const run = result.current(failing.fn);
    failing.reject(new Error('red'));
    await expect(run).rejects.toThrow('red');
    const next = vi.fn(async () => 'otra vez');
    await expect(result.current(next)).resolves.toBe('otra vez');
  });

  it('se libera aunque la función tire de forma sincrónica', async () => {
    const { result } = renderHook(() => useSubmitLock());
    await expect(result.current(() => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(result.current(() => 1)).toBeInstanceOf(Promise);
  });

  it('devuelve la misma función en cada render', () => {
    const { result, rerender } = renderHook(() => useSubmitLock());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
