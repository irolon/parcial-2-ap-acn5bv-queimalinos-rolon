import userEvent from '@testing-library/user-event';

/**
 * `userEvent` sin pausa entre acciones. Con el `delay: 0` de fábrica, cada paso (mover el puntero, apretar, soltar,
 * cada tecla) espera un `setTimeout(0)`, y en Windows eso son ~15,6 ms (la resolución del timer): un clic cuesta
 * ~100 ms, tipear un nombre medio segundo, y un test que arma una rutina entera pasa los 5 s cuando la suite corre en
 * paralelo. Sin la pausa no se pierde nada: Testing Library envuelve cada evento en `act`, así que React ya aplicó el
 * cambio cuando vuelve la acción.
 */
export const setupUser = (options = {}) => userEvent.setup({ delay: null, ...options });

const METHODS = ['click', 'dblClick', 'clear', 'keyboard', 'paste', 'selectOptions', 'tab', 'type'];

/** Como la API directa de `userEvent` (cada llamada arranca de cero), pero sin la pausa: ver `setupUser`. */
export const user = Object.fromEntries(METHODS.map((method) => [method, (...args) => setupUser()[method](...args)]));
