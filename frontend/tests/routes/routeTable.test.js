import { describe, expect, it } from 'vitest';
import { STUDENT_NAV, TRAINER_NAV, homeFor } from '@/routes/routeTable';

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

  it('da la home de cada rol', () => {
    expect(homeFor('trainer')).toBe('/pt/dashboard');
    expect(homeFor('student')).toBe('/alumno/hoy');
    expect(homeFor('otro')).toBeNull();
  });
});
