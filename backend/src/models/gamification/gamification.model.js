/**
 * Modelo de dominio: Gamificación (logros, rachas y desafíos).
 * Tablas, columnas y enums. SIN lógica de negocio ni acceso a datos.
 */

export const ACHIEVEMENTS_TABLE = 'achievements';
export const STUDENT_ACHIEVEMENTS_TABLE = 'student_achievements';
export const CHALLENGES_TABLE = 'challenges';
export const STUDENT_CHALLENGES_TABLE = 'student_challenges';
export const STUDENT_STREAKS_TABLE = 'student_streaks';

export const ACHIEVEMENT_CATEGORIES = ['streak', 'volume', 'consistency', 'pr', 'milestone'];

/** Tipos de meta de un desafío. */
export const GOAL_TYPE = {
  SESSIONS_COUNT: 'sessions_count',
  WEIGHT_TARGET: 'weight_target',
  STREAK: 'streak',
  VOLUME: 'volume',
};
export const GOAL_TYPES = Object.values(GOAL_TYPE);

/** Estados de la asignación de un desafío a un alumno. */
export const CHALLENGE_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ABANDONED: 'abandoned',
};

/** Días de gracia tras `ends_at` antes de marcar `failed`: deja sincronizar sesiones offline tardías. */
export const CHALLENGE_GRACE_DAYS = 2;

export const ACHIEVEMENT_COLUMNS = 'id, code, name, description, icon_url, category, criteria';
export const STUDENT_ACHIEVEMENT_COLUMNS = 'id, student_id, achievement_id, unlocked_at, context';
export const CHALLENGE_COLUMNS =
  'id, trainer_id, name, description, goal_type, goal_value, duration_days, reward_achievement_id';
export const STUDENT_CHALLENGE_COLUMNS =
  'id, student_id, challenge_id, started_at, ends_at, current_progress, status, completed_at';
export const STUDENT_STREAK_COLUMNS =
  'student_id, current_days, longest_days, last_trained_date, updated_at';
