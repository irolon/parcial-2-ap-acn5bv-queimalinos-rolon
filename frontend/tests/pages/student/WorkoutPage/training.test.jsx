import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { at } from '../../../helpers/workout/workout';
import {
  MINUS, cleanUpBrowser, registerButton, renderWorkoutPage, reloadWorkoutPage, stored,
} from '../../../helpers/workout/workoutPage';

// 22:14 después de que empezó la sesión (T0 + 22 min 14 s).
const NOW = 22 * 60 + 14;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(at(NOW));
});
afterEach(cleanUpBrowser);

const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const tick = (seconds) => act(() => vi.advanceTimersByTime(seconds * 1000));
const clock = () => screen.getByRole('timer');
const seriesTable = () => screen.getByRole('table', { name: 'Series' });

describe('WorkoutPage: la pantalla de entrenamiento', () => {
  it('muestra el encabezado, los segmentos y el ejercicio a la vista con los valores del plan', () => {
    renderWorkoutPage();
    expect(screen.getByText('EJERCICIO 1 DE 2 · 22:14 TRANSCURRIDO')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Ejercicios de la sesión' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Press banca' })).toBeInTheDocument();
    expect(screen.getByText('SERIE 1 DE 4 · SUGERIDO 62,5 KG × 10')).toBeInTheDocument();
    expect(screen.getByLabelText('Peso (kg)')).toHaveValue('62,5');
    expect(screen.getByLabelText('Repeticiones')).toHaveValue('10');
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('el tiempo transcurrido corre solo', () => {
    renderWorkoutPage();
    tick(46);
    expect(screen.getByText('EJERCICIO 1 DE 2 · 23:00 TRANSCURRIDO')).toBeInTheDocument();
  });
});

describe('WorkoutPage: registrar una serie', () => {
  it('guarda la serie, la suma a la tabla y arranca el descanso del ejercicio', async () => {
    renderWorkoutPage();
    await setup().click(registerButton());

    expect(within(seriesTable()).getByText('62,5 kg')).toBeInTheDocument();
    expect(screen.getByText('Serie registrada · 62,5 kg × 10')).toBeInTheDocument();
    expect(screen.getByText('SERIE 2 DE 4 · SUGERIDO 62,5 KG × 10')).toBeInTheDocument();
    expect(clock()).toHaveTextContent('1:30');
    expect(stored().sets).toMatchObject([{ setNumber: 1, kg: 62.5, reps: 10 }]);
    expect(stored().restEndsAt).toBe(at(NOW + 90).toISOString());
  });

  it('registra lo que se cargó en los campos, con los botones de paso', async () => {
    renderWorkoutPage();
    const user = setup();
    await user.click(screen.getByRole('button', { name: '+2,5 kg' }));
    await user.click(screen.getByRole('button', { name: `${MINUS}1 rep` }));
    await user.click(registerButton());
    expect(stored().sets).toMatchObject([{ kg: 65, reps: 9 }]);
  });

  it('un ejercicio sin peso se registra con peso corporal', async () => {
    renderWorkoutPage();
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(registerButton());
    expect(stored().sets).toMatchObject([{ kg: null, reps: 12 }]);
    expect(within(seriesTable()).getByText('Peso corporal')).toBeInTheDocument();
  });
});

describe('WorkoutPage: el descanso', () => {
  it('cuenta hacia atrás y al llegar a 0 dice "¡A la próxima serie!"', async () => {
    renderWorkoutPage();
    await setup().click(registerButton());
    tick(30);
    expect(clock()).toHaveTextContent('1:00');
    expect(screen.queryByText('¡A la próxima serie!')).not.toBeInTheDocument();
    tick(60);
    expect(clock()).toHaveTextContent('0:00');
    expect(screen.getByText('¡A la próxima serie!')).toBeInTheDocument();
  });

  it('+15″ y −15″ mueven la hora de fin y el cambio queda guardado', async () => {
    renderWorkoutPage();
    const user = setup();
    await user.click(registerButton());
    await user.click(screen.getByRole('button', { name: '+15 segundos' }));
    expect(clock()).toHaveTextContent('1:45');
    expect(stored().restEndsAt).toBe(at(NOW + 105).toISOString());
    await user.click(screen.getByRole('button', { name: `${MINUS}15 segundos` }));
    await user.click(screen.getByRole('button', { name: `${MINUS}15 segundos` }));
    expect(clock()).toHaveTextContent('1:15');
  });

  it('−15″ con menos de 15 s lo deja en 0 y avisa que toca la próxima serie', async () => {
    renderWorkoutPage();
    const user = setup();
    await user.click(registerButton());
    tick(80);
    await user.click(screen.getByRole('button', { name: `${MINUS}15 segundos` }));
    expect(clock()).toHaveTextContent('0:00');
    expect(screen.getByText('¡A la próxima serie!')).toBeInTheDocument();
  });

  it('Saltar corta el descanso y lo borra de lo guardado', async () => {
    renderWorkoutPage();
    const user = setup();
    await user.click(registerButton());
    await user.click(screen.getByRole('button', { name: 'Saltar' }));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByText('DESCANSO')).not.toBeInTheDocument();
    expect(stored().restEndsAt).toBeNull();
  });

  it('registrar otra serie vuelve a arrancar el descanso completo', async () => {
    renderWorkoutPage();
    const user = setup();
    await user.click(registerButton());
    tick(60);
    await user.click(registerButton());
    expect(clock()).toHaveTextContent('1:30');
  });

  it('al recargar la página sigue donde estaba: las series y el descanso por hora de fin', async () => {
    const first = renderWorkoutPage();
    await setup().click(registerButton());
    vi.setSystemTime(at(NOW + 40));
    reloadWorkoutPage(first);
    expect(within(seriesTable()).getByText('62,5 kg')).toBeInTheDocument();
    expect(clock()).toHaveTextContent('0:50');
    expect(screen.getByText('SERIE 2 DE 4 · SUGERIDO 62,5 KG × 10')).toBeInTheDocument();
  });
});
