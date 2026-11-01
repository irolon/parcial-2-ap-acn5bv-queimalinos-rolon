import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks de los repositorios y de notify compartidos por los tests de la agenda. Rutas absolutas:
// el mock tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockAppointments = {
  findAppointmentsInRange: jest.fn(),
  findTakenInRange: jest.fn(),
  insertAppointment: jest.fn(),
  findAppointmentById: jest.fn(),
  updateStatus: jest.fn(),
};
export const mockAvailability = { replaceAvailability: jest.fn(), findAvailability: jest.fn() };
export const mockStudents = { findStudentById: jest.fn() };
export const mockNotify = { notify: jest.fn(), pushOnly: jest.fn() };
// Evita cargar el repositorio real de trigger-data (que importa supabase) en las rutas.
export const mockTriggerData = { findStudentInfo: jest.fn() };

jest.unstable_mockModule(src('repositories/agenda/appointments.repository.js'), () => mockAppointments);
jest.unstable_mockModule(src('repositories/agenda/availability.repository.js'), () => mockAvailability);
jest.unstable_mockModule(src('repositories/students/students.repository.js'), () => mockStudents);
jest.unstable_mockModule(src('services/notifications/notify.service.js'), () => mockNotify);
jest.unstable_mockModule(src('repositories/notifications/trigger-data.repository.js'), () => mockTriggerData);

export const importSrc = (p) => import(src(p));

export const TRAINER = { id: '11111111-1111-4111-8111-111111111111', role: 'trainer' };
export const STUDENT = { id: '22222222-2222-4222-8222-222222222222', role: 'student' };
export const OTHER_STUDENT_ID = '33333333-3333-4333-8333-333333333333';
export const APPT_ID = '44444444-4444-4444-8444-444444444444';

/** Ahora fijo: miércoles 04/11/2026 12:00 en Argentina (15:00 UTC). */
export const NOW = new Date('2026-11-04T15:00:00.000Z');

export const studentRow = (over = {}) => ({
  id: STUDENT.id, trainer_id: TRAINER.id, name: 'Lucía', active: true, ...over,
});

/** Fila de turno como la devuelve la base (con el alumno embebido). */
export const apptRow = (over = {}) => ({
  id: APPT_ID,
  trainer_id: TRAINER.id,
  student_id: STUDENT.id,
  scheduled_at: '2026-11-06T21:00:00+00:00', // vie 06/11 18:00 AR
  duration_min: 60,
  status: 'pending',
  notes: null,
  created_at: '2026-11-04T12:00:00Z',
  student: { id: STUDENT.id, name: 'Lucía', avatar_url: null },
  ...over,
});
