/** Suma `avatar_url` (URL firmada o null) a cada ítem de la lista según su student_id. */
const withAvatar = (avatarById) => (item) => ({ ...item, avatar_url: avatarById.get(item.student_id) ?? null });

/**
 * Suma `avatar_url` a los ítems de `in_session` y de `lists.today|at_risk|feedback_pending|students`.
 * `avatarById`: Map student_id → URL firmada (o null). No muta la entrada ni toca attention, recent ni daily.
 */
export function attachAvatars(overview, avatarById) {
  const add = withAvatar(avatarById);
  const { today, at_risk, feedback_pending, students } = overview.lists;
  return {
    ...overview,
    in_session: overview.in_session.map(add),
    lists: { today: today.map(add), at_risk: at_risk.map(add), feedback_pending: feedback_pending.map(add), students: students.map(add) },
  };
}
