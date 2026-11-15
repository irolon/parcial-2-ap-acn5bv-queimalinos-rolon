import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

// Builder encadenable: from → insert/select/eq → single/maybeSingle.
const result = { current: { data: null, error: null } };
const q = {};
for (const m of ['insert', 'select', 'eq']) q[m] = jest.fn(() => q);
q.single = jest.fn(async () => result.current);
q.maybeSingle = jest.fn(async () => result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/invitations/invitations.repository.js'));

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: { id: 'inv-1' }, error: null };
});

describe('invitations.repository — datos extra', () => {
  it('createInvitation inserta frecuencia, altura, peso y nacimiento en sus columnas', async () => {
    await repo.createInvitation({
      trainerId: 'trainer-1',
      token: 'tok',
      studentName: 'Pedro',
      studentEmail: 'pedro@mail.com',
      deliveryChannel: 'qr',
      studentWeeklyFrequency: 4,
      studentHeightCm: 178,
      studentWeightKg: 74.5,
      studentBirthDate: '2002-03-15',
      expiresAt: '2026-11-16T10:00:00Z',
    });
    expect(supabase.from).toHaveBeenCalledWith('invitations');
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_weekly_frequency: 4,
        student_height_cm: 178,
        student_weight_kg: 74.5,
        student_birth_date: '2002-03-15',
      })
    );
  });

  it('findInvitationByToken lee los datos extra para el alta', async () => {
    await repo.findInvitationByToken('tok');
    const columns = q.select.mock.calls[0][0];
    for (const column of ['student_weekly_frequency', 'student_height_cm', 'student_weight_kg', 'student_birth_date']) {
      expect(columns).toContain(column);
    }
  });
});
