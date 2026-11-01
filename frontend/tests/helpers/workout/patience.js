import { configure } from '@testing-library/react';
import { vi } from 'vitest';

// Las pantallas de la sesión activa se montan con el router y varias interacciones seguidas: con la suite entera
// corriendo en paralelo tardan más que el 1 s de los `findBy*` y los 5 s por test que trae vitest, y fallan por carga,
// no por un error. Los helpers de render de acá lo importan, así que vale para cada archivo de test que los use.
vi.setConfig({ testTimeout: 20_000 });
configure({ asyncUtilTimeout: 5000 });
