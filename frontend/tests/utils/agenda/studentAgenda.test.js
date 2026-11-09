import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_PENDING,
  canCancel,
  dayAtLabel,
  groupFreeSlots,
  pendingAhead,
  sortForStudent,
} from '@/utils/agenda/studentAgenda';
import { NOW, appt, freezeNow } from '../../helpers/agenda/fixtures';

beforeEach(freezeNow);
afterEach(() => vi.useRealTimers());

const now = () => new Date(NOW);

describe('sortForStudent', () => {
  it('primero los pendientes y confirmados por fecha, al final los cancelados', () => {
    const list = [
      appt({ id: 'cancelado', status: 'cancelled', scheduled_at: '2026-11-05T21:00:00.000Z' }),
      appt({ id: 'confirmado', status: 'confirmed', scheduled_at: '2026-11-10T21:00:00.000Z' }),
      appt({ id: 'pendiente', status: 'pending', scheduled_at: '2026-11-06T21:00:00.000Z' }),
    ];
    expect(sortForStudent(list).map((a) => a.id)).toEqual(['pendiente', 'confirmado', 'cancelado']);
    expect(list.map((a) => a.id)).toEqual(['cancelado', 'confirmado', 'pendiente']);
  });

  it('ordena los cancelados entre sí por fecha', () => {
    const list = [
      appt({ id: 'c2', status: 'cancelled', scheduled_at: '2026-11-09T21:00:00.000Z' }),
      appt({ id: 'c1', status: 'cancelled', scheduled_at: '2026-11-05T21:00:00.000Z' }),
    ];
    expect(sortForStudent(list).map((a) => a.id)).toEqual(['c1', 'c2']);
  });
});

describe('groupFreeSlots', () => {
  it('agrupa por día argentino: las 02:00Z caen en el día anterior', () => {
    const groups = groupFreeSlots([
      { starts_at: '2026-11-07T02:00:00.000Z' },
      { starts_at: '2026-11-06T21:00:00.000Z' },
      { starts_at: '2026-11-09T12:00:00.000Z' },
    ]);
    expect(groups).toEqual([
      {
        date: '2026-11-06',
        label: 'VIE 06/11',
        slots: [
          { starts_at: '2026-11-06T21:00:00.000Z', time: '18:00' },
          { starts_at: '2026-11-07T02:00:00.000Z', time: '23:00' },
        ],
      },
      { date: '2026-11-09', label: 'LUN 09/11', slots: [{ starts_at: '2026-11-09T12:00:00.000Z', time: '09:00' }] },
    ]);
  });

  it('sin libres devuelve una lista vacía', () => {
    expect(groupFreeSlots([])).toEqual([]);
    expect(groupFreeSlots(undefined)).toEqual([]);
  });
});

describe('pendingAhead', () => {
  it('cuenta solo los pendientes a futuro', () => {
    const list = [
      appt({ id: 'p-pasado', status: 'pending', scheduled_at: '2026-11-04T13:00:00.000Z' }),
      appt({ id: 'p-futuro', status: 'pending', scheduled_at: '2026-11-06T21:00:00.000Z' }),
      appt({ id: 'c-futuro', status: 'confirmed', scheduled_at: '2026-11-07T21:00:00.000Z' }),
      appt({ id: 'x-futuro', status: 'cancelled', scheduled_at: '2026-11-08T21:00:00.000Z' }),
    ];
    expect(pendingAhead(list, now())).toBe(1);
    expect(pendingAhead(undefined, now())).toBe(0);
    expect(MAX_PENDING).toBe(3);
  });
});

describe('canCancel', () => {
  it('se cancelan los pendientes y confirmados que no pasaron', () => {
    expect(canCancel(appt({ status: 'pending' }), now())).toBe(true);
    expect(canCancel(appt({ status: 'confirmed' }), now())).toBe(true);
  });

  it('no se cancelan los cancelados ni los que ya empezaron', () => {
    expect(canCancel(appt({ status: 'cancelled' }), now())).toBe(false);
    expect(canCancel(appt({ status: 'pending', scheduled_at: NOW }), now())).toBe(false);
    expect(canCancel(appt({ status: 'confirmed', scheduled_at: '2026-11-04T13:00:00.000Z' }), now())).toBe(false);
  });
});

describe('dayAtLabel', () => {
  it('da el día completo en minúscula y la hora argentina', () => {
    expect(dayAtLabel('2026-11-12T21:00:00.000Z')).toBe('jueves 12/11 a las 18:00');
    expect(dayAtLabel('2026-11-07T02:00:00.000Z')).toBe('viernes 06/11 a las 23:00');
  });
});
