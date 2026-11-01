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

// aaaa-mm-dd en Argentina: la rutina del día es otra cuando cambia la fecha.
function argentinaDay() {
  const { year, month, day } = argentinaDate(new Date());
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * La rutina del día del alumno: la rutina, o `null` si hoy no tiene (descanso o sin rutina asignada).
 * Una pestaña que queda abierta de un día para otro no se queda con la de ayer: la fecha va en la clave (otro día,
 * otro pedido; la pantalla de Hoy se vuelve a renderizar sola al cambiar el día, ver `useToday`) y al volver a la
 * pestaña se pide de nuevo, aunque la app apague ese refresco en las demás consultas.
 */
export const useTodayRoutine = () =>
  useOwnQuery(TODAY_ROUTINE_KEY, getTodayRoutine, { extraKey: [argentinaDay()], refetchOnWindowFocus: true });

/** Las rutinas activas del alumno, con la misma forma que la del día. Vacía si no tiene ninguna asignada. */
export const useMyRoutines = () => useOwnQuery(MY_ROUTINES_KEY, getMyRoutines);
