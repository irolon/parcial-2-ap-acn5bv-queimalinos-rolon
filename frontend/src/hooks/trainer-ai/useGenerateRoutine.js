import { useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { generateRoutine } from '@/api/trainer-ai/trainer-ai.api';

/**
 * Pedir una propuesta con cancelación. `generate(body)` resuelve `{ data }`, `{ error }` o `{ aborted: true }` si se
 * canceló (`cancel()` aborta el pedido en vuelo con su `AbortController`). Al desmontar también se aborta.
 */
export function useGenerateRoutine() {
  const controller = useRef(null);
  const { mutateAsync } = useMutation({ mutationFn: ({ body, signal }) => generateRoutine(body, { signal }) });

  const generate = useCallback(async (body) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    try {
      return { data: await mutateAsync({ body, signal: current.signal }) };
    } catch (error) {
      return current.signal.aborted ? { aborted: true } : { error };
    } finally {
      if (controller.current === current) controller.current = null;
    }
  }, [mutateAsync]);

  const cancel = useCallback(() => controller.current?.abort(), []);

  useEffect(() => () => controller.current?.abort(), []);

  return { generate, cancel };
}
