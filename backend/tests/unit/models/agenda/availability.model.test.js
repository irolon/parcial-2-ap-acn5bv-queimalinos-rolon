import { freeSlots, toSlot } from '../../../../src/models/agenda/availability.model.js';

// Jueves 5/11/2026 = weekday 4; viernes 6/11 = 5.
const NOW = new Date('2026-11-02T12:00:00Z'); // lunes 09:00 AR
const THU_18 = '2026-11-05T21:00:00.000Z';
const THU_19 = '2026-11-05T22:00:00.000Z';
const THU_20 = '2026-11-05T23:00:00.000Z';

const base = { taken: [], from: '2026-11-05', to: '2026-11-05', now: NOW };

describe('freeSlots', () => {
  it('ofrece cada hora en punto de la franja: inicio incluido, fin excluido', () => {
    const out = freeSlots({ ...base, availability: [{ weekday: 4, start_time: '18:00:00', end_time: '20:00' }] });
    expect(out).toEqual([THU_18, THU_19]);
  });

  it('descarta las horas tomadas (pending o confirmed), sin importar el formato del ISO', () => {
    const out = freeSlots({
      ...base,
      availability: [{ weekday: 4, start_time: '18:00', end_time: '21:00' }],
      taken: ['2026-11-05T22:00:00+00:00'],
    });
    expect(out).toEqual([THU_18, THU_20]);
  });

  it('un turno cancelado no llega en taken, así que la hora sigue libre', () => {
    const out = freeSlots({ ...base, availability: [{ weekday: 4, start_time: '18:00', end_time: '19:00' }] });
    expect(out).toEqual([THU_18]);
  });

  it('no ofrece horas pasadas ni la hora actual', () => {
    const availability = [{ weekday: 4, start_time: '18:00', end_time: '21:00' }];
    expect(freeSlots({ ...base, availability, now: new Date(THU_19) })).toEqual([THU_20]);
    expect(freeSlots({ ...base, availability, now: new Date('2026-11-05T21:30:00Z') })).toEqual([THU_19, THU_20]);
  });

  it('solo toma las franjas del weekday de cada día', () => {
    const out = freeSlots({
      ...base,
      to: '2026-11-06',
      availability: [
        { weekday: 4, start_time: '18:00', end_time: '19:00' },
        { weekday: 5, start_time: '10:00', end_time: '11:00' },
        { weekday: 1, start_time: '10:00', end_time: '11:00' },
      ],
    });
    expect(out).toEqual([THU_18, '2026-11-06T13:00:00.000Z']);
  });

  it('una franja de las 22:00 AR cae al día siguiente en UTC pero sigue siendo del día argentino', () => {
    const out = freeSlots({ ...base, availability: [{ weekday: 4, start_time: '22:00', end_time: '23:00' }] });
    expect(out).toEqual(['2026-11-06T01:00:00.000Z']);
  });

  it('lunes 00:00 AR pertenece al lunes (weekday 1), no al domingo', () => {
    const out = freeSlots({
      availability: [
        { weekday: 1, start_time: '00:00', end_time: '01:00' },
        { weekday: 7, start_time: '22:00', end_time: '23:00' },
      ],
      taken: [],
      from: '2026-11-08',
      to: '2026-11-09',
      now: NOW,
    });
    expect(out).toEqual(['2026-11-09T01:00:00.000Z', '2026-11-09T03:00:00.000Z']);
  });

  it('varias franjas del mismo día salen ordenadas y sin repetir', () => {
    const out = freeSlots({
      ...base,
      availability: [
        { weekday: 4, start_time: '19:00', end_time: '21:00' },
        { weekday: 4, start_time: '08:00', end_time: '09:00' },
        { weekday: 4, start_time: '20:00', end_time: '22:00' },
      ],
    });
    expect(out).toEqual([
      '2026-11-05T11:00:00.000Z',
      THU_19,
      THU_20,
      '2026-11-06T00:00:00.000Z',
    ]);
  });

  it('sin disponibilidad o con un rango vacío devuelve []', () => {
    const availability = [{ weekday: 4, start_time: '08:00', end_time: '09:00' }];
    expect(freeSlots({ ...base, availability: [] })).toEqual([]);
    expect(freeSlots({ ...base, from: '2026-11-06', to: '2026-11-05', availability })).toEqual([]);
  });
});

describe('toSlot', () => {
  it('recorta los segundos', () => {
    expect(toSlot({ id: 'x', weekday: 2, start_time: '08:00:00', end_time: '12:00:00' })).toEqual({
      weekday: 2,
      start_time: '08:00',
      end_time: '12:00',
    });
  });
});
