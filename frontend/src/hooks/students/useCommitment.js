import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { STUDENT_STREAK_KEY, useStudentStreakQuery } from '@/hooks/achievements/useStudentGamification';
import { useProgressOverview } from '@/hooks/progress/useProgress';
import { useToday } from '@/hooks/shared/useToday';
import { useSessionsInfinite } from '@/hooks/sessions/useSessions';
import { useAttendanceQuery } from '@/hooks/students/useAttendance';
import { STUDENTS_KEY } from '@/hooks/students/useStudents';
import { currentMonth, eightWeeksRange, rpeAverage, startedIn, volumeWindow } from '@/utils/students/commitment';

/**
 * Indicadores de compromiso del mes en curso: asistencia y racha (comunes, de ellas depende el bloque) y,
 * opcionales, el RPE promedio (primera página del historial, la misma caché que `SessionsHistory`) y el volumen
 * de las 4 últimas semanas completas (overview de 8). Si fallan esos dos, solo se marcan (`rpeFailed`,
 * `volumeFailed`). El día sale de `useToday`: si la pantalla queda abierta de un día al otro (hora argentina), pasa
 * solo al mes nuevo y vuelve a pedir la asistencia y la racha (dentro del mes las claves no cambian).
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
  useRefreshOnNewDay(studentId, month, today);

  const firstPage = sessions.data?.pages[0];
  const rpe = useMemo(() => {
    if (!firstPage) return undefined;
    const result = rpeAverage(firstPage.data, month);
    // Si toda la página es del mes y hay más, el promedio es solo de estas (las últimas 20). Sale de la primera
    // página y no de `hasNextPage`, que mira la última cargada (con "Cargar más" del historial se apagaría).
    const morePages = firstPage.meta.page < firstPage.meta.total_pages;
    const partial = morePages && firstPage.data.every((s) => startedIn(s, month));
    return result && { ...result, partial };
  }, [firstPage, month]);
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
    // Un "Cargar más" fallido también prende `isError`; con la primera página el promedio sigue valiendo.
    rpeFailed: sessions.isError && !firstPage,
    volume,
    volumeFailed: overview.isError,
  };
}

/**
 * Al cambiar el día (no en el primer render) marca viejas la asistencia del mes y la racha: los días planificados
 * hasta hoy y una racha cortada cambian aunque la clave no, y el cliente no refresca al volver a la pestaña.
 * `cancelRefetch: false` evita pedirla dos veces si al cambiar de mes la clave nueva ya se está pidiendo.
 */
function useRefreshOnNewDay(studentId, month, today) {
  const queryClient = useQueryClient();
  const lastDay = useRef(today);
  useEffect(() => {
    if (lastDay.current === today) return;
    lastDay.current = today;
    const options = { cancelRefetch: false };
    queryClient.invalidateQueries({ queryKey: [...STUDENTS_KEY, studentId, 'attendance', month] }, options);
    queryClient.invalidateQueries({ queryKey: [...STUDENT_STREAK_KEY, studentId] }, options);
  }, [queryClient, studentId, month, today]);
}
