/**
 * Edad en años cumplidos a `now`, o `null` sin fecha válida (`YYYY-MM-DD`).
 * Usa fechas UTC: cerca de medianoche en Argentina puede adelantarse unas horas.
 */
export function ageFrom(birthDate, now) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate ?? '');
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const nowMonth = now.getUTCMonth() + 1;
  const birthdayPassed = nowMonth > month || (nowMonth === month && now.getUTCDate() >= day);
  return now.getUTCFullYear() - year - (birthdayPassed ? 0 : 1);
}
