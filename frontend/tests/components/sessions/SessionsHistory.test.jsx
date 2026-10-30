import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionsHistory from '@/components/sessions/SessionsHistory';
import { calls } from '../../helpers/shared/fetchMock';
import { renderWithQuery, sessionItem, sessionsPage, stubSessions } from '../../helpers/sessions/sessions';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const show = (options) => {
  const fetchMock = stubSessions(options);
  renderWithQuery(<SessionsHistory studentId="st-1" />);
  return fetchMock;
};

const rowOf = async (name) => (await screen.findByText(name)).closest('li');

describe('SessionsHistory: filas', () => {
  it('muestra fecha, duración, rutina, PR, nota y RPE', async () => {
    show({
      sessions: sessionsPage([sessionItem({ has_pr: true, rpe: 7, notes: 'Buen control.' })]),
    });
    const row = await rowOf('Push · día 3');
    expect(screen.getByText('Últimas sesiones')).toBeInTheDocument();
    expect(within(row).getByText('22 ABR')).toBeVisible();
    expect(within(row).getByText('54′')).toBeVisible();
    expect(within(row).getByText('PR')).toBeVisible();
    expect(within(row).getByText('Buen control.')).toBeVisible();
    expect(within(row).getByText('7')).toHaveClass('text-bone0');
    expect(within(row).queryByText('Modificada')).toBeNull();
  });

  it('RPE 8 o más va en hot; sin RPE, sin duración y sin rutina se ven los reemplazos', async () => {
    show({
      sessions: sessionsPage([
        sessionItem({ id: 'a', rpe: 8 }),
        sessionItem({ id: 'b', rpe: null, duration_min: null, routine: null }),
      ]),
    });
    const [first, second] = await screen.findAllByRole('listitem');
    expect(within(first).getByText('8')).toHaveClass('text-hot');
    expect(within(second).getByText('Sesión libre')).toBeVisible();
    expect(within(second).getAllByText('—')).toHaveLength(2);
  });

  it('una sesión modificada lleva la etiqueta y el borde hot', async () => {
    show({ sessions: sessionsPage([sessionItem({ has_modifications: true })]) });
    const row = await rowOf('Push · día 3');
    expect(within(row).getByText('Modificada')).toBeVisible();
    expect(row).toHaveClass('border-l-hot');
  });

  it('el comentario del entrenador va antes que la nota del alumno', async () => {
    show({ sessions: sessionsPage([sessionItem({ notes: 'Nota del alumno', trainer_comment: 'Bien ahí' })]) });
    const row = await rowOf('Push · día 3');
    expect(within(row).getByText('Bien ahí')).toBeVisible();
    expect(within(row).queryByText('Nota del alumno')).toBeNull();
  });
});

describe('SessionsHistory: estados y paginación', () => {
  it('sin sesiones muestra "Todavía no entrenó"', async () => {
    show({});
    expect(await screen.findByText('Todavía no entrenó')).toBeVisible();
  });

  it('con error ofrece reintentar y recarga', async () => {
    const user = userEvent.setup();
    const fetchMock = show({ sessions: 500 });
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(calls(fetchMock).filter(([path]) => path.includes('/sessions?'))).toHaveLength(2);
  });

  it('"Cargar más" suma la página siguiente y desaparece en la última', async () => {
    const user = userEvent.setup();
    const pages = {
      1: sessionsPage([sessionItem({ id: 'a', routine: { id: 'r', name: 'Pull' } })], { page: 1, totalPages: 2 }),
      2: sessionsPage([sessionItem({ id: 'b', routine: { id: 'r', name: 'Legs' } })], { page: 2, totalPages: 2 }),
    };
    const fetchMock = show({ sessions: (page) => pages[page] });
    await user.click(await screen.findByRole('button', { name: 'Cargar más' }));
    expect(await screen.findByText('Legs')).toBeVisible();
    expect(screen.getByText('Pull')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
    expect(calls(fetchMock).map(([path]) => path)).toEqual([
      '/students/st-1/sessions?page=1&limit=20',
      '/students/st-1/sessions?page=2&limit=20',
    ]);
  });

  it('si falla "Cargar más" avisa, conserva el botón y el aviso se va al reintentar con éxito', async () => {
    const user = userEvent.setup();
    let failSecond = true;
    const pages = {
      1: sessionsPage([sessionItem({ id: 'a' })], { page: 1, totalPages: 2 }),
      2: sessionsPage([sessionItem({ id: 'b', routine: { id: 'r', name: 'Legs' } })], { page: 2, totalPages: 2 }),
    };
    show({
      sessions: (page) => {
        return page === 2 && failSecond ? 500 : pages[page];
      },
    });
    await user.click(await screen.findByRole('button', { name: 'Cargar más' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar más sesiones.');
    expect(screen.getByRole('button', { name: 'Cargar más' })).toBeVisible();
    failSecond = false;
    await user.click(screen.getByRole('button', { name: 'Cargar más' }));
    expect(await screen.findByText('Legs')).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('sin más páginas no ofrece "Cargar más"', async () => {
    show({ sessions: sessionsPage([sessionItem()]) });
    await rowOf('Push · día 3');
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
  });
});
