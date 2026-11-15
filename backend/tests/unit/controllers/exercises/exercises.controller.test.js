import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const mockService = { remove: jest.fn() };
jest.unstable_mockModule(src('services/exercises/exercises.service.js'), () => mockService);

const controller = await import(src('controllers/exercises/exercises.controller.js'));

function fakeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
}

const req = { user: { id: 'tr-1' }, params: { id: 'ex-1' } };
// asyncHandler no devuelve la promesa: se espera a que se resuelvan las microtareas.
const run = async (res) => {
  const next = jest.fn();
  controller.remove(req, res, next);
  await new Promise((r) => setImmediate(r));
  return next;
};

beforeEach(() => jest.clearAllMocks());

describe('exercises.controller — DELETE /exercises/:id', () => {
  it('borrado de verdad: 204 sin cuerpo', async () => {
    mockService.remove.mockResolvedValue({ id: 'ex-1', archived: false });
    const res = fakeRes();
    await run(res);
    expect(mockService.remove).toHaveBeenCalledWith('tr-1', 'ex-1');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('archivado: 200 { data: { id, archived: true } }', async () => {
    mockService.remove.mockResolvedValue({ id: 'ex-1', archived: true });
    const res = fakeRes();
    await run(res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: { id: 'ex-1', archived: true } });
  });

  it('un error del service va a next', async () => {
    const boom = new Error('boom');
    mockService.remove.mockRejectedValue(boom);
    const next = await run(fakeRes());
    expect(next).toHaveBeenCalledWith(boom);
  });
});
