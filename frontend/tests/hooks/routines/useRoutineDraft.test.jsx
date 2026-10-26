import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRoutineDraft } from '@/hooks/routines/useRoutineDraft';
import { DRAFT_KEY } from '@/utils/routines/draft';
import { EMPTY_ROUTINE, updateHeader } from '@/utils/routines/editorState';
import { stateWith } from '../../helpers/routines/fixtures';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
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
    setItem.mockRestore();
  });

  it('no escribe un estado vacío', () => {
    const { result } = renderHook(() => useRoutineDraft('t-1', EMPTY_ROUTINE));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(localStorage.getItem(DRAFT_KEY('t-1'))).toBeNull();
    expect(result.current.savedAt).toBeNull();
  });
});
