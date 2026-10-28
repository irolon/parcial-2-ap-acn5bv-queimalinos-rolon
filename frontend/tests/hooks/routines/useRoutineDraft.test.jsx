import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useRoutineDraft } from '@/hooks/routines/useRoutineDraft';
import { DRAFT_KEY } from '@/utils/routines/draft';
import { EMPTY_ROUTINE, updateHeader } from '@/utils/routines/editorState';
import { stateWith } from '../../helpers/routines/fixtures';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup(); // desmonta antes de limpiar: al desmontar el hook vuelca lo pendiente
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe('useRoutineDraft', () => {
  it('escribe una sola vez tras 1 s sin cambios', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { result, rerender } = renderHook(({ state }) => useRoutineDraft('t-1', state), {
      initialProps: { state: stateWith() },
    });
    rerender({ state: updateHeader(stateWith(), 'name', 'Fuerza 2') });
    act(() => { vi.advanceTimersByTime(999); });
    expect(setItem).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY('t-1'))).name).toBe('Fuerza 2');
    expect(result.current.savedAt).toBeInstanceOf(Date);
  });

  it('un estado vaciado a mano borra el borrador', () => {
    localStorage.setItem(DRAFT_KEY('t-1'), 'viejo');
    const { result } = renderHook(() => useRoutineDraft('t-1', { ...EMPTY_ROUTINE, name: ' ' }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(localStorage.getItem(DRAFT_KEY('t-1'))).toBeNull();
    expect(result.current.savedAt).toBeNull();
  });

  it('con enabled false no borra un borrador existente', () => {
    localStorage.setItem(DRAFT_KEY('t-1'), 'viejo');
    renderHook(() => useRoutineDraft('t-1', EMPTY_ROUTINE, { enabled: false }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(localStorage.getItem(DRAFT_KEY('t-1'))).toBe('viejo');
  });

  it('al pasar a enabled true escribe tras el delay', () => {
    const { rerender } = renderHook(({ enabled }) => useRoutineDraft('t-1', stateWith(), { enabled }), {
      initialProps: { enabled: false },
    });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(localStorage.getItem(DRAFT_KEY('t-1'))).toBeNull();
    rerender({ enabled: true });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY('t-1'))).name).toBe('Fuerza');
  });

  it('al desmontar antes del delay escribe el último cambio', () => {
    const { unmount } = renderHook(() => useRoutineDraft('t-1', stateWith()));
    act(() => { vi.advanceTimersByTime(400); });
    expect(localStorage.getItem(DRAFT_KEY('t-1'))).toBeNull();
    unmount();
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY('t-1'))).name).toBe('Fuerza');
  });

  it('al desmontar con el estado vacío borra el borrador', () => {
    localStorage.setItem(DRAFT_KEY('t-1'), 'viejo');
    const { unmount } = renderHook(() => useRoutineDraft('t-1', EMPTY_ROUTINE));
    unmount();
    expect(localStorage.getItem(DRAFT_KEY('t-1'))).toBeNull();
  });

  it('en beforeunload escribe lo pendiente', () => {
    renderHook(() => useRoutineDraft('t-1', stateWith()));
    window.dispatchEvent(new Event('beforeunload'));
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY('t-1'))).name).toBe('Fuerza');
  });

  it('un cambio de estado no escribe el anterior: solo se vuelca al desmontar', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { rerender, unmount } = renderHook(({ state }) => useRoutineDraft('t-1', state), {
      initialProps: { state: stateWith() },
    });
    rerender({ state: updateHeader(stateWith(), 'name', 'Nuevo') });
    expect(setItem).not.toHaveBeenCalled();
    unmount();
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY('t-1'))).name).toBe('Nuevo');
  });

  it('con enabled false no vuelca nada al desmontar', () => {
    const { unmount } = renderHook(() => useRoutineDraft('t-1', stateWith(), { enabled: false }));
    unmount();
    expect(localStorage.getItem(DRAFT_KEY('t-1'))).toBeNull();
  });

  it('después de escribir no vuelve a escribir al desmontar', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const state = stateWith();
    const { unmount } = renderHook(() => useRoutineDraft('t-1', state));
    act(() => { vi.advanceTimersByTime(1000); });
    unmount();
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it('`cancel` descarta lo pendiente: ni el timer ni el desmontaje escriben', () => {
    const { result, unmount } = renderHook(() => useRoutineDraft('t-1', stateWith()));
    act(() => { result.current.cancel(); });
    act(() => { vi.advanceTimersByTime(2000); });
    unmount();
    expect(localStorage.getItem(DRAFT_KEY('t-1'))).toBeNull();
  });

  it('no escribe un estado vacío', () => {
    const { result } = renderHook(() => useRoutineDraft('t-1', EMPTY_ROUTINE));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(localStorage.getItem(DRAFT_KEY('t-1'))).toBeNull();
    expect(result.current.savedAt).toBeNull();
  });
});
