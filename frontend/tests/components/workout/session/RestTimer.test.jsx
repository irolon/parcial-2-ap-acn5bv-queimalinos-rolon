import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RestTimer from '@/components/workout/session/RestTimer';
import { adjustRest, registerSet, setCursor, skipRest } from '@/utils/workout/workoutState';
import { at, freshWorkout, T0 } from '../../../helpers/workout/workout';

const MINUS = '−';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

// Press banca descansa 90 s: registrar en T0 deja el fin del descanso en T0 + 90 s.
const resting = () => registerSet(freshWorkout(), { kg: 60, reps: 10 }, T0);
const mount = (workout = resting(), handlers = {}) => render(
  <RestTimer workout={workout} onAdjust={handlers.onAdjust ?? vi.fn()} onSkip={handlers.onSkip ?? vi.fn()} />,
);
const tick = (seconds) => act(() => vi.advanceTimersByTime(seconds * 1000));
const clock = () => screen.getByRole('timer');

describe('RestTimer: la cuenta regresiva', () => {
  it('muestra el descanso que queda, en m:ss', () => {
    mount();
    expect(screen.getByText('DESCANSO')).toBeInTheDocument();
    expect(clock()).toHaveTextContent('1:30');
  });

  it('cuenta hacia atrás de a un segundo', () => {
    mount();
    tick(1);
    expect(clock()).toHaveTextContent('1:29');
    tick(60);
    expect(clock()).toHaveTextContent('0:29');
  });

  it('se calcula contra la hora de fin, no contra los ticks: recargar no la corre', () => {
    vi.setSystemTime(at(45));
    mount();
    expect(clock()).toHaveTextContent('0:45');
  });

  it('no muestra nada si no hay descanso', () => {
    const { container } = mount(skipRest(resting()));
    expect(container).toBeEmptyDOMElement();
  });

  it('la barra baja con lo que queda del descanso del ejercicio', () => {
    mount();
    tick(45);
    expect(screen.getByTestId('rest-progress')).toHaveStyle({ width: '50%' });
  });

  it('la barra es contra el descanso que arrancó, aunque se pase a un ejercicio con otro descanso', () => {
    mount(setCursor(resting(), 1));
    tick(45);
    expect(screen.getByTestId('rest-progress')).toHaveStyle({ width: '50%' });
  });

  it('al desmontar apaga el reloj', () => {
    const { unmount } = mount();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('RestTimer: al llegar a 0', () => {
  it('anuncia "¡A la próxima serie!" en una región que el lector de pantalla lee', () => {
    mount();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    tick(90);
    expect(clock()).toHaveTextContent('0:00');
    expect(screen.getByRole('status')).toHaveTextContent('¡A la próxima serie!');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('si el descanso ya terminó al abrir la página, lo dice enseguida', () => {
    vi.setSystemTime(at(600));
    mount();
    expect(clock()).toHaveTextContent('0:00');
    expect(screen.getByRole('status')).toHaveTextContent('¡A la próxima serie!');
  });

  it('el reloj no se anuncia segundo a segundo (solo el final)', () => {
    mount();
    expect(clock()).toHaveAttribute('aria-live', 'off');
  });
});

describe('RestTimer: botones', () => {
  it('+15″ y −15″ piden sumar y restar 15 segundos', async () => {
    const handlers = { onAdjust: vi.fn() };
    mount(resting(), handlers);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole('button', { name: '+15 segundos' }));
    await user.click(screen.getByRole('button', { name: `${MINUS}15 segundos` }));
    expect(handlers.onAdjust.mock.calls).toEqual([[15], [-15]]);
  });

  it('los botones muestran +15″ y −15″', () => {
    mount();
    expect(screen.getByRole('button', { name: '+15 segundos' })).toHaveTextContent('+15″');
    expect(screen.getByRole('button', { name: `${MINUS}15 segundos` })).toHaveTextContent(`${MINUS}15″`);
  });

  it('Saltar corta el descanso', async () => {
    const handlers = { onSkip: vi.fn() };
    mount(resting(), handlers);
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole('button', { name: 'Saltar descanso' }));
    expect(handlers.onSkip).toHaveBeenCalledTimes(1);
  });

  it('con el descanso cumplido siguen disponibles +15″ y Saltar', () => {
    mount();
    tick(90);
    expect(screen.getByRole('button', { name: '+15 segundos' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Saltar descanso' })).toBeEnabled();
  });
});

// La página: monta el descanso cuando hay uno (como ActiveSession) y registra y ajusta con el motor, como el hook.
function Page() {
  const [workout, setWorkout] = useState(freshWorkout());
  return (
    <>
      {workout.restEndsAt && (
        <RestTimer
          workout={workout}
          onAdjust={(seconds) => setWorkout(adjustRest(workout, seconds, new Date()))}
          onSkip={() => setWorkout(skipRest(workout))}
        />
      )}
      <button type="button" onClick={() => setWorkout(registerSet(workout, { kg: 60, reps: 10 }, new Date()))}>
        Registrar
      </button>
    </>
  );
}
const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

// El reloj interno solo se renueva cada segundo: una acción a mitad de ese segundo no puede mostrar un resto de más.
describe('RestTimer: justo después de una acción', () => {
  it('registrar otra serie a los 500 ms muestra 1:30, no 1:31', async () => {
    render(<Page />);
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(clock()).toHaveTextContent('1:30');
    tick(0.5);
    await user.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(clock()).toHaveTextContent('1:30');
    tick(0.5);
    expect(clock()).toHaveTextContent('1:30');
    tick(1);
    expect(clock()).toHaveTextContent('1:29');
  });

  it('+15″ con el descanso cumplido muestra 0:15 enseguida, y sigue contando', async () => {
    render(<Page />);
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Registrar' }));
    tick(90);
    expect(clock()).toHaveTextContent('0:00');
    tick(0.5);
    await user.click(screen.getByRole('button', { name: '+15 segundos' }));
    expect(clock()).toHaveTextContent('0:15');
    tick(1.5);
    expect(clock()).toHaveTextContent('0:14');
  });

  it('no se vuelve a montar: es el mismo reloj y el foco queda en el botón apretado', async () => {
    render(<Page />);
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Registrar' }));
    const before = clock();
    const plus = screen.getByRole('button', { name: '+15 segundos' });
    plus.focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(clock()).toBe(before);
    plus.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: '+15 segundos' })).toBe(plus);
    expect(plus).toHaveFocus();
  });
});
