import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api/agenda/agenda.api';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => configureClient({ getToken: () => 'access-1' }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('agenda.api', () => {
  it('getAvailability hace GET /availability y devuelve data', async () => {
    const slots = [{ weekday: 1, start_time: '09:00', end_time: '13:00' }];
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: slots }));
    await expect(api.getAvailability()).resolves.toEqual(slots);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/availability');
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('saveAvailability hace PUT con { slots }', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: [] }));
    await expect(api.saveAvailability([])).resolves.toEqual([]);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/availability');
    expect(init.method).toBe('PUT');
    expect(bodyOf(init)).toEqual({ slots: [] });
  });

  it('listFreeSlots manda from y to', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: [{ starts_at: '2026-11-06T21:00:00.000Z' }] }));
    await expect(api.listFreeSlots('2026-11-02', '2026-11-08')).resolves.toHaveLength(1);
    expect(calls(fetchMock)[0][0]).toBe('/availability/free?from=2026-11-02&to=2026-11-08');
  });

  it('listAppointments manda from y to', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: [{ id: 'a-1' }] }));
    await expect(api.listAppointments('2026-11-02', '2026-11-08')).resolves.toEqual([{ id: 'a-1' }]);
    expect(calls(fetchMock)[0][0]).toBe('/appointments?from=2026-11-02&to=2026-11-08');
  });

  it('createAppointment hace POST con el body', async () => {
    const body = { student_id: 's-1', scheduled_at: '2026-11-06T21:00:00.000Z' };
    const fetchMock = stubFetch(async () => jsonResponse(201, { data: { id: 'a-1', status: 'confirmed' } }));
    await expect(api.createAppointment(body)).resolves.toMatchObject({ status: 'confirmed' });
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/appointments');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual(body);
  });

  it('updateAppointmentStatus hace PATCH /appointments/:id con { status }', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: { id: 'a-1', status: 'cancelled' } }));
    await expect(api.updateAppointmentStatus('a-1', 'cancelled')).resolves.toMatchObject({ status: 'cancelled' });
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/appointments/a-1');
    expect(init.method).toBe('PATCH');
    expect(bodyOf(init)).toEqual({ status: 'cancelled' });
  });

  it('propaga el código del error (SLOT_TAKEN)', async () => {
    stubFetch(async () => errorResponse(409, 'SLOT_TAKEN', 'Ese horario ya está ocupado'));
    await expect(api.createAppointment({})).rejects.toMatchObject({ status: 409, code: 'SLOT_TAKEN' });
  });
});
