import { sessionWithExercise } from '../../../../scripts/demo/write-activity.js';

describe('demo — sesión donde cae cada consulta al asistente', () => {
  const routines = [
    { key: 'torso', exercises: [{ name: 'Press militar' }, { name: 'Remo con barra' }] },
    { key: 'piernas', exercises: [{ name: 'Sentadilla libre' }] },
  ];
  // Más nuevas primero, como las devuelve writeHistory.
  const sessions = [
    { id: 's-tue', routineKey: 'piernas' },
    { id: 's-mon', routineKey: 'torso' },
    { id: 's-fri', routineKey: 'piernas' },
  ];

  it('usa la última sesión cuya rutina tiene ese ejercicio', () => {
    expect(sessionWithExercise(sessions, routines, 'Press militar').id).toBe('s-mon');
    expect(sessionWithExercise(sessions, routines, 'Sentadilla libre').id).toBe('s-tue');
  });

  it('sin una sesión con ese ejercicio devuelve null', () => {
    expect(sessionWithExercise(sessions, routines, 'Burpees')).toBeNull();
    expect(sessionWithExercise([], routines, 'Press militar')).toBeNull();
  });
});
