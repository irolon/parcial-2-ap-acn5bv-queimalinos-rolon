import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTemplate, getTemplate, listTemplates } from '@/api/routine-templates/routine-templates.api';

export const TEMPLATES_KEY = ['routine-templates'];

export function useTemplatesQuery() {
  return useQuery({ queryKey: TEMPLATES_KEY, queryFn: listTemplates });
}

export function useTemplateQuery(id, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...TEMPLATES_KEY, id],
    queryFn: () => getTemplate(id),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}
