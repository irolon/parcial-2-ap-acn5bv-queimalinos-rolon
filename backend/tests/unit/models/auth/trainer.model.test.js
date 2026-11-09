import { toTrainer, TRAINER_PUBLIC_COLUMNS } from '../../../../src/models/auth/trainer.model.js';

describe('trainer.model', () => {
  it('toTrainer descarta el password_hash', () => {
    const row = {
      id: 'uuid-1',
      name: 'Ignacio',
      email: 'ignacio@fittrainer.app',
      password_hash: '$2a$10$hashsupersecreto',
      created_at: '2026-06-20T10:00:00Z',
    };
    const trainer = toTrainer(row);
    expect(trainer.password_hash).toBeUndefined();
    expect(trainer.email).toBe('ignacio@fittrainer.app');
  });

  it('toTrainer devuelve null si la fila es null', () => {
    expect(toTrainer(null)).toBeNull();
  });

  it('las columnas públicas no exponen password_hash', () => {
    expect(TRAINER_PUBLIC_COLUMNS).not.toContain('password_hash');
  });

  it('las columnas públicas traen password_changed_at ("Modificada hace…")', () => {
    const columns = TRAINER_PUBLIC_COLUMNS.split(',').map((c) => c.trim());
    expect(columns).toContain('password_changed_at');
  });
});
