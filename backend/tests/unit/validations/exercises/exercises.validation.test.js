import {
  validateCreateExercise,
  validateUpdateExercise,
} from '../../../../src/validations/exercises/exercises.validation.js';

const BASE = { name: 'Press banca', muscle_group: 'chest' };
const YOUTUBE = 'https://www.youtube.com/watch?v=uEtiwYaT3d0';

const invalid = (fn, body, field) => {
  let error;
  try {
    fn(body);
  } catch (e) {
    error = e;
  }
  expect(error).toEqual(expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 }));
  expect(error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field })]));
};
const create = (extra) => validateCreateExercise({ ...BASE, ...extra });

describe.each([
  ['create', (extra) => create(extra), (fn, extra, field) => invalid(validateCreateExercise, { ...BASE, ...extra }, field)],
  ['update', (extra) => validateUpdateExercise(extra), (fn, extra, field) => invalid(validateUpdateExercise, extra, field)],
])('exercises.validation %s — campos opcionales', (_name, run, bad) => {
  it('rechaza equipment fuera del enum', () => bad(null, { equipment: 'trx' }, 'equipment'));
  it('conserva un equipment válido', () => {
    expect(run({ equipment: 'dumbbell' }).equipment).toBe('dumbbell');
  });

  it.each([
    'ftp://x.com/v',
    'youtube.com/watch?v=1',
    'javascript:alert(1)',
    'https://',
    'https://a.com/' + 'x'.repeat(487),
  ])('rechaza video_url %s', (url) => bad(null, { video_url: url }, 'video_url'));

  it.each([YOUTUBE, 'http://example.com/v.mp4'])('acepta video_url %s', (url) => {
    expect(run({ video_url: url }).video_url).toBe(url);
  });

  it('rechaza description de más de 1000 caracteres', () =>
    bad(null, { description: 'x'.repeat(1001) }, 'description'));
  it('acepta description de 1000 caracteres', () => {
    expect(run({ description: 'x'.repeat(1000) }).description).toHaveLength(1000);
  });
});

describe('exercises.validation create — null', () => {
  it('equipment, description y video_url null quedan en null', () => {
    expect(create({ equipment: null, description: null, video_url: null })).toMatchObject({
      equipment: null,
      description: null,
      video_url: null,
    });
  });
});

describe('exercises.validation update — null y vacío', () => {
  it('equipment null se conserva para borrar el valor', () => {
    expect(validateUpdateExercise({ equipment: null })).toEqual({ equipment: null });
  });
  it('video_url en blanco pasa a null', () => {
    expect(validateUpdateExercise({ video_url: '   ' })).toEqual({ video_url: null });
  });
});
