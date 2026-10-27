/** Edad en años cumplidos a `now` (día local), o `null` sin fecha válida (`YYYY-MM-DD`). */
export function ageFrom(birthDate, now) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate ?? '');
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const nowMonth = now.getMonth() + 1;
  const birthdayPassed = nowMonth > month || (nowMonth === month && now.getDate() >= day);
  return now.getFullYear() - year - (birthdayPassed ? 0 : 1);
}
