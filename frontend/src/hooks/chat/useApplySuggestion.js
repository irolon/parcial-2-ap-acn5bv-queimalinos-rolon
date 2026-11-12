import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useToday } from '@/hooks/shared/useToday';
import { useActiveWorkout } from '@/hooks/workout/useActiveWorkout';
import { chatDayOf } from '@/utils/chat/chatDay';
import { canApply } from '@/utils/chat/chatHistory';

/**
 * "Aplicar" de las sugerencias de la respuesta `message` sobre la sesión en curso en esta web (GX5, decisión 7b).
 * Devuelve una función `(suggestion) => { status, planned, apply }`: `status` es el de `canApply` ('none', 'can',
 * 'locked' o 'applied') y `apply()` reemplaza el ejercicio a la vista por la sugerencia (solo en la sesión de hoy).
 */
export function useApplySuggestion(message) {
  const studentId = useAuthStore((state) => state.user?.id);
  const { workout, replace } = useActiveWorkout(studentId);
  const today = chatDayOf(useToday());
  return (suggestion) => {
    const check = canApply({ message, suggestion, workout, today });
    const apply = () => replace(check.index, { id: suggestion.exercise_id, name: suggestion.name });
    return { ...check, apply };
  };
}
