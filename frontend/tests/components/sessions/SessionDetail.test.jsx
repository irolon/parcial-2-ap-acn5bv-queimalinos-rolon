import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionsHistory from '@/components/sessions/SessionsHistory';
import { calls } from '../../helpers/shared/fetchMock';
import {
  exerciseItem,
  renderWithQuery,
  sessionDetailItem,
  sessionItem,
  sessionsPage,
  setItem,
  stubSessions,
} from '../../helpers/sessions/sessions';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function expand(detail) {
  const user = userEvent.setup();
  const fetchMock = stubSessions({ sessions: sessionsPage([sessionItem()]), details: { 's-1': detail } });
  renderWithQuery(<SessionsHistory studentId="st-1" />);
  const button = await screen.findByRole('button', { name: 'Detalle' });
  expect(button).toHaveClass('!h-11'); // toque de 44 px
  await user.click(button);
  return { user, fetchMock, button };
}

const detailCalls = (fetchMock) => calls(fetchMock).filter(([path]) => path === '/students/st-1/sessions/s-1');

describe('SessionDetail', () => {
  it('pide el detalle al expandir y lo vuelve a pedir al reabrir (puede haber series nuevas)', async () => {
    const { user, fetchMock, button } = await expand(sessionDetailItem());
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText('Press de banca')).toBeVisible();
    await user.click(button);
    expect(screen.queryByText('Press de banca')).toBeNull();
    await user.click(button);
    expect(await screen.findByText('Press de banca')).toBeVisible();
    await vi.waitFor(() => expect(detailCalls(fetchMock)).toHaveLength(2));
  });

  it('muestra la nota del alumno arriba del comentario aunque el entrenador ya haya respondido', async () => {
    const user = userEvent.setup();
    const session = sessionItem({ notes: 'Me dolió la rodilla en la sentadilla', trainer_comment: 'Bajá el peso' });
    stubSessions({ sessions: sessionsPage([session]), details: { 's-1': sessionDetailItem() } });
    renderWithQuery(<SessionsHistory studentId="st-1" />);
    await user.click(await screen.findByRole('button', { name: 'Detalle' }));
    expect(await screen.findByText('Nota del alumno')).toBeVisible();
    expect(screen.getByText('Me dolió la rodilla en la sentadilla')).toBeVisible();
    expect(screen.getByLabelText('Comentario del entrenador')).toHaveValue('Bajá el peso');
  });

  it('no pide el detalle mientras la fila está cerrada', async () => {
    const fetchMock = stubSessions({ sessions: sessionsPage([sessionItem()]) });
    renderWithQuery(<SessionsHistory studentId="st-1" />);
    await screen.findByRole('button', { name: 'Detalle' });
    expect(detailCalls(fetchMock)).toHaveLength(0);
  });

  it('compara reps y kg reales con el plan: arriba good, abajo hot, igual neutro', async () => {
    await expand(
      sessionDetailItem({
        exercises: [
          exerciseItem({
            sets: [
              setItem({ id: 'a', set_number: 1, actual_reps: 12, actual_kg: 55 }),
              setItem({ id: 'b', set_number: 2, actual_reps: 10, actual_kg: 60 }),
            ],
          }),
        ],
      }),
    );
    const table = await screen.findByRole('table', { name: 'Series de Press de banca' });
    const [, first, second] = within(table).getAllByRole('row');
    expect(within(first).getByText('12')).toHaveClass('text-good');
    expect(within(first).getByText('55 kg')).toHaveClass('text-hot');
    expect(within(second).getByText('10')).toHaveClass('text-bone0');
    expect(within(second).getByText('60 kg')).toHaveClass('text-bone0');
    expect(within(first).getByText('/ 10', { exact: false })).toBeVisible();
  });

  it('marca sustitución, PR, serie sin plan y serie no hecha', async () => {
    await expand(
      sessionDetailItem({
        exercises: [
          exerciseItem({
            original_exercise: { id: 'e-9', name: 'Press con mancuernas' },
            is_pr: true,
            planned: null,
            sets: [
              setItem({ id: 'a', set_number: 1 }),
              setItem({ id: 'b', set_number: 2, completed: false, actual_reps: 0, actual_kg: null }),
            ],
          }),
        ],
      }),
    );
    const table = await screen.findByRole('table');
    expect(screen.getByText('en lugar de Press con mancuernas')).toBeVisible();
    expect(screen.getAllByText('PR').length).toBeGreaterThan(0);
    expect(within(table).getByText('sin plan')).toBeVisible();
    expect(within(table).getByText('no hecha')).toBeVisible();
  });

  it('la tabla de series scrollea dentro de su caja', async () => {
    await expand(sessionDetailItem());
    const table = await screen.findByRole('table');
    expect(table.parentElement).toHaveClass('relative', 'overflow-x-auto');
  });

  it('una sesión sin series muestra "Sin series registradas"', async () => {
    await expand(sessionDetailItem({ exercises: [] }));
    expect(await screen.findByText('Sin series registradas')).toBeVisible();
  });

  it('si falla el detalle ofrece reintentar', async () => {
    const { user, fetchMock } = await expand(500);
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(detailCalls(fetchMock)).toHaveLength(2);
  });
});
