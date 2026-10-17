import { EQUIPMENT } from '../../../../src/models/exercises/exercise.model.js';

describe('exercise.model · EQUIPMENT', () => {
  it('tiene exactamente los 7 códigos de la biblioteca global', () => {
    expect(EQUIPMENT).toEqual([
      'barbell',
      'dumbbell',
      'machine',
      'cable',
      'bodyweight',
      'kettlebell',
      'band',
    ]);
  });

  it('no repite valores', () => {
    expect(new Set(EQUIPMENT).size).toBe(EQUIPMENT.length);
  });
});
