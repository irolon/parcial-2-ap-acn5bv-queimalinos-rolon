import { useQuery } from '@tanstack/react-query';
import { getMyRoutines, getTodayRoutine } from '@/api/routines/routines.api';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { ROUTINES_KEY } from './useRoutines';

// Sin el alumno al final: así `invalidateQueries({ queryKey })` alcanza lo del alumno logueado sin saber su id.
export const TODAY_ROUTINE_KEY = [...ROUTINES_KEY, 'today'];
export const MY_ROUTINES_KEY = [...ROUTINES_KEY, 'mine'];

// El pedido no lleva el alumno (lo da el token), pero la clave sí: otro alumno en la misma pestaña no ve la caché del anterior.
function useOwnQuery(key, queryFn) {
  const studentId = useAuthStore((state) => state.user?.id);
  return useQuery({ queryKey: [...key, studentId], queryFn, enabled: Boolean(studentId) });
}

/** La rutina del día del alumno: la rutina, o `null` si hoy no tiene (descanso o sin rutina asignada). */
export const useTodayRoutine = () => useOwnQuery(TODAY_ROUTINE_KEY, getTodayRoutine);

/** Las rutinas activas del alumno, con la misma forma que la del día. Vacía si no tiene ninguna asignada. */
export const useMyRoutines = () => useOwnQuery(MY_ROUTINES_KEY, getMyRoutines);
