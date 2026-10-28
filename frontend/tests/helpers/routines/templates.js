import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls } from '../shared/fetchMock';
import { student } from '../students/fixtures';

const item = (id, order, extra = {}) => ({
  exercise_id: id, sets: 4, reps: 8, rest_seconds: 60, suggested_kg: 20.5, tempo: '3-1-1', notes: 'Bajar lento', order, exercise: { id }, ...extra,
});
export const SUMMARY = { id: 't-1', name: 'Full body', goal: 'hypertrophy', level: 'beginner', days: ['monday', 'friday'], exercise_count: 2 };
export const DETAIL = {
  ...SUMMARY,
  structure: { version: 1, days: ['monday', 'friday'], exercises: [item('ex-squat', 0), item('ex-plank', 1)] },
};

export { item };
/** Opciones de `stubRoutinesApi` con una plantilla y un alumno. */
export const api = (extra = {}) => ({ templates: [SUMMARY], template: DETAIL, students: [student({ id: 'st-9', name: 'Ana Paz' })], ...extra });
export const open = (name) => userEvent.click(screen.getByRole('button', { name }));
export const post = (fetchMock, path) => calls(fetchMock).find(([p, init]) => p === path && init?.method === 'POST');
