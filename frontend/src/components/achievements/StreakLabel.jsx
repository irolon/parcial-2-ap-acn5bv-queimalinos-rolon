import { plural } from '@/utils/shared/plural';

const days = (n) => plural(n, 'día', 'días');

/** Racha del alumno: "🔥 12 días", o "Sin racha" (con su mejor marca si la tuvo). */
export default function StreakLabel({ streak }) {
  const current = streak?.current_days ?? 0;
  const longest = streak?.longest_days ?? 0;
  if (current > 0) return <span className="text-hot">🔥 {days(current)}</span>;
  return <span>{longest > 0 ? `Sin racha · mejor: ${days(longest)}` : 'Sin racha'}</span>;
}
