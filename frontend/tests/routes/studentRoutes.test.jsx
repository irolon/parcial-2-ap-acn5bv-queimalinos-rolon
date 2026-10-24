import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { resetAuthStore } from '../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../helpers/routes/renderRoute';
import { stubStudents } from '../helpers/students/students';

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
  stubStudents();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('rutas de alumnos', () => {
  it('/pt/alumnos/nuevo sigue mostrando "Invitar alumno"', () => {
    renderRoute('/pt/alumnos/nuevo');
    expect(screen.getByRole('heading', { level: 1, name: 'Invitar alumno' })).toBeVisible();
  });

  it('/pt/alumnos/:id renderiza la ficha', () => {
    renderRoute('/pt/alumnos/st-1');
    expect(screen.getByRole('heading', { name: 'Ficha del alumno' })).toBeVisible();
  });

  it('/pt/alumnos renderiza el panel', () => {
    renderRoute('/pt/alumnos');
    expect(screen.getByRole('heading', { name: 'Alumnos', level: 1 })).toBeVisible();
  });
});
