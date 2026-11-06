import { api } from '../helpers/integration/api.js';
import { createTrainer, inviteAndJoin } from '../helpers/integration/actors.js';
import {
  createExercise,
  createRoutine,
  setRow,
  uploadSession,
} from '../helpers/integration/fixtures.js';
import { EXPECTED, SESSIONS } from '../helpers/integration/progress/progress-data.js';

const plus = (iso, min) => new Date(Date.parse(iso) + min * 60000).toISOString();

// Progreso con números calculados a mano: curva por ejercicio, volumen semanal en
// semanas argentinas, récords (con la regla de peso corporal) y última carga.
describe('integración — progreso con números conocidos', () => {
  let trainer;
  let student;
  const ex = {};
  const sessionIds = {};

  const asTrainer = (path) => api(trainer.token).get(path);
  const curve = async (key, query = '') => {
    const res = await asTrainer(`/progress/exercise/${ex[key]}?student_id=${student.id}${query}`);
    expect(res.status).toBe(200);
    return res.body.data;
  };

  beforeAll(async () => {
    trainer = await createTrainer('prog');
    student = await inviteAndJoin(trainer, 'prog');
    ex.P = await createExercise(trainer, 'Press', 'chest');
    ex.D = await createExercise(trainer, 'Dominadas', 'back');
    await createRoutine(trainer, student.id, {
      label: 'Rutina progreso',
      exerciseIds: [ex.P, ex.D],
    });

    for (const [name, { startedAt, sets }] of Object.entries(SESSIONS)) {
      const rows = sets.map(([key, kg, reps, completed = true, planned], i) =>
        setRow({
          exerciseId: ex[key],
          originalExerciseId: planned ? ex[planned] : null,
          setNumber: i + 1,
          reps,
          kg,
          completed,
          executedAt: plus(startedAt, i + 1),
        })
      );
      const result = await uploadSession(student, {
        startedAt,
        finishedAt: plus(startedAt, 60),
        sets: rows,
      });
      expect(result.failed).toEqual([]);
      sessionIds[name] = result.sessionId;
    }
  });

  it('curva del press: puntos por día argentino, récords y métrica por defecto', async () => {
    const data = await curve('P');
    expect(data.points).toEqual(EXPECTED.pressCurve.points);
    expect(data.pr).toEqual(EXPECTED.pressCurve.pr);
    expect(data.default_metric).toBe(EXPECTED.pressCurve.default_metric);
  });

  it('curva de dominadas hasta el 25/10: solo peso corporal, sin max_kg ni e1RM', async () => {
    const data = await curve('D', '&to=2026-10-25');
    expect(data.points).toEqual(EXPECTED.pullupCurveUntil25.points);
    expect(data.pr).toEqual(EXPECTED.pullupCurveUntil25.pr);
    expect(data.default_metric).toBe(EXPECTED.pullupCurveUntil25.default_metric);
  });

  it('curva de dominadas completa: la carga del 28/10 suma el primer e1RM', async () => {
    const data = await curve('D');
    expect(data.points).toEqual(EXPECTED.pullupCurve.points);
    expect(data.pr).toEqual(EXPECTED.pullupCurve.pr);
    expect(data.default_metric).toBe(EXPECTED.pullupCurve.default_metric);
  });

  it('resumen: volumen semanal en semanas argentinas y ejercicios sin filtrar por rango', async () => {
    const res = await asTrainer(
      `/progress/overview?student_id=${student.id}&from=2026-10-05&to=2026-10-25`
    );
    expect(res.status).toBe(200);
    expect(res.body.data.weekly_volume).toEqual(EXPECTED.weeklyVolume);
    expect(res.body.data.exercises).toEqual(
      EXPECTED.overviewExercises.map(({ key, ...rest }) =>
        expect.objectContaining({ id: ex[key], ...rest })
      )
    );
  });

  it('historial: series, volumen y récord de cada sesión', async () => {
    const res = await asTrainer(`/students/${student.id}/sessions`);
    expect(res.status).toBe(200);
    for (const [name, summary] of Object.entries(EXPECTED.sessionSummaries)) {
      const item = res.body.data.find((s) => s.id === sessionIds[name]);
      expect({ name, ...item }).toMatchObject({ name, ...summary });
    }
  });

  it('detalle: solo S2 marca récord en el press; S3 y S4 no tienen récords', async () => {
    const detail = async (name) => {
      const res = await asTrainer(`/students/${student.id}/sessions/${sessionIds[name]}`);
      expect(res.status).toBe(200);
      return res.body.data.exercises;
    };
    const s2 = await detail('S2');
    expect(s2.find((g) => g.exercise.id === ex.P).is_pr).toBe(true);
    expect((await detail('S3')).some((g) => g.is_pr)).toBe(false);
    expect((await detail('S4')).some((g) => g.is_pr)).toBe(false);
  });

  it('sustitución: la serie de S5 (planificado P, hecho D) suma a D y no a P', async () => {
    const res = await asTrainer(`/students/${student.id}/sessions/${sessionIds.S5}`);
    expect(res.status).toBe(200);
    expect(res.body.data.has_modifications).toBe(true);
    expect(res.body.data.exercises.map((g) => [g.exercise.id, g.original_exercise?.id])).toEqual([
      [ex.D, ex.P],
    ]);
    const d = await curve('D');
    expect(d.points.at(-1)).toEqual(EXPECTED.pullupCurve.points.at(-1));
    const p = await curve('P');
    expect(p.points.map((pt) => pt.date)).not.toContain('2026-10-30');
    expect(p.points).toEqual(EXPECTED.pressCurve.points);
  });

  it('rutina de hoy: última carga de cada ejercicio (la serie incompleta no cuenta)', async () => {
    const res = await api(student.token).get('/routines/today');
    expect(res.status).toBe(200);
    const kgOf = (key) =>
      res.body.data.exercises.find((e) => (e.exercise?.id ?? e.exercise_id) === ex[key])
        .last_session_kg;
    expect(kgOf('P')).toBe(EXPECTED.lastSessionKg.P);
    expect(kgOf('D')).toBe(EXPECTED.lastSessionKg.D);
  });
});
