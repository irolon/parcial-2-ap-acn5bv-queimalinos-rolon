import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { studentDetail } from '../../../../helpers/students/fixtures';
import { loadProfile } from '../../../../helpers/students/profile';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('StudentProfilePage: mensaje', () => {
  it('un alumno activo tiene el botón Mensaje hacia su conversación', async () => {
    await loadProfile({ detail: studentDetail({ id: 'st-1' }) });
    const link = within(screen.getByRole('main')).getByRole('link', { name: 'Mensaje' });
    expect(link).toHaveAttribute('href', '/pt/mensajes?alumno=st-1');
  });

  it('un alumno dado de baja no lo tiene', async () => {
    await loadProfile({ detail: studentDetail({ active: false }) });
    expect(screen.queryByRole('link', { name: 'Mensaje' })).toBeNull();
  });
});
