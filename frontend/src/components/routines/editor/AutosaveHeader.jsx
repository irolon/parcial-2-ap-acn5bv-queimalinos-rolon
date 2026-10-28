import { useSecondsSince } from '@/hooks/routines/useSecondsSince';
import { usePageHeader } from '@/hooks/shared/usePageHeader';

/**
 * Fija el encabezado de la topbar del editor ("HACE N S" desde el último guardado). Está aparte para que el
 * contador de cada segundo renderice solo este componente (que no pinta nada) y no todo el editor.
 */
export default function AutosaveHeader({ name, savedAt }) {
  const seconds = useSecondsSince(savedAt);
  usePageHeader({
    title: name ? `Nueva rutina — ${name}` : 'Nueva rutina',
    subtitle: `RUTINAS › CREAR${seconds === null ? '' : ` · AUTO-GUARDADO · HACE ${seconds}S`}`,
  });
  return null;
}
