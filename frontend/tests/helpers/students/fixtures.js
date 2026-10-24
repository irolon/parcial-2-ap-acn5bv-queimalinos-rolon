let seq = 0;

/** Alumno como lo devuelve `GET /students`; `overrides` pisa cualquier campo. */
export function student(overrides = {}) {
  seq += 1;
  return {
    id: `st-${seq}`,
    name: `Alumno ${seq}`,
    email: `alumno${seq}@mail.com`,
    goal: 'hypertrophy',
    active: true,
    created_at: '2026-01-01T10:00:00Z',
    last_session_at: null,
    ...overrides,
  };
}

/** Medida corporal; `overrides` pisa cualquier campo. */
export function metric(overrides = {}) {
  seq += 1;
  return {
    id: `m-${seq}`,
    recorded_at: '2026-10-01T10:00:00Z',
    weight_kg: 80,
    height_cm: 178,
    body_fat_pct: null,
    waist_cm: null,
    hip_cm: null,
    chest_cm: null,
    ...overrides,
  };
}
