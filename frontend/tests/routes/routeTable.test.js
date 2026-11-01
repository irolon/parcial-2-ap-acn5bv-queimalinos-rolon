import { describe, expect, it } from 'vitest';
import {
  MY_ROUTINES_PATH,
  NEW_ROUTINE,
  NEW_STUDENT,
  ROUTINES_PATH,
  STUDENTS_PATH,
  STUDENT_NAV,
  STUDENT_PROFILE,
  STUDENT_ROUTINE,
  TRAINER_NAV,
  WORKOUT_PATH,
  homeFor,
  newRoutineHref,
  profileHref,
  studentRoutineHref,
} from '@/routes/routeTable';

describe('tabla de rutas', () => {
  it('tiene los ítems del entrenador en el orden del prototipo', () => {
    expect(TRAINER_NAV.items.map((i) => i.label)).toEqual([
      'Dashboard', 'Alumnos', 'Rutinas', 'Biblioteca', 'Agenda', 'Mensajes',
    ]);
  });

  it('tiene los ítems del alumno en el orden del prototipo, sin el asistente', () => {
    expect(STUDENT_NAV.items.map((i) => i.label)).toEqual([
      'Hoy', 'Mi progreso', 'Mis rutinas', 'Historial', 'Mi perfil',
    ]);
    expect(STUDENT_NAV.items.map((i) => i.path)).toEqual(['hoy', 'progreso', 'rutinas', 'historial', 'perfil']);
  });

  it('arma los links del alumno que no están en el menú', () => {
    expect(WORKOUT_PATH).toBe('/alumno/entrenar');
    expect(MY_ROUTINES_PATH).toBe('/alumno/rutinas');
    expect(STUDENT_ROUTINE.path).toBe('/alumno/rutinas/:id');
    expect(studentRoutineHref('r-1')).toBe('/alumno/rutinas/r-1');
    const menuLinks = STUDENT_NAV.items.map((i) => `${STUDENT_NAV.base}/${i.path}`);
    expect(menuLinks).not.toContain(WORKOUT_PATH);
    expect(menuLinks).not.toContain(studentRoutineHref('r-1'));
  });

  it('arma los links de alumnos', () => {
    expect(STUDENTS_PATH).toBe('/pt/alumnos');
    expect(NEW_STUDENT.path).toBe('/pt/alumnos/nuevo');
    expect(STUDENT_PROFILE.path).toBe('/pt/alumnos/:id');
    expect(profileHref('st-1')).toBe('/pt/alumnos/st-1');
    expect(profileHref('st-1', 'estado=inactivos')).toBe('/pt/alumnos/st-1?estado=inactivos');
  });

  it('arma los links de rutinas', () => {
    expect(ROUTINES_PATH).toBe('/pt/rutinas');
    expect(NEW_ROUTINE.path).toBe('/pt/rutinas/nueva');
    expect(newRoutineHref()).toBe('/pt/rutinas/nueva');
    expect(newRoutineHref('st-1')).toBe('/pt/rutinas/nueva?alumno=st-1');
  });

  it('da la home de cada rol', () => {
    expect(homeFor('trainer')).toBe('/pt/dashboard');
    expect(homeFor('student')).toBe('/alumno/hoy');
    expect(homeFor('otro')).toBeNull();
  });
});
