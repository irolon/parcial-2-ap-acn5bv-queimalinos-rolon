import { describe, expect, it } from '@jest/globals';
import { mockAvailability, importSrc, TRAINER } from '../../../helpers/agenda/agenda.setup.js';

const service = await importSrc('services/agenda/availability.service.js');

describe('availability.service', () => {
  it('list devuelve las franjas del PT con horas HH:MM', async () => {
    mockAvailability.findAvailability.mockResolvedValue([{ weekday: 1, start_time: '08:00:00', end_time: '12:00:00' }]);
    await expect(service.list(TRAINER)).resolves.toEqual([{ weekday: 1, start_time: '08:00', end_time: '12:00' }]);
    expect(mockAvailability.findAvailability).toHaveBeenCalledWith(TRAINER.id);
  });

  it('replace manda las franjas a la RPC y devuelve lo guardado', async () => {
    const slots = [{ weekday: 2, start_time: '09:00', end_time: '13:00' }];
    mockAvailability.replaceAvailability.mockResolvedValue([{ weekday: 2, start_time: '09:00:00', end_time: '13:00:00' }]);
    await expect(service.replace(TRAINER, { slots })).resolves.toEqual(slots);
    expect(mockAvailability.replaceAvailability).toHaveBeenCalledWith(TRAINER.id, slots);
  });

  it('replace con lista vacía borra todo', async () => {
    mockAvailability.replaceAvailability.mockResolvedValue([]);
    await expect(service.replace(TRAINER, { slots: [] })).resolves.toEqual([]);
  });
});
