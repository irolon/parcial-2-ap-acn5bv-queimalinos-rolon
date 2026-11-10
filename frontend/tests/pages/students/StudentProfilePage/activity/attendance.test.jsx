import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { currentMonth, monthName } from '@/utils/students/commitment';
import { shiftMonth } from '@/utils/students/attendanceCalendar';
import { OVERVIEW, exerciseData } from '../../../../helpers/progress/progress';
import { calls } from '../../../../helpers/shared/fetchMock';
import { studentDetail } from '../../../../helpers/students/fixtures';
import { loadProfile } from '../../../../helpers/students/profile';

vi.mock('recharts', async (importOriginal) => (await import('../../../../helpers/progress/recharts')).mockRecharts(importOriginal));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const CURRENT = currentMonth();
const PREV = shiftMonth(CURRENT, -1);
const DAYS = { [CURRENT]: [{ date: `${CURRENT}-01`, status: 'trained' }], [PREV]: [{ date: `${PREV}-02`, status: 'missed' }] };

const progress = (path) => {
  if (path.startsWith('/progress/overview')) return OVERVIEW;
  return exerciseData(/^\/progress\/exercise\/([^/?]+)/.exec(path)[1]);
};

describe('StudentProfilePage: calendario de asistencia', () => {
  it('el PT ve el calendario del alumno debajo del compromiso y navega hasta su alta', async () => {
    let month = CURRENT;
    const attendance = () => ({ month, sessions: 6, assigned_days: 9, prs: 2, days: DAYS[month] });
    const { fetchMock } = await loadProfile({
      detail: studentDetail({ id: 'st-1', created_at: `${PREV}-05T12:00:00Z` }),
      attendance,
      progress,
    });
    const title = await screen.findByText(`Asistencia · ${monthName(CURRENT)}`);
    const commitment = screen.getByRole('region', { name: `Compromiso · ${monthName(CURRENT)}` });
    expect(commitment.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(await screen.findByRole('img', { name: '1, entrenó' })).toBeInTheDocument();
    month = PREV;
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(await screen.findByRole('img', { name: '2, faltó' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
    expect(calls(fetchMock).map(([p]) => p)).toContain(`/students/st-1/attendance?month=${PREV}`);
  });

  it('la ficha no suma el detalle por ejercicio', async () => {
    await loadProfile({ detail: studentDetail({ id: 'st-1' }), progress });
    expect(await screen.findByLabelText('Métrica de la comparación')).toBeInTheDocument();
    await screen.findByRole('img', { name: 'Progresión de Press banca' });
    expect(screen.queryByText('Por ejercicio')).not.toBeInTheDocument();
  });
});
