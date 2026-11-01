import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { bodyOf, calls, jsonResponse } from '../../../helpers/shared/fetchMock';
import { heldResponse, stubUpload } from '../../../helpers/workout/activeWorkout';
import { HISTORY_URL, TODAY_URL, WORKOUT_URL } from '../../../helpers/workout/router';
import { finishedWorkout, isoAt } from '../../../helpers/workout/workout';
import { cleanUpBrowser, renderWorkoutPage, stored } from '../../../helpers/workout/workoutPage';

afterEach(cleanUpBrowser);

const SPEC_ERROR = 'No pudimos guardar tu entrenamiento. Tus series siguen guardadas en este navegador.';
const FIRST = { code: 'FIRST_SESSION', name: 'Primera sesión', category: 'milestone' };
const PR = { code: 'FIRST_PR', name: 'Primer récord', category: 'pr' };

// Sesión terminada con el feedback ya decidido (Saltar), lista para subir: 2 series de Press banca, 60 kg × 10.
const readyToUpload = (count = 2) => finishedWorkout(count, { feedback: { rpe: null, notes: null } });
const summary = () => screen.findByRole('heading', { name: '¡Entrenamiento guardado!' });
const retry = () => screen.findByRole('button', { name: 'Reintentar' });
const paths = (fetchMock) => calls(fetchMock).map(([path]) => path);

describe('WorkoutPage: la subida', () => {
  it('con la sesión lista sube sola (también al recargar) y muestra el resumen sin salir de la página', async () => {
    const fetchMock = stubUpload();
    const { pathname } = renderWorkoutPage({ workout: readyToUpload() });
    await summary();
    expect(screen.getByText('2 series · 1200 kg · 60 min')).toBeInTheDocument();
    expect(pathname()).toBe(WORKOUT_URL);
    expect(stored()).toBeNull();
    expect(paths(fetchMock)).toEqual(['/sessions', '/sessions/session-1/sets']);
  });

  it('en StrictMode (efectos dobles) la sube una sola vez', async () => {
    const fetchMock = stubUpload();
    renderWorkoutPage({ workout: readyToUpload(), strict: true });
    await summary();
    expect(paths(fetchMock).filter((path) => path === '/sessions')).toHaveLength(1);
  });

  it('al recargar a mitad de la subida muestra "Guardando tu entrenamiento…" y no vuelve a pedir el feedback', async () => {
    const held = heldResponse();
    stubUpload({ session: [held.respond] });
    renderWorkoutPage({ workout: readyToUpload() });
    expect(screen.getByRole('status')).toHaveTextContent('Guardando tu entrenamiento…');
    expect(screen.queryByRole('heading', { name: '¿Qué tan dura fue?' })).not.toBeInTheDocument();
    held.release();
    await summary();
  });
});

describe('WorkoutPage: si la subida falla', () => {
  it('dice que las series siguen guardadas y Reintentar termina sin repetir la sesión', async () => {
    const fetchMock = stubUpload({ sets: [503] });
    renderWorkoutPage({ workout: readyToUpload() });
    expect(await screen.findByRole('alert')).toHaveTextContent(SPEC_ERROR);
    expect(stored().upload.sessionCreated).toBe(true);

    await userEvent.setup().click(await retry());
    await summary();
    expect(paths(fetchMock).filter((path) => path === '/sessions')).toHaveLength(1);
    expect(stored()).toBeNull();
  });

  it('sin red el POST de la sesión se vuelve a mandar al reintentar', async () => {
    const fetchMock = stubUpload({ session: ['offline'] });
    renderWorkoutPage({ workout: readyToUpload() });
    expect(await screen.findByRole('alert')).toHaveTextContent(SPEC_ERROR);
    expect(stored().finishedAt).not.toBeNull();

    await userEvent.setup().click(await retry());
    await summary();
    expect(paths(fetchMock)).toEqual(['/sessions', '/sessions', '/sessions/session-1/sets']);
  });

  it('mientras reintenta vuelve a decir "Guardando tu entrenamiento…" y se pueden seguir los reintentos', async () => {
    const held = heldResponse();
    stubUpload({ session: ['offline', held.respond] });
    renderWorkoutPage({ workout: readyToUpload() });
    const user = userEvent.setup();
    await user.click(await retry());
    expect(screen.getByRole('status')).toHaveTextContent('Guardando tu entrenamiento…');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    held.release();
    await summary();
  });

  it('con un error que se puede reintentar no ofrece descartar (lo rechazado para siempre está en rejected.test.jsx)', async () => {
    stubUpload({ sets: [503] });
    renderWorkoutPage({ workout: readyToUpload() });
    await retry();
    expect(screen.queryByRole('button', { name: /descartar/i })).not.toBeInTheDocument();
  });
});

describe('WorkoutPage: el resumen', () => {
  const unlockingAndFailing = () => stubUpload({
    session: [(path, body) => jsonResponse(201, { data: { ...body, student_id: 's-1', unlocked_achievements: [FIRST] } })],
    sets: [(path, body) => jsonResponse(200, {
      data: {
        saved: [{ id: body.sets[0].id, created: true }],
        failed: [{ id: body.sets[1].id, index: 1, code: 'EXERCISE_NOT_FOUND', message: 'No existe' }],
        unlocked_achievements: [FIRST, PR],
      },
    })],
  });

  it('muestra los logros desbloqueados, sin repetir, y cuántas series no se pudieron guardar', async () => {
    unlockingAndFailing();
    renderWorkoutPage({ workout: readyToUpload() });
    await summary();
    const list = screen.getByRole('list', { name: 'Logros desbloqueados' });
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Primera sesión',
      'Primer récord',
    ]);
    expect(screen.getByRole('alert')).toHaveTextContent('1 serie no se pudo guardar');
    expect(screen.getByText('1 serie · 600 kg · 60 min')).toBeInTheDocument();
  });

  it('los logros que llegan en el POST de la sesión también se muestran', async () => {
    stubUpload({
      session: [(path, body) => jsonResponse(201, { data: { ...body, student_id: 's-1', unlocked_achievements: [FIRST] } })],
    });
    renderWorkoutPage({ workout: readyToUpload() });
    await summary();
    expect(screen.getByRole('list', { name: 'Logros desbloqueados' })).toHaveTextContent('Primera sesión');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sin logros ni series rechazadas, solo lo esencial', async () => {
    stubUpload();
    renderWorkoutPage({ workout: readyToUpload() });
    await summary();
    expect(screen.queryByText('Logros desbloqueados')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('el POST lleva la sesión con el id del cliente y su hora de fin, y el lote las series con su peso', async () => {
    const fetchMock = stubUpload();
    renderWorkoutPage({ workout: readyToUpload() });
    await summary();
    const [[, session], [, sets]] = calls(fetchMock);
    expect(bodyOf(session)).toEqual({
      id: 'session-1', routine_id: 'r-1', started_at: isoAt(0), finished_at: isoAt(3600),
    });
    expect(bodyOf(sets).sets.map((set) => set.actual_kg)).toEqual([60, 60]);
  });

  it('"Volver a Hoy" y "Ver historial" llevan a cada pantalla', async () => {
    stubUpload();
    const { pathname } = renderWorkoutPage({ workout: readyToUpload() });
    await summary();
    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: 'Ver historial' }));
    expect(pathname()).toBe(HISTORY_URL);
    expect(screen.getByText('Pantalla del historial')).toBeInTheDocument();
  });

  it('"Volver a Hoy" vuelve a Hoy', async () => {
    stubUpload();
    const { pathname } = renderWorkoutPage({ workout: readyToUpload() });
    await summary();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Volver a Hoy' }));
    expect(pathname()).toBe(TODAY_URL);
  });
});
