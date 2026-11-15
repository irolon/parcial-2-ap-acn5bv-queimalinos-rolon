import { jest } from '@jest/globals';

const mockInsertMetric = jest.fn();
jest.unstable_mockModule('../../../../src/repositories/body-metrics/body-metrics.repository.js', () => ({
  insertMetric: mockInsertMetric,
}));

const { assignInitialMetrics } = await import('../../../../src/services/students/initial-metrics.service.js');

const STUDENT = { id: 'st-1' };
const INVITATION = { id: 'inv-1', student_height_cm: 178, student_weight_kg: 74.5 };

describe('initial-metrics.service — assignInitialMetrics', () => {
  let warn;
  beforeEach(() => {
    jest.clearAllMocks();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockInsertMetric.mockResolvedValue({ id: 'm-1' });
  });
  afterEach(() => warn.mockRestore());

  it('con altura y peso crea la primera medida, cargada por el PT', async () => {
    const out = await assignInitialMetrics(INVITATION, STUDENT);
    expect(mockInsertMetric).toHaveBeenCalledWith({
      student_id: 'st-1',
      height_cm: 178,
      weight_kg: 74.5,
      recorded_by: 'trainer',
    });
    expect(out).toEqual({ id: 'm-1' });
  });

  it('con un solo dato manda solo ese', async () => {
    await assignInitialMetrics({ ...INVITATION, student_height_cm: null }, STUDENT);
    expect(mockInsertMetric).toHaveBeenCalledWith({ student_id: 'st-1', weight_kg: 74.5, recorded_by: 'trainer' });
  });

  it('sin altura ni peso no crea nada', async () => {
    const out = await assignInitialMetrics({ id: 'inv-1', student_height_cm: null }, STUDENT);
    expect(mockInsertMetric).not.toHaveBeenCalled();
    expect(out).toBeNull();
  });

  it('si la medida falla, lo loguea y devuelve null (nunca lanza)', async () => {
    mockInsertMetric.mockRejectedValue(new Error('boom'));
    await expect(assignInitialMetrics(INVITATION, STUDENT)).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(
      '[invitations] primera medida no creada',
      expect.objectContaining({ invitation_id: 'inv-1', student_id: 'st-1', reason: 'boom' })
    );
  });
});
