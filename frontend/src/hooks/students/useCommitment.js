import { useMemo } from 'react';
import { useStudentStreakQuery } from '@/hooks/achievements/useStudentGamification';
import { useProgressOverview } from '@/hooks/progress/useProgress';
import { useToday } from '@/hooks/shared/useToday';
import { useSessionsInfinite } from '@/hooks/sessions/useSessions';
import { useAttendanceQuery } from '@/hooks/students/useAttendance';
import { currentMonth, eightWeeksRange, rpeAverage, startedIn, volumeWindow } from '@/utils/students/commitment';

/**
 * Indicadores de compromiso del mes en curso: asistencia y racha (comunes, de ellas depende el bloque) y,
 * opcionales, el RPE promedio (primera página del historial, la misma caché que `SessionsHistory`) y el volumen
 * de 4 semanas (overview de 8). Si fallan esos dos, solo se marcan (`rpeFailed`, `volumeFailed`). El mes sale de
 * `useToday`: si la pantalla queda abierta de un mes al otro (hora argentina), pasa solo al mes nuevo.
 */
export function useCommitment(studentId, { withRpe = false, withVolume = false, now: nowParam } = {}) {
  const today = useToday();
  const now = nowParam ?? today;
  const month = currentMonth(now);
  const range = useMemo(() => eightWeeksRange(now), [now]);
  const attendance = useAttendanceQuery(studentId, month);
  const streak = useStudentStreakQuery(studentId);
  const sessions = useSessionsInfinite(withRpe ? studentId : undefined);
  const overview = useProgressOverview(withVolume ? studentId : undefined, range);

  const firstPage = sessions.data?.pages[0];
  const rpe = useMemo(() => {
    if (!firstPage) return undefined;
    const result = rpeAverage(firstPage.data, month);
    // Si toda la página es del mes y hay más, el promedio es solo de estas (las últimas 20).
    const partial = Boolean(sessions.hasNextPage) && firstPage.data.every((s) => startedIn(s, month));
    return result && { ...result, partial };
  }, [firstPage, month, sessions.hasNextPage]);
  const weeks = overview.data?.weekly_volume;
  const volume = useMemo(() => (weeks ? volumeWindow(weeks) : undefined), [weeks]);

  const failed = [attendance, streak].filter((q) => q.isError);
  return {
    month,
    isPending: attendance.isPending || streak.isPending,
    isError: failed.length > 0,
    retry: () => Promise.all(failed.map((q) => q.refetch())),
    attendance: attendance.data,
    streak: streak.data,
    rpe,
    rpeFailed: sessions.isError,
    volume,
    volumeFailed: overview.isError,
  };
}
