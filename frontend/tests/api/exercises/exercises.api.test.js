import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as exercisesApi from '@/api/exercises/exercises.api';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { exercise } from '../../helpers/exercises/fixtures';

beforeEach(() => {
  configureClient({ getToken: () => 'access-1', refreshSession: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('exercises.api', () => {
  it('listExercises hace GET /exercises y devuelve data', async () => {
    const data = [exercise()];
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(exercisesApi.listExercises()).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/exercises');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('createExercise hace POST /exercises con el body y devuelve data', async () => {
    const data = exercise({ name: 'Remo' });
    const fetchMock = stubFetch(async () => jsonResponse(201, { data }));
    const body = { name: 'Remo', muscle_group: 'back', equipment: null };
    await expect(exercisesApi.createExercise(body)).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/exercises');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual(body);
  });

  it('updateExercise hace PATCH /exercises/:id codificando el id', async () => {
    const data = exercise({ name: 'Nuevo' });
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(exercisesApi.updateExercise('a/b', { name: 'Nuevo' })).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/exercises/a%2Fb');
    expect(init.method).toBe('PATCH');
    expect(bodyOf(init)).toEqual({ name: 'Nuevo' });
  });

  it('deleteExercise hace DELETE /exercises/:id y resuelve vacío con 204', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(204));
    await expect(exercisesApi.deleteExercise('ex-1')).resolves.toBeUndefined();
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/exercises/ex-1');
    expect(init.method).toBe('DELETE');
  });
});
