import { QueryClient } from '@tanstack/react-query';

/**
 * El QueryClient de la app: un reintento y sin refrescar al volver a la pestaña. Las consultas que tienen que estar al
 * día al volver (la lista de Alumnos, por "Entrenando ahora") lo activan en su propio `useQuery`.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  });
}
