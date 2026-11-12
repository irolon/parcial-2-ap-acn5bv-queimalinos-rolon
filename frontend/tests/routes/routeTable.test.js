import { describe, expect, it } from 'vitest';
import {
  AI_ROUTINE,
  MY_APPOINTMENTS_PATH,
  MY_PROFILE_PATH,
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
  aiBlockHref,
  aiRoutineHref,
  homeFor,
  newRoutineHref,
  profileHref,
  studentRoutineHref,
} from '@/routes/routeTable';

describe('tabla de rutas', () => {
  it('tiene los ítems del entrenador en el orden del prototipo', () => {
    expect(TRAINER_NAV.items.map((i) => i.label)).toEqual([
      'Dashboard', 'Alumnos', 'Rutinas', 'Biblioteca', 'Desafíos', 'Agenda', 'Mensajes',
    ]);
  });

  it('tiene los ítems del alumno en el orden del prototipo, con el asistente después de Historial y después Turnos', () => {
    expect(STUDENT_NAV.items.map((i) => i.label)).toEqual([
      'Hoy', 'Mi progreso', 'Mis rutinas', 'Historial', 'Asistente IA', 'Turnos', 'Mensajes', 'Mi perfil',
    ]);
    expect(STUDENT_NAV.items.map((i) => i.path)).toEqual([
      'hoy', 'progreso', 'rutinas', 'historial', 'asistente', 'turnos', 'mensajes', 'perfil',
    ]);
    expect(STUDENT_NAV.items.find((i) => i.path === 'turnos')).toMatchObject({
      title: 'Mis turnos',
      subtitle: 'TURNOS CON TU ENTRENADOR',
    });
  });

  it('arma los links del alumno que no están en el menú', () => {
    expect(WORKOUT_PATH).toBe('/alumno/entrenar');
    expect(MY_ROUTINES_PATH).toBe('/alumno/rutinas');
    expect(MY_PROFILE_PATH).toBe('/alumno/perfil');
    expect(MY_APPOINTMENTS_PATH).toBe('/alumno/turnos');
    expect(STUDENT_ROUTINE.path).toBe('/alumno/rutinas/:id');
    expect(studentRoutineHref('r-1')).toBe('/alumno/rutinas/r-1');
    const menuLinks = STUDENT_NAV.items.map((i) => `${STUDENT_NAV.base}/${i.path}`);
    expect(menuLinks).toContain(MY_PROFILE_PATH);
    expect(menuLinks).toContain(MY_APPOINTMENTS_PATH);
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

  it('arma los links del asistente IA y de un bloque en el editor', () => {
    expect(AI_ROUTINE.path).toBe('/pt/rutinas/ia');
    expect(aiRoutineHref()).toBe('/pt/rutinas/ia?nueva=1');
    expect(aiRoutineHref('st-1')).toBe('/pt/rutinas/ia?alumno=st-1');
    expect(aiBlockHref({ studentId: 'st-1', generationId: 'g-1', index: 2 })).toBe('/pt/rutinas/nueva?alumno=st-1&ia=g-1&bloque=2');
    expect(aiBlockHref({ studentId: null, generationId: 'g-1', index: 0 })).toBe('/pt/rutinas/nueva?ia=g-1&bloque=0');
  });

  it('da la home de cada rol', () => {
    expect(homeFor('trainer')).toBe('/pt/dashboard');
    expect(homeFor('student')).toBe('/alumno/hoy');
    expect(homeFor('otro')).toBeNull();
  });
});
