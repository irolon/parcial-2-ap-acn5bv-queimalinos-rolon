import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockExportRepo,
  mockStudentAccess,
  exportService,
  Errors,
  session,
  linesOf,
} from '../../../helpers/export/sessions-export.setup.js';

const TRAINER = { id: 'tr-1', role: 'trainer', email: 'pt@x.com' };
const MARTIN = {
  id: 'stu-1',
  trainer_id: 'tr-1',
  name: 'Martín Pérez',
  email: 'm@x.com',
  active: true,
};

beforeEach(() => {
  // 9/11 01:00 UTC = 8/11 22:00 en Argentina: el nombre del archivo usa la fecha AR.
  jest.useFakeTimers({ now: new Date('2026-11-09T01:00:00Z'), doNotFake: ['nextTick'] });
  mockStudentAccess.assertCanAccessStudent.mockResolvedValue(MARTIN);
  mockExportRepo.findSessionsForStudents.mockResolvedValue([
    session('stu-1', '2026-11-05T12:00:00Z'),
  ]);
});

afterEach(() => jest.useRealTimers());

describe('sessions-export.service · forStudent', () => {
  it('el alumno sobre sí mismo → sus filas, columnas del alumno y fittrainer-mis-sesiones', async () => {
    const self = { id: 'stu-1', role: 'student', email: 'm@x.com' };
    const { filename, csv } = await exportService.forStudent(self, 'stu-1');
    expect(mockStudentAccess.assertCanAccessStudent).toHaveBeenCalledWith(self, 'stu-1');
    expect(mockExportRepo.findSessionsForStudents).toHaveBeenCalledWith(['stu-1']);
    expect(filename).toBe('fittrainer-mis-sesiones-2026-11-08.csv');
    const [header, row] = linesOf(csv);
    expect(header.startsWith('Fecha;Hora;')).toBe(true);
    expect(row.startsWith('05/11/2026;09:00;')).toBe(true);
  });

  it('el PT dueño → columnas del PT y el nombre del alumno en ASCII (martin-perez)', async () => {
    const { filename, csv } = await exportService.forStudent(TRAINER, 'stu-1');
    expect(filename).toBe('fittrainer-martin-perez-2026-11-08.csv');
    const [header, row] = linesOf(csv);
    expect(header.startsWith('Alumno;Email;Activo;Fecha;')).toBe(true);
    expect(row.startsWith('Martín Pérez;m@x.com;Sí;05/11/2026;')).toBe(true);
  });

  it('ajeno → el 403 de assertCanAccessStudent, sin consultar sesiones', async () => {
    mockStudentAccess.assertCanAccessStudent.mockRejectedValue(Errors.forbidden());
    await expect(exportService.forStudent(TRAINER, 'stu-9')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockExportRepo.findSessionsForStudents).not.toHaveBeenCalled();
  });
});

describe('sessions-export.service · forTrainer', () => {
  it('incluye a los dados de baja y ordena por alumno y fecha', async () => {
    mockExportRepo.findTrainerStudents.mockResolvedValue([
      { id: 'stu-2', name: 'Ana', email: 'a@x.com', active: false },
      { id: 'stu-1', name: 'Martín Pérez', email: 'm@x.com', active: true },
    ]);
    mockExportRepo.findSessionsForStudents.mockResolvedValue([
      session('stu-1', '2026-11-01T12:00:00Z'),
      session('stu-2', '2026-11-02T12:00:00Z'),
      session('stu-1', '2026-11-03T12:00:00Z'),
    ]);
    const { filename, csv } = await exportService.forTrainer(TRAINER);
    expect(mockExportRepo.findTrainerStudents).toHaveBeenCalledWith('tr-1');
    expect(mockExportRepo.findSessionsForStudents).toHaveBeenCalledWith(['stu-2', 'stu-1']);
    expect(filename).toBe('fittrainer-alumnos-2026-11-08.csv');
    const rows = linesOf(csv)
      .slice(1)
      .map((line) => line.split(';').slice(0, 4).join(';'));
    expect(rows).toEqual([
      'Ana;a@x.com;No;02/11/2026',
      'Martín Pérez;m@x.com;Sí;01/11/2026',
      'Martín Pérez;m@x.com;Sí;03/11/2026',
    ]);
  });

  it('trainer sin alumnos → solo el encabezado', async () => {
    mockExportRepo.findTrainerStudents.mockResolvedValue([]);
    mockExportRepo.findSessionsForStudents.mockResolvedValue([]);
    const { csv } = await exportService.forTrainer(TRAINER);
    expect(linesOf(csv)).toHaveLength(1);
  });
});

describe('sessions-export.service · slugify', () => {
  it.each([
    ['Martín Pérez', 'martin-perez'],
    ["  Ñandú   O'Brien!! ", 'nandu-o-brien'],
    ['José_María', 'jose-maria'],
    ['¡¡!!', 'alumno'],
    ['', 'alumno'],
  ])('%j → %j', (name, slug) => {
    expect(exportService.slugify(name)).toBe(slug);
  });
});
