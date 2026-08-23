import { dayName } from '../../../../src/models/routines/routine.model.js';

/**
 * Todo el suite corre con TZ=UTC (ver el script `test` en package.json) para
 * reproducir el VPS de producción. Sin eso, estos tests pasan en cualquier
 * máquina en horario argentino y el bug sobrevive hasta producción.
 *
 * Cambiar process.env.TZ en runtime NO sirve: Jest ya resolvió la zona al
 * crear el contexto del test. Tiene que venir del entorno del proceso.
 */
describe('routine.model · dayName', () => {
  it('el suite corre en UTC, como el VPS', () => {
    // Guard: si este test falla, los de abajo dan falsos positivos.
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
  });

  it('devuelve el día de Buenos Aires aunque el server corra en UTC', () => {
    // Lunes 01:30 UTC = domingo 22:30 en Buenos Aires (UTC-3).
    // El alumno que abre la app un domingo a la noche tiene que ver el domingo.
    const lunesTempranoUTC = new Date('2026-08-24T01:30:00Z');
    expect(dayName(lunesTempranoUTC)).toBe('sunday');
  });
});
