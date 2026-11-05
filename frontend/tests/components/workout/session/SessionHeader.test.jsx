import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionHeader from '@/components/workout/session/SessionHeader';
import { T0, at } from '../../../helpers/workout/workout';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(at(22 * 60 + 14));
});
afterEach(() => vi.useRealTimers());

const props = (overrides = {}) => ({
  position: 3,
  total: 6,
  startedAt: T0.toISOString(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
  onFinish: vi.fn(),
  ...overrides,
});

describe('SessionHeader', () => {
  it('dice en qué ejercicio va y cuánto lleva: "EJERCICIO 3 DE 6 · 22:14 TRANSCURRIDO"', () => {
    render(<SessionHeader {...props()} />);
    expect(screen.getByText('EJERCICIO 3 DE 6 · 22:14 TRANSCURRIDO')).toBeInTheDocument();
  });

  it('el tiempo avanza solo, de a un segundo', () => {
    render(<SessionHeader {...props()} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('EJERCICIO 3 DE 6 · 22:15 TRANSCURRIDO')).toBeInTheDocument();
  });

  it('pasada la hora muestra h:mm:ss', () => {
    vi.setSystemTime(at(3600 + 2 * 60 + 3));
    render(<SessionHeader {...props()} />);
    expect(screen.getByText('EJERCICIO 3 DE 6 · 1:02:03 TRANSCURRIDO')).toBeInTheDocument();
  });

  it('tiene Anterior, Siguiente y Terminar, y cada uno avisa', async () => {
    const handlers = props();
    render(<SessionHeader {...handlers} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Terminar' }));
    expect(handlers.onPrev).toHaveBeenCalledTimes(1);
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
    expect(handlers.onFinish).toHaveBeenCalledTimes(1);
  });

  it('en el primer ejercicio no hay Anterior y en el último no hay Siguiente', () => {
    const { rerender } = render(<SessionHeader {...props({ position: 1 })} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
    rerender(<SessionHeader {...props({ position: 6 })} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('al desmontar apaga el reloj', () => {
    const { unmount } = render(<SessionHeader {...props()} />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
