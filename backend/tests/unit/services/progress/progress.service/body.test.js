import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockBodyMetrics, service, STUDENT,
} from '../../../../helpers/progress/progress-service.setup.js';
import { Errors } from '../../../../../src/shared/utils/errors.js';

beforeEach(() => jest.resetAllMocks());

describe('progress.service · bodyProgress', () => {
  it('delega en bodyMetricsService.list y arma points + summary', async () => {
    mockBodyMetrics.list.mockResolvedValueOnce([
      { weight_kg: 80, height_cm: 175, bmi: 26.1 },
      { weight_kg: 76.5, height_cm: null, bmi: 25 },
    ]);
    const result = await service.bodyProgress(STUDENT, STUDENT.id);
    expect(mockBodyMetrics.list).toHaveBeenCalledWith(STUDENT, STUDENT.id);
    expect(result.points).toHaveLength(2);
    expect(result.summary.weight_kg).toEqual({ first: 80, last: 76.5, delta: -3.5 });
    expect(result.summary.bmi).toEqual({ first: 26.1, last: 25, delta: -1.1 });
    expect(result.summary.waist_cm).toBeNull();
  });

  it('sin medidas: points vacío y summary en null', async () => {
    mockBodyMetrics.list.mockResolvedValueOnce([]);
    const result = await service.bodyProgress(STUDENT, STUDENT.id);
    expect(result.points).toEqual([]);
    expect(result.summary.weight_kg).toBeNull();
    expect(result.summary.bmi).toBeNull();
  });

  it('propaga el 403 de los permisos', async () => {
    mockBodyMetrics.list.mockRejectedValueOnce(Errors.forbidden());
    await expect(service.bodyProgress(STUDENT, 'otro')).rejects.toMatchObject({ statusCode: 403 });
  });
});
