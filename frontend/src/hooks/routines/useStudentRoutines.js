import { useQuery } from '@tanstack/react-query';
import { getMyRoutines, getTodayRoutine } from '@/api/routines/routines.api';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { argentinaDate, pad } from '@/utils/dates';
import { ROUTINES_KEY } from './useRoutines';

// Sin el alumno al final: así `invalidateQueries({ queryKey })` alcanza lo del alumno logueado sin saber su id.
export const TODAY_ROUTINE_KEY = [...ROUTINES_KEY, 'today'];
export const MY_ROUTINES_KEY = [...ROUTINES_KEY, 'mine'];

// El pedido no lleva el alumno (lo da el token), pero la clave sí: otro alumno en la misma pestaña no ve la caché del anterior.
function useOwnQuery(key, queryFn, { extraKey = [], ...options } = {}) {
  const studentId = useAuthStore((state) => state.user?.id);
  return useQuery({ queryKey: [...key, studentId, ...extraKey], queryFn, enabled: Boolean(studentId), ...options });
}

// aaaa-mm-dd en Argentina de : la rutina del día es otra cuando cambia la fecha.
function argentinaDay(now) {
  const { year, month, day } = argentinaDate(now);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * La rutina del día del alumno: la rutina, o `null` si hoy no tiene (descanso o sin rutina asignada).
 * Una pestaña que queda abierta de un día para otro no se queda con la de ayer: la fecha va en la clave (otro día,
 * otro pedido) y al volver a la pestaña se pide de nuevo, aunque la app apague ese refresco en las demás consultas.
 * `now` es la fecha de la pantalla: Hoy le pasa la de `useToday` (que cambia sola al pasar la medianoche) y así la
 * fecha que se ve y la de la consulta son siempre la misma; sin `now`, la de este momento.
 */
export const useTodayRoutine = (now = new Date()) =>
  useOwnQuery(TODAY_ROUTINE_KEY, getTodayRoutine, { extraKey: [argentinaDay(now)], refetchOnWindowFocus: true });

/**
 * La rutina del día solo si ya está en caché (la pidió Hoy), sin pedirla: el detalle de una rutina la usa para
 * precargar `last_session_kg`, que /mine no trae. `data` queda undefined si nadie la pidió todavía.
 */
export const useCachedTodayRoutine = (now = new Date()) =>
  useOwnQuery(TODAY_ROUTINE_KEY, getTodayRoutine, { extraKey: [argentinaDay(now)], enabled: false });

/** Las rutinas activas del alumno, con la misma forma que la del día. Vacía si no tiene ninguna asignada. */
export const useMyRoutines = () => useOwnQuery(MY_ROUTINES_KEY, getMyRoutines);
