import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { resetAuthStore } from '../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../helpers/routes/renderRoute';
import { studentDetail } from '../helpers/students/fixtures';
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

  it('/pt/alumnos/:id renderiza la ficha', async () => {
    stubStudents({ detail: studentDetail() });
    renderRoute('/pt/alumnos/st-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Paz' })).toBeVisible();
  });

  it('/pt/alumnos renderiza el panel', () => {
    renderRoute('/pt/alumnos');
    expect(screen.getByRole('heading', { name: 'Alumnos', level: 1 })).toBeVisible();
  });
});
