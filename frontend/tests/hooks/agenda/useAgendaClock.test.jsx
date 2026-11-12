import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAgendaClock } from '@/hooks/agenda/useAgendaClock';
import { NOW, appt } from '../../helpers/agenda/fixtures';

beforeEach(() => vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], now: new Date(NOW) }));
afterEach(() => vi.useRealTimers());

const after = (ms) => new Date(new Date(NOW).getTime() + ms);
const tick = (ms) => act(() => vi.advanceTimersByTime(ms));

describe('useAgendaClock', () => {
  it('arranca en el instante actual', () => {
    const { result } = renderHook(() => useAgendaClock([]));
    expect(result.current).toEqual(new Date(NOW));
  });

  it('sin turnos por empezar se renueva cada minuto', () => {
    const { result } = renderHook(() => useAgendaClock([]));
    tick(59_000);
    expect(result.current).toEqual(new Date(NOW));
    tick(1000);
    expect(result.current).toEqual(after(60_000));
    tick(60_000);
    expect(result.current).toEqual(after(120_000));
  });

  it('se renueva justo cuando empieza el próximo turno, antes del minuto', () => {
    const list = [appt({ scheduled_at: after(20_000).toISOString() })];
    const { result } = renderHook(() => useAgendaClock(list));
    tick(19_999);
    expect(result.current).toEqual(new Date(NOW));
    tick(1);
    expect(result.current).toEqual(after(20_000));
  });

  it('al volver a la pestaña se pone al día sin esperar', () => {
    const { result } = renderHook(() => useAgendaClock([]));
    vi.setSystemTime(after(300_000));
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current).toEqual(after(300_000));
  });

  it('al desmontar apaga el timer', () => {
    const { unmount } = renderHook(() => useAgendaClock([]));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
