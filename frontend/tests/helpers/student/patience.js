import { configure } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Para los tests que montan una pantalla del alumno entera (router + consultas): con la suite completa corriendo en
 * paralelo tardan más que el 1 s de los `findBy*` y los 5 s por test que trae vitest, y fallan por carga, no por un
 * error. Se llama a mano al principio del archivo de test, antes de los `describe`; ningún helper de render lo hace
 * por su cuenta.
 */
export function allowSlowScreens() {
  vi.setConfig({ testTimeout: 20_000 });
  configure({ asyncUtilTimeout: 5000 });
}
