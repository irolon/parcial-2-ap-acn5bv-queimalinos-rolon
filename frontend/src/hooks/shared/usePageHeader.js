import { useEffect } from 'react';
import { create } from 'zustand';

/** Título y subtítulo que una página le fija a la topbar (null = usar el `handle` de la ruta). */
export const usePageHeaderStore = create(() => ({ header: null }));

/**
 * La página llama `usePageHeader({ title, subtitle })`; mientras está montada, la topbar
 * muestra ese encabezado y al desmontarse vuelve al del `handle`. Con `null` no hace nada.
 */
export function usePageHeader(header) {
  const title = header?.title;
  const subtitle = header?.subtitle;
  useEffect(() => {
    if (title === undefined) return undefined;
    usePageHeaderStore.setState({ header: { title, subtitle } });
    return () => usePageHeaderStore.setState({ header: null });
  }, [title, subtitle]);
}
