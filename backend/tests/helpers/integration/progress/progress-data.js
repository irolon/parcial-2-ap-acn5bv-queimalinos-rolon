// Datos y esperados de tests/integration/progress.int.test.js, calculados a mano
// (ver la tarea 8 del plan de la suite). P = IT · Press (chest), D = IT · Dominadas (back).
// Cada sesión cierra 1 h después de empezar; la serie n se hace a los n minutos.

/** Series: [ejercicio, kg, reps, completed?, planificado?] (el último solo si hubo sustitución). */
export const SESSIONS = {
  S1: {
    startedAt: '2026-10-06T13:00:00Z',
    sets: [
      ['P', 60, 10],
      ['P', 70, 5],
      ['P', 65, 13],
      ['D', 0, 8],
    ],
  },
  S2: {
    startedAt: '2026-10-20T13:00:00Z',
    sets: [
      ['P', 72.5, 8],
      ['P', 80, 3],
    ],
  },
  // 23:30 del 25/10 en Buenos Aires (02:30Z del 26/10): cuenta en el día y la semana argentinos.
  S3: {
    startedAt: '2026-10-26T02:30:00Z',
    sets: [
      ['P', 75, 6],
      ['P', 100, 5, false],
      ['D', 0, 10],
    ],
  },
  // Primera vez de D con carga después de dos sesiones de peso corporal: no es récord.
  S4: { startedAt: '2026-10-28T13:00:00Z', sets: [['D', 10, 6]] },
  // Sustitución: estaba planificado P y se hizo D. Cuenta para D (curva, días, última carga) y
  // no para P. Más liviana que S4, así no cambia los récords de D.
  S5: { startedAt: '2026-10-30T13:00:00Z', sets: [['D', 8, 5, true, 'P']] },
};

const D_BODYWEIGHT_POINTS = [
  { date: '2026-10-06', max_kg: null, volume_kg: 0, e1rm_kg: null, sets: 1, reps: 8 },
  { date: '2026-10-25', max_kg: null, volume_kg: 0, e1rm_kg: null, sets: 1, reps: 10 },
];

export const EXPECTED = {
  pressCurve: {
    points: [
      { date: '2026-10-06', max_kg: 70, volume_kg: 1795, e1rm_kg: 81.7, sets: 3, reps: 28 },
      { date: '2026-10-20', max_kg: 80, volume_kg: 820, e1rm_kg: 91.8, sets: 2, reps: 11 },
      { date: '2026-10-25', max_kg: 75, volume_kg: 450, e1rm_kg: 90, sets: 1, reps: 6 },
    ],
    pr: { max_kg: { value: 80, date: '2026-10-20' }, e1rm_kg: { value: 91.8, date: '2026-10-20' } },
    default_metric: 'e1rm_kg',
  },
  pullupCurveUntil25: {
    points: D_BODYWEIGHT_POINTS,
    pr: { max_kg: null, e1rm_kg: null },
    default_metric: 'reps',
  },
  pullupCurve: {
    points: [
      ...D_BODYWEIGHT_POINTS,
      { date: '2026-10-28', max_kg: 10, volume_kg: 60, e1rm_kg: 12, sets: 1, reps: 6 },
      // S5 sustituida: 8 × 5 → volumen 40, e1RM 8 × (1 + 5/30) = 9,33.
      { date: '2026-10-30', max_kg: 8, volume_kg: 40, e1rm_kg: 9.3, sets: 1, reps: 5 },
    ],
    pr: { max_kg: { value: 10, date: '2026-10-28' }, e1rm_kg: { value: 12, date: '2026-10-28' } },
    default_metric: 'e1rm_kg',
  },
  // Si S3 se contara en UTC caería en la semana del 26/10 y la del 19/10 daría 820 / 1.
  weeklyVolume: [
    { week_start: '2026-10-05', volume_kg: 1795, sessions: 1 },
    { week_start: '2026-10-12', volume_kg: 0, sessions: 0 },
    { week_start: '2026-10-19', volume_kg: 1270, sessions: 2 },
  ],
  overviewExercises: [
    { key: 'D', muscle_group: 'back', days: 4, last_date: '2026-10-30' },
    { key: 'P', muscle_group: 'chest', days: 3, last_date: '2026-10-25' },
  ],
  sessionSummaries: {
    S1: { sets: 4, volume_kg: 1795, has_pr: false },
    S2: { sets: 2, volume_kg: 820, has_pr: true },
    S3: { sets: 2, volume_kg: 450, has_pr: false },
    S4: { sets: 1, volume_kg: 60, has_pr: false },
    S5: { sets: 1, volume_kg: 40, has_pr: false },
  },
  // last_session_kg de /routines/today: la serie incompleta de 100 kg no cuenta y la sustituida
  // de S5 es la última de D, no de P.
  lastSessionKg: { P: 75, D: 8 },
};
