import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const mockExportService = { forStudent: jest.fn(), forTrainer: jest.fn() };
jest.unstable_mockModule(
  src('services/export/sessions-export.service.js'),
  () => mockExportService
);

const exportController = await import(src('controllers/export/export.controller.js'));

const BOM = String.fromCharCode(0xfeff);
const CSV = `${BOM}Alumno;Email\r\nMartín Pérez;m@x.com\r\n`;
const TRAINER = { id: 'tr-1', role: 'trainer' };

/** Response falsa que guarda headers y cuerpo. */
function fakeRes() {
  const res = { headers: {} };
  res.set = jest.fn((name, value) => {
    res.headers[name] = value;
    return res;
  });
  res.send = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  mockExportService.forStudent.mockResolvedValue({
    filename: 'fittrainer-martin-perez-2026-11-09.csv',
    csv: CSV,
  });
  mockExportService.forTrainer.mockResolvedValue({
    filename: 'fittrainer-alumnos-2026-11-09.csv',
    csv: CSV,
  });
});

describe('export.controller', () => {
  it('exportStudent: headers de descarga CSV y el texto tal cual (con BOM)', async () => {
    const res = fakeRes();
    const next = jest.fn();
    await exportController.exportStudent({ user: TRAINER, params: { id: 'stu-1' } }, res, next);

    expect(mockExportService.forStudent).toHaveBeenCalledWith(TRAINER, 'stu-1');
    expect(res.headers).toEqual({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="fittrainer-martin-perez-2026-11-09.csv"',
    });
    expect(res.send).toHaveBeenCalledWith(CSV);
    expect(next).not.toHaveBeenCalled();
  });

  it('exportTrainer: el CSV de todos sus alumnos', async () => {
    const res = fakeRes();
    await exportController.exportTrainer({ user: TRAINER }, res, jest.fn());

    expect(mockExportService.forTrainer).toHaveBeenCalledWith(TRAINER);
    expect(res.headers['Content-Disposition']).toBe(
      'attachment; filename="fittrainer-alumnos-2026-11-09.csv"'
    );
    expect(res.send).toHaveBeenCalledWith(CSV);
  });

  it('un error del service va a next (error.middleware) sin mandar nada', async () => {
    const boom = Object.assign(new Error('No tenés permiso'), { statusCode: 403 });
    mockExportService.forStudent.mockRejectedValue(boom);
    const res = fakeRes();
    const next = jest.fn();
    await exportController.exportStudent({ user: TRAINER, params: { id: 'x' } }, res, next);

    expect(next).toHaveBeenCalledWith(boom);
    expect(res.send).not.toHaveBeenCalled();
  });
});
