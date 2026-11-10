import { cleanupRun } from './teardown.js';

// Borra los datos de la corrida al terminar cada archivo, aunque fallen sus tests.
afterAll(cleanupRun);
