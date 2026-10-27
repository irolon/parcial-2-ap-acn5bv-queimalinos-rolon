import { describe, expect, it } from 'vitest';
import { dndAnnouncements } from '@/components/routines/editor/dndAnnouncements';

const at = (id, index) => ({ id, data: { current: { sortable: { index, items: ['a', 'b', 'c', 'd', 'e', 'f'] } } } });
const { announcements, screenReaderInstructions } = dndAnnouncements({ a: 'Sentadilla', b: 'Plancha', c: 'Remo' });

describe('dndAnnouncements', () => {
  it('anuncia en español con posición y total', () => {
    expect(announcements.onDragStart({ active: at('b', 1) })).toBe('Levantaste Plancha. Está en la posición 2 de 6.');
    expect(announcements.onDragOver({ active: at('b', 1), over: at('c', 2) })).toBe('Moviste Plancha a la posición 3 de 6.');
    expect(announcements.onDragEnd({ active: at('b', 1), over: at('c', 2) })).toBe('Soltaste Plancha en la posición 3 de 6.');
    expect(announcements.onDragCancel({ active: at('b', 1) })).toBe('Cancelaste. Plancha volvió a la posición 2 de 6.');
  });

  it('al soltar o mover fuera de la lista no inventa una posición', () => {
    expect(announcements.onDragOver({ active: at('b', 1), over: null })).toBeUndefined();
    expect(announcements.onDragOver({ active: at('b', 1), over: at('b', 1) })).toBeUndefined();
    expect(announcements.onDragEnd({ active: at('b', 1), over: null })).toBe('Soltaste Plancha en su lugar.');
  });

  it('explica cómo mover con el teclado', () => {
    expect(screenReaderInstructions.draggable).toMatch(/^Para mover un ejercicio, enfocá el asa y presioná Espacio/);
    expect(screenReaderInstructions.draggable).toMatch(/Esc/);
  });
});
