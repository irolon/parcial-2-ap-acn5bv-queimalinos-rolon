import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useStickToBottom } from '@/hooks/messages/useStickToBottom';

const fakeEl = (scrollTop) => ({ scrollHeight: 1000, clientHeight: 400, scrollTop });

function setup(el) {
  const hook = renderHook(({ id }) => useStickToBottom(id), { initialProps: { id: 'a' } });
  act(() => hook.result.current.attach(el));
  return hook;
}

describe('useStickToBottom', () => {
  it('si el usuario está a más de 120 px del fondo, un mensaje nuevo no mueve el scroll', () => {
    const el = fakeEl(300); // fondo = 600, distancia 300
    const { result, rerender } = setup(el);
    act(() => result.current.onScroll());
    rerender({ id: 'b' });
    expect(el.scrollTop).toBe(300);
  });

  it('cerca del fondo, el mensaje nuevo lo lleva al fondo', () => {
    const el = fakeEl(500); // distancia 100
    const { result, rerender } = setup(el);
    act(() => result.current.onScroll());
    rerender({ id: 'b' });
    expect(el.scrollTop).toBe(1000);
  });

  it('al enviar (stickNext) va al fondo aunque estuviera leyendo más arriba', () => {
    const el = fakeEl(300);
    const { result, rerender } = setup(el);
    act(() => result.current.onScroll());
    act(() => result.current.stickNext());
    rerender({ id: 'b' });
    expect(el.scrollTop).toBe(1000);
  });
});
