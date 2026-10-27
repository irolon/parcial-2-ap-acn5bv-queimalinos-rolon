import { describe, expect, it } from 'vitest';
import { NEW_STUDENT, STUDENTS_PATH, STUDENT_NAV, STUDENT_PROFILE, TRAINER_NAV, homeFor, profileHref } from '@/routes/routeTable';

describe('tabla de rutas', () => {
  it('tiene los ítems del entrenador en el orden del prototipo', () => {
    expect(TRAINER_NAV.items.map((i) => i.label)).toEqual([
      'Dashboard', 'Alumnos', 'Rutinas', 'Biblioteca', 'Agenda', 'Mensajes',
    ]);
  });

  it('tiene los ítems del alumno en el orden del prototipo', () => {
    expect(STUDENT_NAV.items.map((i) => i.label)).toEqual([
      'Hoy', 'Mi progreso', 'Mis rutinas', 'Historial', 'Asistente IA', 'Mi perfil',
    ]);
  });

  it('arma los links de alumnos', () => {
    expect(STUDENTS_PATH).toBe('/pt/alumnos');
    expect(NEW_STUDENT.path).toBe('/pt/alumnos/nuevo');
    expect(STUDENT_PROFILE.path).toBe('/pt/alumnos/:id');
    expect(profileHref('st-1')).toBe('/pt/alumnos/st-1');
    expect(profileHref('st-1', 'estado=inactivos')).toBe('/pt/alumnos/st-1?estado=inactivos');
  });

  it('da la home de cada rol', () => {
    expect(homeFor('trainer')).toBe('/pt/dashboard');
    expect(homeFor('student')).toBe('/alumno/hoy');
    expect(homeFor('otro')).toBeNull();
  });
});
