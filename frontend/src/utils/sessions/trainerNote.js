const hasComment = (session) => typeof session.trainer_comment === 'string' && session.trainer_comment.trim() !== '';

/**
 * La sesión más nueva (por `started_at`) con un `trainer_comment` no vacío, o `null`. Recibe las sesiones de la
 * primera página del historial: si el último comentario es más viejo que esas, no aparece.
 */
export function latestTrainerNote(sessions) {
  const commented = (sessions ?? []).filter(hasComment);
  if (commented.length === 0) return null;
  return commented.reduce((latest, session) =>
    new Date(session.started_at).getTime() > new Date(latest.started_at).getTime() ? session : latest,
  );
}
