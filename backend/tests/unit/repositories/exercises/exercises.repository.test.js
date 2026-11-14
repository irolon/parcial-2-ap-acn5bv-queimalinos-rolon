import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { fake, reset, supabase, callsOf } from '../../../helpers/trainer-ai/supabase-fake.js';

// Rutas absolutas: el mock tiene que resolver al MISMO archivo que importa el repositorio.
const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/exercises/exercises.repository.js'));

const NOT_ARCHIVED = [['archived_at', null]];

beforeEach(() => {
  reset();
  fake.result = { data: [], error: null };
});

describe('exercises.repository — listados sin archivados', () => {
  it('findExercises: globales + propios, sin los archivados', async () => {
    await repo.findExercises({ trainerId: 't-1', includeGlobal: true });
    expect(callsOf('or')).toEqual([['is_global.eq.true,trainer_id.eq.t-1']]);
    expect(callsOf('is')).toEqual(NOT_ARCHIVED);
  });

  it('findExercises: solo propios, sin los archivados', async () => {
    await repo.findExercises({ trainerId: 't-1', includeGlobal: false });
    expect(callsOf('eq')).toEqual([['trainer_id', 't-1']]);
    expect(callsOf('is')).toEqual(NOT_ARCHIVED);
  });

  it('findLibrary (alumno): sin los archivados, con o sin entrenador', async () => {
    await repo.findLibrary('t-1');
    await repo.findLibrary(null);
    expect(callsOf('is')).toEqual([...NOT_ARCHIVED, ...NOT_ARCHIVED]);
  });

  it('findExerciseById trae archived_at y no filtra archivados (rutinas e historial lo siguen resolviendo)', async () => {
    fake.result = { data: { id: 'ex-1', archived_at: '2026-11-14T00:00:00Z' }, error: null };
    await expect(repo.findExerciseById('ex-1')).resolves.toMatchObject({ archived_at: '2026-11-14T00:00:00Z' });
    expect(callsOf('select')[0][0]).toContain('archived_at');
    expect(callsOf('is')).toEqual([]);
  });
});

describe('exercises.repository — deleteExercise', () => {
  it('devuelve true cuando se borra', async () => {
    fake.result = { error: null };
    await expect(repo.deleteExercise('ex-1')).resolves.toBe(true);
    expect(callsOf('delete')).toHaveLength(1);
    expect(callsOf('eq')).toEqual([['id', 'ex-1']]);
  });

  it('devuelve false si está referenciado por una rutina o una sesión (23503)', async () => {
    fake.result = { error: { code: '23503', message: 'fk' } };
    await expect(repo.deleteExercise('ex-1')).resolves.toBe(false);
  });

  it('cualquier otro error de la base es 500', async () => {
    fake.result = { error: { code: '42P01', message: 'boom' } };
    await expect(repo.deleteExercise('ex-1')).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe('exercises.repository — archiveExercise', () => {
  it('marca archived_at con la fecha actual solo si no estaba archivado', async () => {
    fake.result = { error: null };
    await expect(repo.archiveExercise('ex-1')).resolves.toBeUndefined();
    const [[fields]] = callsOf('update');
    expect(Number.isNaN(Date.parse(fields.archived_at))).toBe(false);
    expect(callsOf('eq')).toEqual([['id', 'ex-1']]);
    expect(callsOf('is')).toEqual(NOT_ARCHIVED);
  });

  it('un error de la base es 500', async () => {
    fake.result = { error: { message: 'boom' } };
    await expect(repo.archiveExercise('ex-1')).rejects.toMatchObject({ statusCode: 500 });
  });
});
