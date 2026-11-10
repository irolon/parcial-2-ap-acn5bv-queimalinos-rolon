import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../../src/${p}`, import.meta.url));

// Builder encadenable: from → insert → select → single.
const result = { current: { data: null, error: null } };
const q = {};
for (const m of ['insert', 'select']) q[m] = jest.fn(() => q);
q.single = jest.fn(async () => result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const { createStudent } = await import(src('repositories/students/students.repository/student-create.repository.js'));

const BASE = {
  trainerId: 'trainer-1',
  name: 'Pedro Gómez',
  email: 'pedro@mail.com',
  goal: 'hypertrophy',
  passwordHash: 'hash',
};

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: { id: 'student-1' }, error: null };
});

describe('student-create.repository — createStudent', () => {
  it('inserta en students con el teléfono y devuelve la ficha', async () => {
    const out = await createStudent({ ...BASE, phone: '5491122334455' });
    expect(supabase.from).toHaveBeenCalledWith('students');
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        trainer_id: 'trainer-1',
        email: 'pedro@mail.com',
        password_hash: 'hash',
        phone: '5491122334455',
      })
    );
    expect(q.select.mock.calls[0][0]).toContain('phone');
    expect(out).toEqual({ id: 'student-1' });
  });

  it('sin teléfono ni contexto → null en esas columnas', async () => {
    await createStudent(BASE);
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null, gym_equipment: null, injuries: null, level: null })
    );
  });

  it('email duplicado (23505) → STUDENT_EMAIL_EXISTS', async () => {
    result.current = { data: null, error: { code: '23505', message: 'dup' } };
    await expect(createStudent(BASE)).rejects.toMatchObject({ code: 'STUDENT_EMAIL_EXISTS' });
  });

  it('otro error → 500', async () => {
    result.current = { data: null, error: { code: 'XX', message: 'boom' } };
    await expect(createStudent(BASE)).rejects.toMatchObject({ statusCode: 500 });
  });
});
