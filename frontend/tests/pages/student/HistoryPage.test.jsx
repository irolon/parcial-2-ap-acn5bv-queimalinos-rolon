import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryPage from '@/pages/student/HistoryPage';
import { calls, stubFetch } from '../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../helpers/student/patience';
import {
  renderWithQuery,
  sessionDetailItem,
  sessionItem,
  sessionsPage,
  stubSessions,
} from '../../helpers/sessions/sessions';
import { signInSelf } from '../../helpers/students/self';

allowSlowScreens();

beforeEach(signInSelf);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const NOTE = 'Me dolió la rodilla en la sentadilla';
const COMMENT = 'Bajá el peso y cuidá la técnica';

function show(options) {
  const fetchMock = stubSessions(options);
  renderWithQuery(<HistoryPage />);
  return fetchMock;
}

// Abre el detalle de la única sesión del historial.
async function openDetail(session) {
  const fetchMock = show({ sessions: sessionsPage([session]), details: { 's-1': sessionDetailItem() } });
  await userEvent.setup().click(await screen.findByRole('button', { name: 'Detalle' }));
  await screen.findByText('Press de banca');
  return fetchMock;
}

describe('HistoryPage: las sesiones del alumno', () => {
  it('pide el historial del propio alumno y lista sus sesiones', async () => {
    const fetchMock = show({ sessions: sessionsPage([sessionItem({ has_pr: true, rpe: 7 })]) });
    expect(await screen.findByText('Push · día 3')).toBeVisible();
    expect(screen.getByText('PR')).toBeVisible();
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/students/s-1/sessions?page=1&limit=20']);
  });

  it('mientras carga muestra el estado de carga', async () => {
    stubFetch(() => new Promise(() => {}));
    renderWithQuery(<HistoryPage />);
    expect(await screen.findByRole('status')).toBeVisible();
    expect(screen.queryByText('Todavía no entrenaste')).toBeNull();
  });

  it('sin sesiones le habla de vos: "Todavía no entrenaste"', async () => {
    show({});
    expect(await screen.findByText('Todavía no entrenaste')).toBeVisible();
    expect(screen.queryByText('Todavía no entrenó')).toBeNull();
  });

  it('si falla lo dice y Reintentar lo vuelve a pedir', async () => {
    let attempts = 0;
    const fetchMock = show({ sessions: () => (attempts++ === 0 ? 500 : sessionsPage([sessionItem()])) });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos cargar las sesiones.');
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Push · día 3')).toBeVisible();
    expect(calls(fetchMock).filter(([path]) => path.includes('/sessions?'))).toHaveLength(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('HistoryPage: el detalle de una sesión', () => {
  it('su nota es "Tu nota", no "Nota del alumno"', async () => {
    await openDetail(sessionItem({ notes: NOTE }));
    expect(screen.getByText('Tu nota').parentElement).toHaveTextContent(NOTE);
    expect(screen.queryByText('Nota del alumno')).toBeNull();
  });

  it('el comentario del entrenador se lee, sin campo para escribir ni botones de guardar', async () => {
    await openDetail(sessionItem({ notes: NOTE, trainer_comment: COMMENT }));
    expect(screen.getByText('Comentario de tu entrenador').parentElement).toHaveTextContent(COMMENT);
    expect(screen.getByText('Tu nota').parentElement).toHaveTextContent(NOTE);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByLabelText('Comentario del entrenador')).toBeNull();
    expect(screen.queryByRole('button', { name: /Guardar|Cancelar/ })).toBeNull();
  });

  it('sin comentario del entrenador no hay bloque de comentario ni formulario para dejarlo', async () => {
    await openDetail(sessionItem({ notes: NOTE, trainer_comment: null }));
    expect(screen.queryByText(/Comentario (de tu|del) entrenador/)).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByPlaceholderText(/comentario/i)).toBeNull();
  });

  it('sin nota ni comentario el detalle son solo las series', async () => {
    await openDetail(sessionItem({ notes: null, trainer_comment: null }));
    expect(screen.getByRole('table', { name: 'Series de Press de banca' })).toBeVisible();
    expect(screen.queryByText('Tu nota')).toBeNull();
    expect(screen.queryByText(/Comentario/)).toBeNull();
  });

  it('el comentario conserva sus saltos de línea', async () => {
    await openDetail(sessionItem({ trainer_comment: 'Bien ahí.\nSumá 2,5 kg.' }));
    const text = screen.getByText('Comentario de tu entrenador').nextElementSibling;
    expect(text).toHaveClass('whitespace-pre-line');
    expect(text.textContent).toBe('Bien ahí.\nSumá 2,5 kg.');
  });

  it('no manda comentarios ni nada que no sea pedir datos, y no lleva a pantallas del entrenador', async () => {
    const fetchMock = await openDetail(sessionItem({ notes: NOTE, trainer_comment: COMMENT }));
    expect(calls(fetchMock).every(([, init]) => init.method === 'GET')).toBe(true);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
