import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sessionDetailItem, sessionItem, sessionsPage } from '../../../helpers/sessions/sessions';
import { studentDetail } from '../../../helpers/students/fixtures';
import { loadProfile } from '../../../helpers/students/profile';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('StudentProfilePage: últimas sesiones', () => {
  it('muestra el bloque con las sesiones del alumno y abre el detalle', async () => {
    const user = userEvent.setup();
    await loadProfile({
      detail: studentDetail({ id: 'st-1' }),
      sessions: sessionsPage([sessionItem({ has_pr: true })]),
      sessionDetails: { 's-1': sessionDetailItem() },
    });
    const main = within(screen.getByRole('main'));
    expect(await main.findByText('Push · día 3')).toBeVisible();
    await user.click(main.getByRole('button', { name: 'Detalle' }));
    expect(await main.findByText('Press de banca')).toBeVisible();
  });

  it('sin sesiones dice "Todavía no entrenó"', async () => {
    await loadProfile({ detail: studentDetail({ id: 'st-1' }) });
    expect(await screen.findByText('Todavía no entrenó')).toBeVisible();
  });
});
