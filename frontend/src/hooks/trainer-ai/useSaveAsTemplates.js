import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveAsTemplates } from '@/api/trainer-ai/trainer-ai.api';
import { TEMPLATES_KEY } from '@/hooks/routine-templates/useRoutineTemplates';

/** Guarda la propuesta como plantillas (una por bloque) y refresca el listado de plantillas. */
export function useSaveAsTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveAsTemplates,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}
