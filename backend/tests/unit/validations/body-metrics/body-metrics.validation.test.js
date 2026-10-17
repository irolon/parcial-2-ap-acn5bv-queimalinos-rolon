import {
  validateCreateMetric,
  validateMetricParams,
} from '../../../../src/validations/body-metrics/body-metrics.validation.js';

const UUID = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';
const invalid = (body) =>
  expect(() => validateCreateMetric(body)).toThrow(
    expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 })
  );

describe('body-metrics.validation — validateCreateMetric', () => {
  it('acepta todas las medidas, el id y recorded_at; ignora campos desconocidos', () => {
    expect(
      validateCreateMetric({
        id: UUID.toUpperCase(),
        weight_kg: 80.5,
        height_cm: 180,
        body_fat_pct: 18,
        waist_cm: 85,
        hip_cm: 98,
        chest_cm: 102,
        recorded_at: '2026-10-01T09:30:00-03:00',
        recorded_by: 'trainer', // lo pone el backend, nunca el cliente
        bmi: 99, // derivado: nunca se acepta del cliente
      })
    ).toEqual({
      id: UUID,
      weight_kg: 80.5,
      height_cm: 180,
      body_fat_pct: 18,
      waist_cm: 85,
      hip_cm: 98,
      chest_cm: 102,
      recorded_at: '2026-10-01T12:30:00.000Z',
    });
  });

  it('con una sola medida alcanza', () => {
    expect(validateCreateMetric({ weight_kg: 70 })).toEqual({ weight_kg: 70 });
  });

  it('trata null como ausente', () => {
    expect(validateCreateMetric({ weight_kg: 70, height_cm: null })).toEqual({ weight_kg: 70 });
  });

  it('rechaza el body sin ninguna medida', () => invalid({ recorded_at: '2026-10-17T12:00:00Z' }));
  it('rechaza el body vacío', () => invalid({}));
  it('rechaza medidas negativas', () => invalid({ weight_kg: -1 }));
  it('rechaza medidas enviadas como string', () => invalid({ weight_kg: '80' }));
  it('rechaza NaN o Infinity', () => invalid({ weight_kg: Number.POSITIVE_INFINITY }));
  it('rechaza body_fat_pct mayor a 100', () => invalid({ body_fat_pct: 101 }));
  it('rechaza un id que no es UUID', () => invalid({ id: 'abc', weight_kg: 70 }));
  it('rechaza recorded_at sin zona horaria', () =>
    invalid({ weight_kg: 70, recorded_at: '2026-10-17T10:00' }));
  it('rechaza recorded_at que no es fecha', () => invalid({ weight_kg: 70, recorded_at: 'ayer' }));
  it('rechaza recorded_at más de 5 minutos en el futuro', () =>
    invalid({ weight_kg: 70, recorded_at: new Date(Date.now() + 10 * 60_000).toISOString() }));
  it('acepta cualquier cantidad de decimales en los segundos y normaliza a milisegundos', () => {
    expect(
      validateCreateMetric({ weight_kg: 70, recorded_at: '2026-10-01T12:00:00.123456789Z' })
        .recorded_at
    ).toBe('2026-10-01T12:00:00.123Z');
  });
  it.each(['2026-02-30T10:00:00Z', '2026-04-31T10:00:00-03:00', '2026-10-01T25:00:00Z'])(
    'rechaza recorded_at imposible (%s)',
    (recorded_at) => invalid({ weight_kg: 70, recorded_at })
  );
  it('rechaza minuto o segundo fuera de rango', () => {
    invalid({ weight_kg: 70, recorded_at: '2026-10-01T10:60:00Z' });
    invalid({ weight_kg: 70, recorded_at: '2026-10-01T10:00:60Z' });
  });
  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(
      validateCreateMetric({ weight_kg: 70, recorded_at: '2024-02-29T10:00:00Z' }).recorded_at
    ).toBe('2024-02-29T10:00:00.000Z');
  });
  it('acepta recorded_at sin segundos', () => {
    const at = (recorded_at) => validateCreateMetric({ weight_kg: 70, recorded_at }).recorded_at;
    expect(at('2026-10-01T10:00Z')).toBe('2026-10-01T10:00:00.000Z');
    expect(at('2026-10-01T10:00+05:30')).toBe('2026-10-01T04:30:00.000Z');
  });
  it('trata recorded_at null como ausente', () => {
    expect(validateCreateMetric({ weight_kg: 70, recorded_at: null })).toEqual({ weight_kg: 70 });
  });
  it('tolera hasta 5 minutos de reloj adelantado', () => {
    const at = new Date(Date.now() + 3 * 60_000).toISOString();
    expect(validateCreateMetric({ weight_kg: 70, recorded_at: at }).recorded_at).toBe(at);
  });
});

describe('body-metrics.validation — validateMetricParams', () => {
  it('acepta los dos UUID y los pasa a minúsculas', () => {
    expect(validateMetricParams({ id: UUID.toUpperCase(), metricId: UUID })).toEqual({
      id: UUID,
      metricId: UUID,
    });
  });
  it('rechaza metricId inválido', () => {
    expect(() => validateMetricParams({ id: UUID, metricId: 'x' })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' })
    );
  });
});
