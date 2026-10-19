import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router';
// Importarlo también conecta el cliente de la API con la sesión.
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { routes } from '@/routes/router';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  });
}

export default function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(() => createBrowserRouter(routes));

  useEffect(() => {
    // Solo la primera vez (StrictMode monta dos veces en desarrollo).
    const { status, restore } = useAuthStore.getState();
    if (status === 'idle') restore();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
