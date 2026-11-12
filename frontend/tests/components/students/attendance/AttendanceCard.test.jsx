import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import AttendanceCard from '@/components/students/attendance/AttendanceCard';
import { currentMonth, monthName } from '@/utils/students/commitment';
import { shiftMonth } from '@/utils/students/attendanceCalendar';
import { renderWithQuery } from '../../../helpers/progress/progress';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const CURRENT = currentMonth();
const PREV = shiftMonth(CURRENT, -1);
const DAYS = [
  { date: `${PREV}-01`, status: 'trained' },
  { date: `${PREV}-02`, status: 'missed' },
  { date: `${PREV}-03`, status: 'rest' },
  { date: `${PREV}-04`, status: 'upcoming' },
];
const attendance = (month, extra = {}) => ({ month, sessions: 14, assigned_days: 16, prs: 0, days: month === PREV ? DAYS : [], ...extra });

/** `createdAt`: el alta (piso); `answer(month)`: el dato o un status de error de cada mes. */
function load({ createdAt = `${shiftMonth(CURRENT, -2)}-15T12:00:00Z`, answer = (month) => attendance(month) } = {}) {
  const fetchMock = stubFetch(async (url) => {
    const path = url.replace(/^.*\/api/, '');
    if (path === '/students/s-1') return jsonResponse(200, { data: { id: 's-1', name: 'Ana', created_at: createdAt } });
    const month = /attendance\?month=(\d{4}-\d{2})$/.exec(path)?.[1];
    if (!month) return errorResponse(500, 'INTERNAL');
    const data = await answer(month);
    return typeof data === 'number' ? errorResponse(data, 'INTERNAL') : jsonResponse(200, { data });
  });
  renderWithQuery(<AttendanceCard studentId="s-1" />);
  return fetchMock;
}

const months = (fetchMock) => calls(fetchMock).map(([p]) => /month=(.+)$/.exec(p)?.[1]).filter(Boolean);
const count = (text) => screen.findByText((_, el) => el?.tagName === 'P' && el.textContent === text);

describe('AttendanceCard', () => {
  it('muestra el mes actual con sesiones sobre planificadas, sin poder ir hacia adelante', async () => {
    load();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando la asistencia…');
    expect(await count('14 DE 16')).toBeInTheDocument();
    expect(screen.getByText(`Asistencia · ${monthName(CURRENT)}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
    expect(screen.getAllByText('L')).toHaveLength(1);
    expect(['Entrenó', 'Faltó', 'Descanso'].every((t) => screen.getByText(t))).toBe(true);
  });

  it('sin plan muestra solo las sesiones', async () => {
    load({ answer: (month) => attendance(month, { assigned_days: 0 }) });
    expect(await count('14 SESIONES')).toBeInTheDocument();
  });

  it('‹ pide el mes anterior y pinta cada día con su estado; › vuelve', async () => {
    const fetchMock = load();
    await count('14 DE 16');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(await screen.findByRole('img', { name: '1, entrenó' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '2, faltó' })).toHaveClass('text-hot');
    expect(screen.getByRole('img', { name: '3, descanso' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '4, por venir' })).toBeInTheDocument();
    expect(months(fetchMock)).toEqual([CURRENT, PREV]);
    expect(screen.getByRole('group', { name: 'Días del mes' })).not.toHaveAttribute('aria-busy');
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await waitFor(() => expect(screen.queryByRole('img', { name: '1, entrenó' })).not.toBeInTheDocument());
    expect(screen.getByText(`Asistencia · ${monthName(CURRENT)}`)).toBeInTheDocument();
  });

  it('mientras llega el mes nuevo deja el anterior atenuado', async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    load({ answer: async (month) => (month === PREV ? gate.then(() => attendance(month)) : attendance(month)) });
    await count('14 DE 16');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(await screen.findByText(`Asistencia · ${monthName(PREV)}`)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Días del mes' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    release();
    expect(await screen.findByRole('img', { name: '1, entrenó' })).toBeInTheDocument();
  });

  it('no pasa del mes del alta', async () => {
    const fetchMock = load({ createdAt: `${PREV}-20T12:00:00Z` });
    await count('14 DE 16');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await screen.findByRole('img', { name: '1, entrenó' });
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
    expect(months(fetchMock)).toEqual([CURRENT, PREV]);
  });

  it('con el alta en el mes actual no hay flecha atrás', async () => {
    load({ createdAt: new Date().toISOString() });
    await count('14 DE 16');
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
  });

  it('si falla muestra el error con Reintentar y las flechas siguen andando', async () => {
    const fetchMock = load({ answer: (month) => (month === CURRENT ? 500 : attendance(month)) });
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la asistencia.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(months(fetchMock)).toEqual([CURRENT, CURRENT]));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(await screen.findByRole('img', { name: '1, entrenó' })).toBeInTheDocument();
  });
});
