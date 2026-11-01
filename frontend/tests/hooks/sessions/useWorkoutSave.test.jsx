import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWorkoutSave } from '@/hooks/sessions/useWorkoutSave';

const saved = { ok: true, state: { id: 'session-1' }, failed: [], unlocked: [] };
const failed = (error) => ({ ok: false, state: { id: 'session-1' }, failed: [], unlocked: [], error });
const OFFLINE = { status: 0, code: 'NETWORK_ERROR', message: 'No hay conexión con el servidor', retryable: true };

/** Una promesa que se resuelve a mano (un pedido en vuelo). */
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

describe('useWorkoutSave', () => {
  it('arranca sin guardar nada', () => {
    const upload = vi.fn();
    const { result } = renderHook(() => useWorkoutSave(upload));
    expect(result.current).toMatchObject({ status: 'idle', result: null, error: null });
    expect(upload).not.toHaveBeenCalled();
  });

  it('run() guarda: pasa por saving y termina en saved con el resultado completo', async () => {
    const pending = deferred();
    const { result } = renderHook(() => useWorkoutSave(() => pending.promise));
    let run;
    act(() => { run = result.current.run(); });
    expect(result.current.status).toBe('saving');
    await act(async () => { pending.resolve(saved); await run; });
    expect(result.current).toMatchObject({ status: 'saved', result: saved, error: null });
  });

  it('si falla queda en failed con el error, y run() otra vez lo vuelve a intentar', async () => {
    const upload = vi.fn().mockResolvedValueOnce(failed(OFFLINE)).mockResolvedValueOnce(saved);
    const { result } = renderHook(() => useWorkoutSave(upload));
    await act(() => result.current.run());
    expect(result.current).toMatchObject({ status: 'failed', error: OFFLINE, result: null });

    await act(() => result.current.run());
    expect(upload).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ status: 'saved', error: null });
  });

  it('un error permanente se informa tal cual, con retryable false', async () => {
    const permanent = { status: 403, code: 'FORBIDDEN', message: 'Solo los alumnos guardan sesiones', retryable: false };
    const { result } = renderHook(() => useWorkoutSave(() => Promise.resolve(failed(permanent))));
    await act(() => result.current.run());
    expect(result.current).toMatchObject({ status: 'failed', error: permanent });
  });

  it('si se descartó la sesión (cancelled) o ya no hay sesión (null) vuelve a idle sin error', async () => {
    const upload = vi.fn()
      .mockResolvedValueOnce({ ok: false, cancelled: true, state: {}, error: { code: 'CANCELLED', retryable: false } })
      .mockResolvedValueOnce(null);
    const { result } = renderHook(() => useWorkoutSave(upload));
    await act(() => result.current.run());
    expect(result.current).toMatchObject({ status: 'idle', error: null });
    await act(() => result.current.run());
    expect(result.current).toMatchObject({ status: 'idle', error: null });
  });

  it('si upload() tira una excepción lo trata como un error que se puede reintentar', async () => {
    const { result } = renderHook(() => useWorkoutSave(() => Promise.reject(new Error('Boom'))));
    await act(() => result.current.run());
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toMatchObject({ message: 'Boom', retryable: true });
  });

  it('un segundo toque mientras guarda no manda otra subida', async () => {
    const pending = deferred();
    const upload = vi.fn(() => pending.promise);
    const { result } = renderHook(() => useWorkoutSave(upload));
    act(() => { result.current.run(); result.current.run(); });
    expect(upload).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve(saved); await pending.promise; });
    expect(result.current.status).toBe('saved');
  });

  it('con resume arranca guardando y sube una sola vez, también en StrictMode', async () => {
    const upload = vi.fn().mockResolvedValue(saved);
    const { result } = renderHook(() => useWorkoutSave(upload, true), { wrapper: StrictMode });
    expect(result.current.status).toBe('saving');
    await act(async () => { await Promise.resolve(); });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saved');
  });

  it('si la página se desmonta mientras guarda, no pasa nada cuando termina', async () => {
    const pending = deferred();
    const { result, unmount } = renderHook(() => useWorkoutSave(() => pending.promise));
    let run;
    act(() => { run = result.current.run(); });
    unmount();
    await act(async () => { pending.resolve(saved); await run; });
    expect(result.current.status).toBe('saving');
  });
});
