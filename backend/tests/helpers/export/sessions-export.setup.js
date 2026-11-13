import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks compartidos por los tests de la exportación CSV (GX1). Rutas
// absolutas: el mock tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockExportRepo = {
  findSessionsForStudents: jest.fn(),
  findTrainerStudents: jest.fn(),
};
jest.unstable_mockModule(
  src('repositories/export/sessions-export.repository.js'),
  () => mockExportRepo
);

export const mockStudentAccess = { assertCanAccessStudent: jest.fn() };
jest.unstable_mockModule(
  src('services/students/student-access.service.js'),
  () => mockStudentAccess
);

export const exportService = await import(src('services/export/sessions-export.service.js'));
export const { Errors } = await import(src('shared/utils/errors.js'));

/** Sesión con la forma del repo: una serie de Press banca. */
export const session = (studentId, startedAt) => ({
  id: `${studentId}-${startedAt}`,
  student_id: studentId,
  started_at: startedAt,
  finished_at: null,
  rpe: null,
  notes: null,
  trainer_comment: null,
  routine: { name: 'Día A' },
  session_sets: [
    {
      set_number: 1,
      actual_reps: 10,
      actual_kg: 50,
      completed: true,
      rest_seconds: null,
      executed_at: startedAt,
      exercise: { name: 'Press banca' },
      original: null,
    },
  ],
});

const BOM = String.fromCharCode(0xfeff);

/** Líneas del CSV sin el BOM ni la línea vacía del CRLF final. */
export const linesOf = (csv) => csv.slice(BOM.length).split('\r\n').slice(0, -1);
