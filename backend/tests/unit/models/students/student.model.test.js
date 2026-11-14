import {
  STUDENT_DETAIL_COLUMNS,
  STUDENT_LIST_COLUMNS,
  STUDENT_SELF_EDITABLE,
} from '../../../../src/models/students/student.model.js';

const columns = (list) => list.split(',').map((c) => c.trim());

describe('student.model · columnas', () => {
  it('la ficha trae must_change_password y password_changed_at (GX1: login y refresh las leen)', () => {
    expect(columns(STUDENT_DETAIL_COLUMNS)).toEqual(
      expect.arrayContaining(['must_change_password', 'password_changed_at'])
    );
  });

  it('el listado no cambia', () => {
    expect(STUDENT_LIST_COLUMNS).toBe('id, name, email, goal, active, avatar_url, created_at');
  });

  it('ninguna expone password_hash', () => {
    expect(STUDENT_DETAIL_COLUMNS).not.toContain('password_hash');
    expect(STUDENT_LIST_COLUMNS).not.toContain('password_hash');
  });

  it('la ficha trae phone (GX2) y el listado no', () => {
    expect(columns(STUDENT_DETAIL_COLUMNS)).toContain('phone');
    expect(columns(STUDENT_LIST_COLUMNS)).not.toContain('phone');
  });

  it('el alumno edita sobre sí mismo solo name y phone (GX2)', () => {
    expect(STUDENT_SELF_EDITABLE).toEqual(['name', 'phone']);
  });
});
