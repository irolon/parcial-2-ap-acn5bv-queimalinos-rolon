import { attachAvatars } from '../../../../src/models/students/overview-avatars.js';

const item = (id) => ({ student_id: id, name: id });
const build = () => ({
  active_students: { count: 2, new_7d: 0 },
  attention: [item('s1')],
  recent: [item('s2')],
  daily: [{ date: '2026-11-05', count: 1 }],
  in_session: [item('s1'), item('s2')],
  lists: { today: [item('s1'), item('s2')], at_risk: [item('s1')], feedback_pending: [item('s2')], students: [item('s1'), item('s2')] },
});
const avatars = new Map([['s1', 'https://firmada/1']]);

describe('attachAvatars', () => {
  it('agrega avatar_url por student_id en in_session y las cuatro listas', () => {
    const r = attachAvatars(build(), avatars);
    const todos = [r.in_session, r.lists.today, r.lists.at_risk, r.lists.feedback_pending, r.lists.students].flat();
    expect(todos.length).toBe(8);
    for (const i of todos) expect(i.avatar_url).toBe(i.student_id === 's1' ? 'https://firmada/1' : null);
  });

  it('no toca attention, recent ni daily', () => {
    const original = build();
    const r = attachAvatars(original, avatars);
    expect(r.attention).toEqual(original.attention);
    expect(r.recent).toEqual(original.recent);
    expect(r.daily).toEqual(original.daily);
    expect(r.active_students).toEqual(original.active_students);
  });

  it('no muta la entrada', () => {
    const original = build();
    attachAvatars(original, avatars);
    expect(original).toEqual(build());
  });
});
