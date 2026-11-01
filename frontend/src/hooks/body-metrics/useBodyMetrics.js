import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMetric, deleteMetric, listMetrics } from '@/api/body-metrics/body-metrics.api';
import { bodyProgressKey } from '@/hooks/progress/useProgress';
import { STUDENTS_KEY } from '@/hooks/students/useStudents';

export const METRICS_KEY = ['body-metrics'];

export function useMetricsQuery(studentId) {
  return useQuery({
    queryKey: [...METRICS_KEY, studentId],
    queryFn: () => listMetrics(studentId),
    enabled: Boolean(studentId),
  });
}

/** Mutación que refresca el historial, la ficha (trae `latest_metrics`) y el progreso corporal ("Mi progreso"). */
function useMetricMutation(studentId, mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [...METRICS_KEY, studentId] }),
        queryClient.invalidateQueries({ queryKey: [...STUDENTS_KEY, studentId] }),
        queryClient.invalidateQueries({ queryKey: bodyProgressKey(studentId) }),
      ]),
  });
}

export const useCreateMetric = (studentId) => useMetricMutation(studentId, (body) => createMetric(studentId, body));
export const useDeleteMetric = (studentId) =>
  useMetricMutation(studentId, (metricId) => deleteMetric(studentId, metricId));
