import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { studentDetail } from '../../../helpers/students/fixtures';
import { loadProfile } from '../../../helpers/students/profile';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('StudentProfilePage: asignar rutina', () => {
  it('un alumno activo tiene el link al editor con su id', async () => {
    await loadProfile({ detail: studentDetail({ id: 'st-1' }) });
    const link = within(screen.getByRole('main')).getByRole('link', { name: 'Asignar rutina' });
    expect(link).toHaveAttribute('href', '/pt/rutinas/nueva?alumno=st-1');
  });

  it('un alumno dado de baja no lo tiene', async () => {
    await loadProfile({ detail: studentDetail({ active: false }) });
    expect(screen.queryByRole('link', { name: 'Asignar rutina' })).toBeNull();
  });
});
