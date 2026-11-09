import { cleanup, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { resetAuthStore } from '../auth/authStore';

/**
 * Monta la pantalla una vez y la desarma, para usar en `beforeAll`. En un worker recién creado el primer render tarda
 * varias veces más que los siguientes (el JIT todavía no compiló React, el router ni React Query): ese costo lo pagaba
 * el primer test del archivo y, con `--sequence.shuffle` o la suite entera en paralelo, cualquiera podía pasarse del
 * segundo de los `findBy*` o de los 5 s del test. Acá se paga fuera de los tests, que arrancan todos en caliente.
 * `mount()` pone los stubs y monta sin esperar; `ready()` es la condición de "terminó de cargar" (un `getBy*`).
 * El plazo es el del calentamiento, no el de ningún test. Al final deja el DOM, fetch, la sesión y el storage en cero.
 */
export async function warmUp(mount, ready) {
  mount();
  await waitFor(ready, { timeout: 8000 });
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetAuthStore();
  sessionStorage.clear();
}
