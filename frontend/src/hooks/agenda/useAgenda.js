import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAppointment,
  getAvailability,
  listAppointments,
  listFreeSlots,
  saveAvailability,
  updateAppointmentStatus,
} from '@/api/agenda/agenda.api';

export const APPOINTMENTS_KEY = ['appointments'];
export const AVAILABILITY_KEY = ['availability'];
export const appointmentsKey = (from, to) => [...APPOINTMENTS_KEY, from, to];
export const freeKey = (from, to) => [...AVAILABILITY_KEY, 'free', from, to];

const FREE_PREFIX = [...AVAILABILITY_KEY, 'free'];

/** Turnos propios de `from` a `to` (`YYYY-MM-DD`). */
export function useAppointments(from, to) {
  return useQuery({
    queryKey: appointmentsKey(from, to),
    queryFn: () => listAppointments(from, to),
    enabled: Boolean(from && to),
    placeholderData: keepPreviousData,
  });
}

/** Franjas semanales del entrenador. */
export function useAvailability() {
  return useQuery({ queryKey: AVAILABILITY_KEY, queryFn: getAvailability });
}

/** Horas libres (`[{ starts_at }]`) dentro de la disponibilidad, de `from` a `to`. */
export function useFreeSlots(from, to) {
  return useQuery({ queryKey: freeKey(from, to), queryFn: () => listFreeSlots(from, to), enabled: Boolean(from && to) });
}

/** PUT de la disponibilidad (`mutate(slots)`); refresca franjas y horarios libres (misma raíz de clave). */
export function useSaveAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveAvailability,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AVAILABILITY_KEY }),
  });
}

function useRefreshAppointments() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_KEY }),
      queryClient.invalidateQueries({ queryKey: FREE_PREFIX }),
    ]);
}

/** Agenda un turno a mano (`mutate({ student_id, scheduled_at, notes? })`); refresca turnos y horarios libres. */
export function useCreateAppointment() {
  const refresh = useRefreshAppointments();
  return useMutation({ mutationFn: createAppointment, onSuccess: refresh });
}

/** Confirma o cancela (`mutate({ id, status })`); refresca turnos y horarios libres. */
export function useUpdateAppointmentStatus() {
  const refresh = useRefreshAppointments();
  return useMutation({ mutationFn: ({ id, status }) => updateAppointmentStatus(id, status), onSuccess: refresh });
}
