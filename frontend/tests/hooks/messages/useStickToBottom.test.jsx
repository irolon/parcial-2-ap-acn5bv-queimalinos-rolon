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

  it('una foto que carga abajo de todo sigue en el fondo aunque el navegador corra el scroll al crecer', () => {
    const el = { scrollHeight: 601, clientHeight: 542, scrollTop: 59 }; // abajo de todo, la foto todavía sin alto
    const { result } = setup(el);
    act(() => result.current.onScroll());
    // Carga la foto (+142 px) y el navegador corre el scroll 2 px: medido así, quedó a 140 px del fondo.
    Object.assign(el, { scrollHeight: 743, scrollTop: 61 });
    act(() => result.current.onScroll());
    act(() => result.current.onImageLoad());
    expect(el.scrollTop).toBe(743);
  });

  it('si el usuario sube a leer y después carga una foto, no lo baja', () => {
    const el = fakeEl(300);
    const { result } = setup(el);
    act(() => result.current.onScroll());
    Object.assign(el, { scrollHeight: 1150 });
    act(() => result.current.onScroll());
    act(() => result.current.onImageLoad());
    expect(el.scrollTop).toBe(300);
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
